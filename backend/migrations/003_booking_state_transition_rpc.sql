-- ============================================================================
-- 003_booking_state_transition_rpc.sql
-- Oki Handyman Marketplace — State machine RPC for booking lifecycle
--
-- Creates the transition_booking_state function called by bookingService.ts
-- for actions that don't have a dedicated Edge Function (START_TRANSIT,
-- MARK_ARRIVED, START_WORK, CANCEL, REJECT).
--
-- ACCEPT and COMPLETE use dedicated Edge Functions (accept-booking,
-- complete-booking) which handle payment authorization/capture.
--
-- Run this in Supabase SQL Editor after 001_core_schema.sql and
-- 002_payment_capture_rpc.sql.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Maps action → (from_status, to_status) per booking-state-machine.md
-- ---------------------------------------------------------------------------
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

  -- 3. Fetch booking
  SELECT * INTO STRICT v_booking
  FROM bookings
  WHERE id = p_booking_id;

  v_from_status := v_booking.status;

  -- 4. Terminal check — PAID and CANCELLED cannot transition further
  IF v_from_status IN ('PAID'::booking_status, 'CANCELLED'::booking_status) THEN
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

      -- REJECT does not change booking status; just records the event.
      -- v_to_status stays NULL so the event row has from_status = PENDING,
      -- to_status = PENDING.
      INSERT INTO booking_events (booking_id, actor_id, from_status, to_status, metadata)
      VALUES (p_booking_id, v_actor_id, v_from_status, v_from_status,
              jsonb_build_object('action', 'REJECT') || p_metadata);

      RETURN jsonb_build_object(
        'id', v_booking.id,
        'status', v_from_status,
        'updated_at', v_booking.updated_at
      );

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
