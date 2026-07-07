import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import {
  requireClient,
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

  const { bookingId, reason }: CancelBookingRequest = await req.json();
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
  // Any status past PENDING (ACCEPTED, IN_TRANSIT, ARRIVED, WORK_STARTED,
  // COMPLETED) must go through the Week 21 dispute/cancellation-fee flow, and
  // terminal states (PAID, CANCELLED, REJECTED) cannot transition at all.
  if (booking.status !== 'PENDING') {
    const isTerminal =
      booking.status === 'PAID' || booking.status === 'CANCELLED' || booking.status === 'REJECTED';
    return new Response(
      JSON.stringify({
        error: 'INVALID_STATE_TRANSITION',
        message: isTerminal
          ? 'Booking is closed'
          : 'Booking cannot be cancelled after a handyman has accepted',
        from_status: booking.status,
        to_status: 'CANCELLED',
        action: 'CANCEL',
        reason_code: isTerminal ? 'BOOKING_TERMINAL' : 'TRANSITION_NOT_ALLOWED',
        details: { failed_guards: ['Booking must be PENDING'] },
      }),
      { status: 422, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Conditional update guards against a race where the booking is accepted
  // between our fetch and the write; if 0 rows match, we surface a 409.
  const { data: updatedBooking, error: updateError } = await supabase
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

  const { error: eventError } = await supabase.from('booking_events').insert({
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
