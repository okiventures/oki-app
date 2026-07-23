-- 002_rpcs.sql
-- Combined RPC functions: payment capture and booking state transitions

-- ============================================================================
-- Part 1: execute_payment_transaction (from 002_payment_capture_rpc.sql)
-- ============================================================================

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
-- SECURITY DEFINER with a pinned search_path; the default PUBLIC EXECUTE grant
-- is revoked at the bottom so only the service role (webhook) can call it.
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

-- Revoke the default PUBLIC grant and grant only the service role
REVOKE EXECUTE ON FUNCTION execute_payment_transaction(UUID, TEXT, NUMERIC, NUMERIC, NUMERIC, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION execute_payment_transaction(UUID, TEXT, NUMERIC, NUMERIC, NUMERIC, UUID) TO service_role;


-- ============================================================================
-- Part 2: transition_booking_state (from 003_booking_state_transition_rpc.sql)
-- ============================================================================

CREATE OR REPLACE FUNCTION transition_booking_state(
  p_booking_id UUID,
  p_action     TEXT,
  p_metadata   JSONB DEFAULT '{}'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_booking         bookings%ROWTYPE;
  v_actor_id        UUID;
  v_actor_type      user_type;
  v_from_status     booking_status;
  v_to_status       booking_status;
  v_error_msg       TEXT;
  v_handyman_record handymen%ROWTYPE;
BEGIN
  -- 1. Identify caller
  v_actor_id := auth.uid();
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated'
      USING HINT = 'auth.uid() returned null';
  END IF;

  -- 2. Fetch caller's user_type
  SELECT user_type INTO STRICT v_actor_type
  FROM users
  WHERE id = v_actor_id;

  -- 3. Fetch booking. FOR UPDATE locks the row for the transaction so two
  --    handymen can't both pass the PENDING check and double-accept.
  SELECT * INTO STRICT v_booking
  FROM bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  v_from_status := v_booking.status;

  -- 4. Terminal check — PAID, CANCELLED and REJECTED cannot transition further
  IF v_from_status IN ('PAID'::booking_status, 'CANCELLED'::booking_status, 'REJECTED'::booking_status) THEN
    RAISE EXCEPTION 'Booking is closed (status: %)', v_from_status
      USING DETAIL = 'BOOKING_TERMINAL';
  END IF;

  -- 5. Map action → target status and validate actor
  CASE p_action
    -- ── ACCEPT ─────────────────────────────────────────────────────────
    WHEN 'ACCEPT' THEN
      IF v_actor_type != 'handyman' THEN
        RAISE EXCEPTION 'Only handymen can accept bookings'
          USING DETAIL = 'WRONG_ACTOR';
      END IF;
      IF v_from_status != 'PENDING'::booking_status THEN
        RAISE EXCEPTION 'Can only accept PENDING bookings (current: %)', v_from_status
          USING DETAIL = 'TRANSITION_NOT_ALLOWED';
      END IF;

      -- Guard: handyman must be online
      SELECT * INTO STRICT v_handyman_record
      FROM handymen WHERE id = v_actor_id;
      IF NOT v_handyman_record.is_online THEN
        RAISE EXCEPTION 'Handyman must be online to accept'
          USING DETAIL = 'GUARD_NOT_SATISFIED';
      END IF;
      -- Guard: KYC must be approved
      IF v_handyman_record.kyc_status != 'APPROVED' THEN
        RAISE EXCEPTION 'Handyman KYC must be approved'
          USING DETAIL = 'GUARD_NOT_SATISFIED';
      END IF;
      -- Guard: booking not expired
      IF v_booking.request_expires_at IS NOT NULL
         AND v_booking.request_expires_at < now() THEN
        RAISE EXCEPTION 'Booking request has expired'
          USING DETAIL = 'GUARD_NOT_SATISFIED';
      END IF;

      v_to_status := 'ACCEPTED'::booking_status;

      UPDATE bookings
      SET status = v_to_status,
          handyman_id = v_actor_id,
          updated_at = now()
      WHERE id = p_booking_id;

    -- ── REJECT ─────────────────────────────────────────────────────────
    WHEN 'REJECT' THEN
      IF v_actor_type != 'handyman' THEN
        RAISE EXCEPTION 'Only handymen can reject bookings'
          USING DETAIL = 'WRONG_ACTOR';
      END IF;
      IF v_from_status != 'PENDING'::booking_status THEN
        RAISE EXCEPTION 'Can only reject PENDING bookings (current: %)', v_from_status
          USING DETAIL = 'TRANSITION_NOT_ALLOWED';
      END IF;

      -- REJECT moves the booking to the terminal REJECTED state. The bookings
      -- CHECK constraint requires a non-null handyman_id once past PENDING, so
      -- we record the rejecting handyman; the action=REJECT audit event (added
      -- by the shared insert below) disambiguates this from an assignment.
      v_to_status := 'REJECTED'::booking_status;

      UPDATE bookings
      SET status = v_to_status,
          handyman_id = v_actor_id,
          updated_at = now()
      WHERE id = p_booking_id;

    -- ── CANCEL ─────────────────────────────────────────────────────────
    WHEN 'CANCEL' THEN
      -- Only client can cancel, and only when PENDING
      IF v_actor_type != 'client' THEN
        RAISE EXCEPTION 'Only clients can cancel bookings'
          USING DETAIL = 'WRONG_ACTOR';
      END IF;
      IF v_actor_id != v_booking.client_id THEN
        RAISE EXCEPTION 'Only the booking owner can cancel'
          USING DETAIL = 'WRONG_ACTOR';
      END IF;
      IF v_from_status != 'PENDING'::booking_status THEN
        RAISE EXCEPTION 'Can only cancel PENDING bookings (current: %). After acceptance, use the dispute flow.',
          v_from_status
          USING DETAIL = 'TRANSITION_NOT_ALLOWED';
      END IF;

      v_to_status := 'CANCELLED'::booking_status;

      UPDATE bookings
      SET status = v_to_status,
          updated_at = now()
      WHERE id = p_booking_id;

    -- ── START_TRANSIT ───────────────────────────────────────────────────
    WHEN 'START_TRANSIT' THEN
      IF v_actor_type != 'handyman' THEN
        RAISE EXCEPTION 'Only handymen can start transit'
          USING DETAIL = 'WRONG_ACTOR';
      END IF;
      IF v_actor_id != v_booking.handyman_id THEN
        RAISE EXCEPTION 'Only the assigned handyman can start transit'
          USING DETAIL = 'WRONG_ACTOR';
      END IF;
      IF v_from_status != 'ACCEPTED'::booking_status THEN
        RAISE EXCEPTION 'Can only start transit for ACCEPTED bookings (current: %)', v_from_status
          USING DETAIL = 'TRANSITION_NOT_ALLOWED';
      END IF;

      v_to_status := 'IN_TRANSIT'::booking_status;

      UPDATE bookings
      SET status = v_to_status,
          updated_at = now()
      WHERE id = p_booking_id;

    -- ── MARK_ARRIVED ────────────────────────────────────────────────────
    WHEN 'MARK_ARRIVED' THEN
      IF v_actor_type != 'handyman' THEN
        RAISE EXCEPTION 'Only handymen can mark arrival'
          USING DETAIL = 'WRONG_ACTOR';
      END IF;
      IF v_actor_id != v_booking.handyman_id THEN
        RAISE EXCEPTION 'Only the assigned handyman can mark arrival'
          USING DETAIL = 'WRONG_ACTOR';
      END IF;
      IF v_from_status != 'IN_TRANSIT'::booking_status THEN
        RAISE EXCEPTION 'Can only mark arrival for IN_TRANSIT bookings (current: %)', v_from_status
          USING DETAIL = 'TRANSITION_NOT_ALLOWED';
      END IF;

      v_to_status := 'ARRIVED'::booking_status;

      UPDATE bookings
      SET status = v_to_status,
          updated_at = now()
      WHERE id = p_booking_id;

    -- ── START_WORK ──────────────────────────────────────────────────────
    WHEN 'START_WORK' THEN
      IF v_actor_type != 'handyman' THEN
        RAISE EXCEPTION 'Only handymen can start work'
          USING DETAIL = 'WRONG_ACTOR';
      END IF;
      IF v_actor_id != v_booking.handyman_id THEN
        RAISE EXCEPTION 'Only the assigned handyman can start work'
          USING DETAIL = 'WRONG_ACTOR';
      END IF;
      IF v_from_status != 'ARRIVED'::booking_status THEN
        RAISE EXCEPTION 'Can only start work for ARRIVED bookings (current: %)', v_from_status
          USING DETAIL = 'TRANSITION_NOT_ALLOWED';
      END IF;
      -- Guard: before_photo_url is required
      IF v_booking.before_photo_url IS NULL THEN
        RAISE EXCEPTION 'Before-photo must be uploaded before starting work'
          USING DETAIL = 'GUARD_NOT_SATISFIED';
      END IF;

      v_to_status := 'WORK_STARTED'::booking_status;

      UPDATE bookings
      SET status = v_to_status,
          updated_at = now()
      WHERE id = p_booking_id;

    -- ── COMPLETE ────────────────────────────────────────────────────────
    WHEN 'COMPLETE' THEN
      IF v_actor_type != 'handyman' THEN
        RAISE EXCEPTION 'Only handymen can complete bookings'
          USING DETAIL = 'WRONG_ACTOR';
      END IF;
      IF v_actor_id != v_booking.handyman_id THEN
        RAISE EXCEPTION 'Only the assigned handyman can complete'
          USING DETAIL = 'WRONG_ACTOR';
      END IF;
      IF v_from_status != 'WORK_STARTED'::booking_status THEN
        RAISE EXCEPTION 'Can only complete WORK_STARTED bookings (current: %)', v_from_status
          USING DETAIL = 'TRANSITION_NOT_ALLOWED';
      END IF;
      -- Guard: after_photo_url is required
      IF v_booking.after_photo_url IS NULL THEN
        RAISE EXCEPTION 'After-photo must be uploaded before completing'
          USING DETAIL = 'GUARD_NOT_SATISFIED';
      END IF;

      v_to_status := 'COMPLETED'::booking_status;

      UPDATE bookings
      SET status = v_to_status,
          updated_at = now()
      WHERE id = p_booking_id;

    ELSE
      RAISE EXCEPTION 'Unknown action: %', p_action
        USING DETAIL = 'TRANSITION_NOT_ALLOWED';
  END CASE;

  -- 6. Insert audit event
  INSERT INTO booking_events (booking_id, actor_id, from_status, to_status, metadata)
  VALUES (p_booking_id, v_actor_id, v_from_status, v_to_status,
          jsonb_build_object('action', p_action) || p_metadata);

  -- 7. Return updated booking as JSONB
  RETURN row_to_json(v_booking)::jsonb || jsonb_build_object(
    'status', v_to_status,
    'updated_at', now()
  );
END;
$$;
