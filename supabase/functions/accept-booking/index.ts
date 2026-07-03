import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

interface AcceptBookingRequest {
  bookingId: string;
}

serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'METHOD_NOT_ALLOWED' }), { status: 405 });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'UNAUTHORIZED' }), { status: 401 });
  }

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'UNAUTHORIZED' }), { status: 401 });
  }

  const { bookingId }: AcceptBookingRequest = await req.json();
  if (!bookingId) {
    return new Response(JSON.stringify({ error: 'BAD_REQUEST', message: 'bookingId required' }), {
      status: 400,
    });
  }

  const { data: booking, error: fetchError } = await supabase
    .from('bookings')
    .select('*, handymen!inner(*)')
    .eq('id', bookingId)
    .single();

  if (fetchError || !booking) {
    return new Response(JSON.stringify({ error: 'NOT_FOUND', message: 'Booking not found' }), {
      status: 404,
    });
  }

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

  await supabase.from('booking_events').insert({
    booking_id: bookingId,
    actor_id: user.id,
    from_status: 'PENDING',
    to_status: 'ACCEPTED',
    metadata: { action: 'ACCEPT' },
  });

  return new Response(JSON.stringify({ data: updatedBooking }), { status: 200 });
});
