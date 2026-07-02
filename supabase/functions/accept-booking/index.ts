import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { requireHandyman, methodNotAllowed, badRequest, notFound, ok } from '../_shared/rbac.ts';

interface AcceptBookingRequest {
  bookingId: string;
}

serve(async (req: Request) => {
  if (req.method !== 'POST') return methodNotAllowed();

  const auth = await requireHandyman(req);
  if ('error' in auth) return auth.error;
  const { user, supabase } = auth;

  const { bookingId }: AcceptBookingRequest = await req.json();
  if (!bookingId) return badRequest('bookingId required');

  const { data: booking, error: fetchError } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', bookingId)
    .single();

  if (fetchError || !booking) return notFound('Booking not found');

  const { data: handyman, error: handymanError } = await supabase
    .from('handymen')
    .select('*')
    .eq('id', user.id)
    .single();

  if (handymanError || !handyman) {
    return new Response(
      JSON.stringify({ error: 'FORBIDDEN', message: 'Only handymen can accept bookings' }),
      { status: 403 }
    );
  }

  const guards: string[] = [];
  if (booking.status !== 'PENDING') guards.push('Booking must be PENDING');
  if (!handyman.is_online) guards.push('Handyman must be online');
  if (handyman.kyc_status !== 'APPROVED') guards.push('KYC must be approved');
  if (booking.handyman_id && booking.handyman_id !== user.id)
    guards.push('Booking already assigned');

  if (guards.length > 0) {
    return new Response(
      JSON.stringify({
        error: 'INVALID_STATE_TRANSITION',
        message: guards.join('; '),
        from_status: booking.status,
        to_status: 'ACCEPTED',
        action: 'ACCEPT',
        reason_code: 'GUARD_NOT_SATISFIED',
        details: { failed_guards: guards },
      }),
      { status: 422 }
    );
  }

  const { data: updatedBooking, error: updateError } = await supabase
    .from('bookings')
    .update({ status: 'ACCEPTED', handyman_id: user.id, updated_at: new Date().toISOString() })
    .eq('id', bookingId)
    .eq('status', 'PENDING')
    .select()
    .single();

  if (updateError) {
    return new Response(JSON.stringify({ error: 'INTERNAL_ERROR', message: updateError.message }), {
      status: 500,
    });
  }

  if (!updatedBooking) {
    return new Response(
      JSON.stringify({
        error: 'INVALID_STATE_TRANSITION',
        message: 'Booking was accepted by another handyman',
        from_status: 'PENDING',
        to_status: 'ACCEPTED',
        action: 'ACCEPT',
        reason_code: 'GUARD_NOT_SATISFIED',
        details: { failed_guards: ['Booking no longer PENDING or already assigned'] },
      }),
      { status: 409 }
    );
  }

  const { error: eventError } = await supabase.from('booking_events').insert({
    booking_id: bookingId,
    actor_id: user.id,
    from_status: 'PENDING',
    to_status: 'ACCEPTED',
    metadata: { action: 'ACCEPT' },
  });

  if (eventError) {
    console.error(
      `CRITICAL: Failed to write audit event for booking ${bookingId}:`,
      eventError.message
    );
  }

  return ok(updatedBooking);
});
