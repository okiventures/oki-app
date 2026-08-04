import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import {
  requireClient,
  serviceClient,
  methodNotAllowed,
  badRequest,
  notFound,
  forbidden,
  ok,
} from '../_shared/rbac.ts';

interface CancelBookingRequest {
  bookingId: string;
  reason?: string;
}

serve(async (req: Request) => {
  if (req.method !== 'POST') return methodNotAllowed();

  const auth = await requireClient(req);
  if ('error' in auth) return auth.error;
  const { user, supabase } = auth;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest('Invalid JSON body');
  }

  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return badRequest('Request body must be a JSON object');
  }

  const { bookingId, reason } = body as CancelBookingRequest;
  if (!bookingId) return badRequest('bookingId required');

  const { data: booking, error: fetchError } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', bookingId)
    .single();

  if (fetchError || !booking) return notFound('Booking not found');

  if (booking.client_id !== user.id) {
    return forbidden('Only the booking owner can cancel');
  }

  // Per booking-state-machine.md, client cancel is only valid pre-acceptance.
  // Terminal states are PAID and CANCELLED only; all other non-PENDING statuses
  // reject with TRANSITION_NOT_ALLOWED.
  if (booking.status !== 'PENDING') {
    const isTerminal = booking.status === 'PAID' || booking.status === 'CANCELLED';
    return new Response(
      JSON.stringify({
        error: 'INVALID_STATE_TRANSITION',
        message: isTerminal ? 'Booking is closed' : 'Cannot cancel booking in current state',
        from_status: booking.status,
        to_status: 'CANCELLED',
        action: 'CANCEL',
        reason_code: isTerminal ? 'BOOKING_TERMINAL' : 'TRANSITION_NOT_ALLOWED',
        details: { failed_guards: ['Booking must be PENDING'] },
      }),
      { status: 422, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // The booking read above stays on the caller's client so RLS double-checks
  // ownership; the write does not, because booking_events grants the
  // authenticated role no INSERT (the audit log is server-authoritative).
  const db = serviceClient();

  // Conditional update guards against a race where the booking is accepted
  // between our fetch and the write; if 0 rows match, we surface a 409.
  const { data: updatedBooking, error: updateError } = await db
    .from('bookings')
    .update({ status: 'CANCELLED', updated_at: new Date().toISOString() })
    .eq('id', bookingId)
    .eq('status', 'PENDING')
    .select()
    .maybeSingle();

  if (updateError) {
    return new Response(JSON.stringify({ error: 'INTERNAL_ERROR', message: updateError.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!updatedBooking) {
    return new Response(
      JSON.stringify({
        error: 'INVALID_STATE_TRANSITION',
        message: 'Booking is no longer PENDING',
        from_status: 'PENDING',
        to_status: 'CANCELLED',
        action: 'CANCEL',
        reason_code: 'GUARD_NOT_SATISFIED',
        details: { failed_guards: ['Booking no longer PENDING'] },
      }),
      { status: 409, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const { error: eventError } = await db.from('booking_events').insert({
    booking_id: bookingId,
    actor_id: user.id,
    from_status: 'PENDING',
    to_status: 'CANCELLED',
    metadata: { action: 'CANCEL', ...(reason ? { reason } : {}) },
  });

  if (eventError) {
    console.error(
      `CRITICAL: Failed to write audit event for booking ${bookingId}:`,
      eventError.message
    );
  }

  return ok(updatedBooking);
});
