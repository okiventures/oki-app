import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

interface CompleteBookingRequest {
  bookingId: string;
  afterPhotoUrl?: string;
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

  const { bookingId, afterPhotoUrl }: CompleteBookingRequest = await req.json();
  if (!bookingId) {
    return new Response(JSON.stringify({ error: 'BAD_REQUEST', message: 'bookingId required' }), {
      status: 400,
    });
  }

  const { data: booking, error: fetchError } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', bookingId)
    .single();

  if (fetchError || !booking) {
    return new Response(JSON.stringify({ error: 'NOT_FOUND', message: 'Booking not found' }), {
      status: 404,
    });
  }

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
    .select()
    .single();

  if (updateError) {
    return new Response(JSON.stringify({ error: 'INTERNAL_ERROR', message: updateError.message }), {
      status: 500,
    });
  }

  await supabase.from('booking_events').insert({
    booking_id: bookingId,
    actor_id: user.id,
    from_status: 'WORK_STARTED',
    to_status: 'COMPLETED',
    metadata: { action: 'COMPLETE', after_photo_url: afterPhotoUrl },
  });

  return new Response(JSON.stringify({ data: updatedBooking }), { status: 200 });
});
