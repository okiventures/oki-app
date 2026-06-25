import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

interface PaymentWebhookPayload {
  event: 'payment_intent.succeeded' | 'payment_intent.payment_failed';
  paymentIntentId: string;
  bookingId: string;
  amount: number;
  metadata?: Record<string, string>;
}

serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'METHOD_NOT_ALLOWED' }), { status: 405 });
  }

  const webhookSecret = Deno.env.get('PAYMENT_WEBHOOK_SECRET');
  const signature = req.headers.get('x-webhook-signature');

  if (webhookSecret && signature !== webhookSecret) {
    return new Response(JSON.stringify({ error: 'FORBIDDEN', message: 'Invalid signature' }), { status: 403 });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const payload: PaymentWebhookPayload = await req.json();

  switch (payload.event) {
    case 'payment_intent.succeeded': {
      const { data: booking } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', payload.bookingId)
        .single();

      if (!booking) {
        return new Response(JSON.stringify({ error: 'NOT_FOUND', message: 'Booking not found' }), { status: 404 });
      }

      if (booking.status !== 'COMPLETED') {
        return new Response(JSON.stringify({
          error: 'INVALID_STATE_TRANSITION',
          message: 'Booking must be COMPLETED before payment capture',
          from_status: booking.status,
          to_status: 'PAID',
          reason_code: 'GUARD_NOT_SATISFIED',
        }), { status: 422 });
      }

      const platformFee = Math.round(payload.amount * 0.1 * 100) / 100;
      const netAmount = payload.amount - platformFee;

      const { error: updateError } = await supabase
        .from('bookings')
        .update({ status: 'PAID', updated_at: new Date().toISOString() })
        .eq('id', payload.bookingId);

      if (updateError) {
        return new Response(JSON.stringify({ error: 'INTERNAL_ERROR', message: updateError.message }), { status: 500 });
      }

      await supabase.from('payments').insert({
        booking_id: payload.bookingId,
        payment_intent_id: payload.paymentIntentId,
        amount: payload.amount,
        platform_fee: platformFee,
        net_amount: netAmount,
        status: 'CAPTURED',
        captured_at: new Date().toISOString(),
      });

      await supabase.from('wallet_transactions').insert({
        handyman_id: booking.handyman_id,
        booking_id: payload.bookingId,
        type: 'CREDIT',
        amount: netAmount,
        description: `Payment for booking ${payload.bookingId}`,
      });

      await supabase.from('booking_events').insert({
        booking_id: payload.bookingId,
        actor_id: null,
        from_status: 'COMPLETED',
        to_status: 'PAID',
        metadata: { action: 'CAPTURE_PAYMENT', payment_intent_id: payload.paymentIntentId, platform_fee: platformFee },
      });

      break;
    }

    case 'payment_intent.payment_failed': {
      await supabase.from('payments').insert({
        booking_id: payload.bookingId,
        payment_intent_id: payload.paymentIntentId,
        amount: payload.amount,
        status: 'FAILED',
      });

      break;
    }

    default:
      return new Response(JSON.stringify({ error: 'BAD_REQUEST', message: `Unknown event: ${payload.event}` }), { status: 400 });
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
});
