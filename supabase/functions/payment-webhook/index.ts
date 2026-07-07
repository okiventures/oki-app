import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { timingSafeEqual } from 'https://deno.land/std@0.224.0/crypto/timing_safe_equal.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.108.2';

interface PaymentWebhookPayload {
  event: 'payment_intent.succeeded' | 'payment_intent.payment_failed';
  paymentIntentId: string;
  bookingId: string;
  amount: number;
  metadata?: Record<string, string>;
}

// Reject requests whose timestamp is more than this far from now (replay window).
const MAX_SKEW_SECONDS = 300;

// HMAC-SHA256 of `${timestamp}.${rawBody}`, hex-encoded. Signing the timestamp
// AND the body binds the signature to this exact payload and blocks replays —
// unlike a static shared-secret compare, a captured request can't be reused and
// the body can't be altered without invalidating the signature.
async function computeSignature(
  secret: string,
  timestamp: string,
  rawBody: string
): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const mac = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(`${timestamp}.${rawBody}`)
  );
  return Array.from(new Uint8Array(mac))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
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
  const timestamp = req.headers.get('x-webhook-timestamp');
  if (!signature || !timestamp) {
    return new Response(
      JSON.stringify({ error: 'FORBIDDEN', message: 'Missing signature or timestamp' }),
      { status: 403 }
    );
  }

  // reject stale/forward-dated requests to bound the replay window
  const ts = Number(timestamp);
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (!Number.isFinite(ts) || Math.abs(nowSeconds - ts) > MAX_SKEW_SECONDS) {
    return new Response(
      JSON.stringify({ error: 'FORBIDDEN', message: 'Stale or invalid timestamp' }),
      { status: 403 }
    );
  }

  // read the raw body once and verify the HMAC over it before parsing
  const rawBody = await req.text();
  const expected = await computeSignature(webhookSecret, timestamp, rawBody);
  const expectedBytes = new TextEncoder().encode(expected);
  const signatureBytes = new TextEncoder().encode(signature);
  if (
    expectedBytes.length !== signatureBytes.length ||
    !timingSafeEqual(signatureBytes, expectedBytes)
  ) {
    return new Response(JSON.stringify({ error: 'FORBIDDEN', message: 'Invalid signature' }), {
      status: 403,
    });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  let payload: PaymentWebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response(JSON.stringify({ error: 'BAD_REQUEST', message: 'Invalid JSON body' }), {
      status: 400,
    });
  }

  // validate the amount is a sane positive, finite number before any math
  if (
    typeof payload.amount !== 'number' ||
    !Number.isFinite(payload.amount) ||
    payload.amount <= 0
  ) {
    return new Response(
      JSON.stringify({ error: 'BAD_REQUEST', message: 'amount must be a positive number' }),
      { status: 400 }
    );
  }
  if (!payload.bookingId) {
    return new Response(JSON.stringify({ error: 'BAD_REQUEST', message: 'bookingId required' }), {
      status: 400,
    });
  }

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

      // idempotency: the gateway retries webhooks. once we've captured, the booking
      // is PAID — treat the replay as a no-op instead of erroring on a second capture.
      if (booking.status === 'PAID') {
        return new Response(JSON.stringify({ received: true, deduplicated: true }), {
          status: 200,
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

      // SECURITY: reconcile the webhook amount against the server-owned booking
      // price. The payout is derived from booking.amount, never the payload, so
      // a valid-but-tampered webhook cannot inflate what the handyman is paid.
      // (execute_payment_transaction re-checks this too — defence in depth.)
      if (Number(payload.amount) !== Number(booking.amount)) {
        return new Response(
          JSON.stringify({
            error: 'AMOUNT_MISMATCH',
            message: 'Webhook amount does not match booking amount',
            expected: booking.amount,
            received: payload.amount,
          }),
          { status: 422 }
        );
      }

      const platformFee = Number(booking.platform_fee);
      const netAmount = Number(booking.amount) - platformFee;

      const { error: transactionError } = await supabase.rpc('execute_payment_transaction', {
        booking_id: payload.bookingId,
        payment_intent_id: payload.paymentIntentId,
        amount: Number(booking.amount),
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
      // Fetch booking to get client_id and status
      const { data: booking, error: fetchError } = await supabase
        .from('bookings')
        .select('client_id, status')
        .eq('id', payload.bookingId)
        .single();

      if (fetchError || !booking) {
        return new Response(JSON.stringify({ error: 'NOT_FOUND', message: 'Booking not found' }), {
          status: 404,
        });
      }

      // a payment can only fail while we're trying to capture it, i.e. the booking is
      // COMPLETED. without this guard we'd write a FAILED record for any state.
      if (booking.status !== 'COMPLETED') {
        return new Response(
          JSON.stringify({
            error: 'INVALID_STATE_TRANSITION',
            message: 'Booking must be COMPLETED to record a failed payment',
            from_status: booking.status,
            reason_code: 'GUARD_NOT_SATISFIED',
          }),
          { status: 422 }
        );
      }

      // idempotency: payments.booking_id is UNIQUE, so a retry would otherwise blow up
      // on the constraint. if a row already exists, don't try to insert another.
      const { data: existingPayment } = await supabase
        .from('payments')
        .select('status')
        .eq('booking_id', payload.bookingId)
        .maybeSingle();

      if (existingPayment) {
        if (existingPayment.status === 'CAPTURED') {
          return new Response(
            JSON.stringify({
              error: 'INVALID_STATE_TRANSITION',
              message: 'Payment already captured; cannot record a failure',
              reason_code: 'GUARD_NOT_SATISFIED',
            }),
            { status: 422 }
          );
        }
        return new Response(JSON.stringify({ received: true, deduplicated: true }), {
          status: 200,
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
