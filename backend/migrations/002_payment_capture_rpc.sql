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
RETURNS VOID
LANGUAGE plpgsql
-- SECURITY DEFINER with a pinned search_path; EXECUTE revoked from anon/
-- authenticated at the bottom so only the service role (webhook) can call it.
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_client_id UUID;
  v_booking_handyman_id UUID;
  v_status booking_status;
  v_booking_amount NUMERIC(12, 2);
  v_booking_platform_fee NUMERIC(12, 2);
  v_current_balance NUMERIC(12, 2);
  v_new_balance NUMERIC(12, 2);
BEGIN
  -- Lock the booking row so concurrent captures for the same booking serialize
  -- here instead of both racing through to insert/credit.
  SELECT client_id, handyman_id, status, amount, platform_fee
    INTO v_client_id, v_booking_handyman_id, v_status, v_booking_amount, v_booking_platform_fee
  FROM bookings
  WHERE id = booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'BOOKING_NOT_FOUND: %', booking_id;
  END IF;

  -- the handyman being credited must be the one assigned to the booking
  IF v_booking_handyman_id IS DISTINCT FROM handyman_id THEN
    RAISE EXCEPTION 'HANDYMAN_MISMATCH: booking % is not assigned to handyman %',
      booking_id, handyman_id;
  END IF;

  -- SECURITY: reconcile the caller-supplied money against the server-owned
  -- booking record. A forged/mismatched webhook cannot inflate the payout.
  IF amount IS DISTINCT FROM v_booking_amount THEN
    RAISE EXCEPTION 'AMOUNT_MISMATCH: capture amount % does not match booking amount %',
      amount, v_booking_amount;
  END IF;
  IF net_amount IS DISTINCT FROM (v_booking_amount - v_booking_platform_fee) THEN
    RAISE EXCEPTION 'NET_AMOUNT_MISMATCH: % does not match booking net %',
      net_amount, (v_booking_amount - v_booking_platform_fee);
  END IF;

  -- idempotency: a booking can only be captured once. a gateway retry lands here
  -- after the first capture already flipped status to PAID and wrote the payment.
  IF EXISTS (
    SELECT 1 FROM payments p
    WHERE p.booking_id = execute_payment_transaction.booking_id
      AND p.status = 'CAPTURED'
  ) THEN
    RAISE EXCEPTION 'PAYMENT_ALREADY_CAPTURED: %', booking_id;
  END IF;

  -- only a COMPLETED booking can move to PAID
  IF v_status <> 'COMPLETED' THEN
    RAISE EXCEPTION 'INVALID_BOOKING_STATE: booking % is %, expected COMPLETED',
      booking_id, v_status;
  END IF;

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
$$;

REVOKE EXECUTE ON FUNCTION execute_payment_transaction(UUID, TEXT, NUMERIC, NUMERIC, NUMERIC, UUID)
  FROM anon, authenticated;
