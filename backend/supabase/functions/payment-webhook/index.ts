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
  if (!webhookSecret) {
    return new Response(
      JSON.stringify({ error: 'INTERNAL_ERROR', message: 'Webhook secret not configured' }),
      { status: 500 }
    );
  }

  const signature = req.headers.get('x-webhook-signature');
  if (signature !== webhookSecret) {
    return new Response(JSON.stringify({ error: 'FORBIDDEN', message: 'Invalid signature' }), {
      status: 403,
    });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const payload: PaymentWebhookPayload = await req.json();

  switch (payload.event) {
    case 'payment_intent.succeeded': {
      const { data: booking, error: fetchError } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', payload.bookingId)
        .single();

      if (fetchError) {
        return new Response(
          JSON.stringify({ error: 'INTERNAL_ERROR', message: fetchError.message }),
          { status: 500 }
        );
      }

      if (!booking) {
        return new Response(JSON.stringify({ error: 'NOT_FOUND', message: 'Booking not found' }), {
          status: 404,
        });
      }

      if (booking.status !== 'COMPLETED') {
        return new Response(
          JSON.stringify({
            error: 'INVALID_STATE_TRANSITION',
            message: 'Booking must be COMPLETED before payment capture',
            from_status: booking.status,
            to_status: 'PAID',
            reason_code: 'GUARD_NOT_SATISFIED',
          }),
          { status: 422 }
        );
      }

      const platformFee = Math.round(payload.amount * 0.1 * 100) / 100;
      const netAmount = payload.amount - platformFee;

      const { error: transactionError } = await supabase.rpc('execute_payment_transaction', {
        booking_id: payload.bookingId,
        payment_intent_id: payload.paymentIntentId,
        amount: payload.amount,
        platform_fee: platformFee,
        net_amount: netAmount,
        handyman_id: booking.handyman_id,
      });

      if (transactionError) {
        return new Response(
          JSON.stringify({ error: 'INTERNAL_ERROR', message: transactionError.message }),
          { status: 500 }
        );
      }

      break;
    }

    case 'payment_intent.payment_failed': {
      // Fetch booking to get client_id
      const { data: booking, error: fetchError } = await supabase
        .from('bookings')
        .select('client_id')
        .eq('id', payload.bookingId)
        .single();

      if (fetchError || !booking) {
        return new Response(JSON.stringify({ error: 'NOT_FOUND', message: 'Booking not found' }), {
          status: 404,
        });
      }

      const { error: failedPaymentError } = await supabase.from('payments').insert({
        booking_id: payload.bookingId,
        client_id: booking.client_id,
        status: 'FAILED',
        amount_authorized: payload.amount,
        amount_captured: null,
        provider_payment_id: payload.paymentIntentId,
        updated_at: new Date().toISOString(),
      });

      if (failedPaymentError) {
        return new Response(
          JSON.stringify({ error: 'INTERNAL_ERROR', message: failedPaymentError.message }),
          { status: 500 }
        );
      }

      break;
    }

    default:
      return new Response(
        JSON.stringify({ error: 'BAD_REQUEST', message: `Unknown event: ${payload.event}` }),
        { status: 400 }
      );
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
});
