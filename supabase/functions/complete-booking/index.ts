import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import {
  requireHandyman,
  methodNotAllowed,
  badRequest,
  notFound,
  ok,
  internalError,
} from '../_shared/rbac.ts';

interface CompleteBookingRequest {
  bookingId: string;
  afterPhotoUrl?: string;
}

serve(async (req: Request) => {
  if (req.method !== 'POST') return methodNotAllowed();

  const auth = await requireHandyman(req);
  if ('error' in auth) return auth.error;
  const { user, supabase } = auth;

  const { bookingId, afterPhotoUrl }: CompleteBookingRequest = await req.json();
  if (!bookingId) return badRequest('bookingId required');

  // If a photo reference is supplied, validate it before persisting — the value
  // is later rendered in client/admin UIs. Allow a bare storage key or an
  // https URL within project storage; reject script schemes, off-domain URLs,
  // path traversal, and injection-prone characters.
  if (afterPhotoUrl !== undefined && afterPhotoUrl !== null) {
    const v = afterPhotoUrl;
    const unsafe =
      typeof v !== 'string' ||
      v.length === 0 ||
      v.length > 1024 ||
      /[\s<>"'`\\]/.test(v) ||
      /^(javascript|data|vbscript|file):/i.test(v) ||
      v.includes('..') ||
      (/^https?:/i.test(v) && !v.includes('/storage/v1/object/'));
    if (unsafe) return badRequest('afterPhotoUrl is not a valid storage reference');
  }

  const { data: booking, error: fetchError } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', bookingId)
    .single();

  if (fetchError || !booking) return notFound('Booking not found');

  if (booking.handyman_id !== user.id) {
    return new Response(
      JSON.stringify({ error: 'FORBIDDEN', message: 'Only assigned handyman can complete' }),
      { status: 403 }
    );
  }

  const guards: string[] = [];
  if (booking.status !== 'WORK_STARTED') guards.push('Must be in WORK_STARTED status');
  if (!booking.before_photo_url) guards.push('Before photo required before starting work');
  if (!afterPhotoUrl && !booking.after_photo_url) guards.push('After photo required to complete');

  if (guards.length > 0) {
    return new Response(
      JSON.stringify({
        error: 'INVALID_STATE_TRANSITION',
        message: guards.join('; '),
        from_status: booking.status,
        to_status: 'COMPLETED',
        action: 'COMPLETE',
        reason_code: 'GUARD_NOT_SATISFIED',
        details: { failed_guards: guards },
      }),
      { status: 422 }
    );
  }

  const { data: updatedBooking, error: updateError } = await supabase
    .from('bookings')
    .update({
      status: 'COMPLETED',
      after_photo_url: afterPhotoUrl ?? booking.after_photo_url,
      updated_at: new Date().toISOString(),
    })
    .eq('id', bookingId)
    .eq('status', 'WORK_STARTED')
    .select()
    .maybeSingle();

  if (updateError) return internalError(updateError.message);

  if (!updatedBooking) {
    return new Response(
      JSON.stringify({
        error: 'INVALID_STATE_TRANSITION',
        message: 'Booking was already completed or no longer in WORK_STARTED status',
        from_status: 'WORK_STARTED',
        to_status: 'COMPLETED',
        action: 'COMPLETE',
        reason_code: 'GUARD_NOT_SATISFIED',
        details: { failed_guards: ['Booking no longer in WORK_STARTED status'] },
      }),
      { status: 409 }
    );
  }

  const { error: eventError } = await supabase.from('booking_events').insert({
    booking_id: bookingId,
    actor_id: user.id,
    from_status: 'WORK_STARTED',
    to_status: 'COMPLETED',
    metadata: { action: 'COMPLETE', after_photo_url: afterPhotoUrl },
  });

  if (eventError) {
    console.error(
      `CRITICAL: Failed to write audit event for booking ${bookingId}:`,
      eventError.message
    );
  }

  return ok(updatedBooking);
});
