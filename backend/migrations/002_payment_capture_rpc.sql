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
DECLARE
  v_client_id UUID;
  v_current_balance NUMERIC(12, 2);
  v_new_balance NUMERIC(12, 2);
BEGIN
  -- Get client_id from bookings
  SELECT client_id INTO v_client_id FROM bookings WHERE id = booking_id;

  -- Lock handyman wallet balance for update to avoid race conditions
  SELECT wallet_balance INTO v_current_balance FROM handymen WHERE id = handyman_id FOR UPDATE;

  -- Calculate new balance
  v_new_balance := COALESCE(v_current_balance, 0) + net_amount;

  -- Update handyman balance
  UPDATE handymen
  SET wallet_balance = v_new_balance, updated_at = now()
  WHERE id = handyman_id;

  -- Update booking status to PAID
  UPDATE bookings
  SET status = 'PAID', updated_at = now()
  WHERE id = booking_id;

  -- Insert payment record matching the core schema
  INSERT INTO payments (
    booking_id, client_id, status, amount_authorized, amount_captured,
    provider_payment_id, captured_at, updated_at
  ) VALUES (
    booking_id, v_client_id, 'CAPTURED', amount, amount,
    payment_intent_id, now(), now()
  );

  -- Insert wallet transaction matching the core schema
  INSERT INTO wallet_transactions (
    handyman_id, booking_id, tx_type, amount, balance_after, description
  ) VALUES (
    handyman_id, booking_id, 'CREDIT', net_amount, v_new_balance,
    'Payment for booking ' || booking_id
  );

  -- Log booking event
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
