-- 002_payment_capture_rpc.sql
-- Atomic payment capture: booking→PAID + payments + wallet_transactions + booking_events

CREATE OR REPLACE FUNCTION execute_payment_transaction(
  booking_id        UUID,
  payment_intent_id TEXT,
  amount            NUMERIC,
  platform_fee      NUMERIC,
  net_amount        NUMERIC,
  handyman_id       UUID
)
RETURNS VOID AS $$
BEGIN
  UPDATE bookings
  SET status = 'PAID', updated_at = now()
  WHERE id = booking_id;

  INSERT INTO payments (
    booking_id, payment_intent_id, amount, platform_fee, net_amount,
    status, captured_at
  ) VALUES (
    booking_id, payment_intent_id, amount, platform_fee, net_amount,
    'CAPTURED', now()
  );

  INSERT INTO wallet_transactions (
    handyman_id, booking_id, type, amount, description
  ) VALUES (
    handyman_id, booking_id, 'CREDIT', net_amount,
    'Payment for booking ' || booking_id
  );

  INSERT INTO booking_events (
    booking_id, actor_id, from_status, to_status, metadata
  ) VALUES (
    booking_id, NULL, 'COMPLETED', 'PAID',
    jsonb_build_object(
      'action', 'CAPTURE_PAYMENT',
      'payment_intent_id', payment_intent_id,
      'platform_fee', platform_fee
    )
  );
END;
$$ LANGUAGE plpgsql;
