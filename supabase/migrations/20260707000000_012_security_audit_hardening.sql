-- ============================================================================
-- 012_security_audit_hardening.sql
-- Forward migration applying the 2026-07 security audit fixes to a live DB.
-- Idempotent: safe to run on an already-provisioned project.
--
-- Fixes: C1 (admin escalation at signup), H2/H3 (booking column tampering via
-- RLS), M8 (RLS on notification_queue + kyc_rate_limits), M9 (users PII
-- enumeration), M10 (payment RPC hardening + amount reconciliation),
-- M10b (close the default PUBLIC EXECUTE grant on the service-role RPCs —
-- payment/kyc/create_booking), M11 (accept race),
-- M13 (REJECTED status trigger misfires).
-- The canonical source files under backend/ are updated to match.
-- ============================================================================

-- ─── C1: handle_new_user must never honour a client-supplied 'admin' role ────
-- Roles are self-asserted in signup metadata, so the trigger only trusts
-- 'handyman'; everything else (including 'admin') collapses to 'client'.
-- Admins are provisioned out-of-band (see notes below).
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_requested TEXT := NEW.raw_user_meta_data ->> 'user_type';
  v_user_type user_type;
BEGIN
  v_user_type := CASE
    WHEN v_requested = 'handyman' THEN 'handyman'::user_type
    ELSE 'client'::user_type
  END;

  INSERT INTO public.users (id, email, phone, full_name, user_type)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, NEW.phone || '@phone.oki.app'),
    NEW.phone,
    COALESCE(
      NEW.raw_user_meta_data ->> 'full_name',
      NULLIF(split_part(COALESCE(NEW.email, ''), '@', 1), ''),
      'User'
    ),
    v_user_type
  );

  IF v_user_type = 'handyman' THEN
    INSERT INTO public.handymen (id) VALUES (NEW.id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ─── H3: clients may only touch a whitelisted set of columns on their own ────
-- booking, and only cancel a PENDING one. amount/platform_fee/handyman_id/
-- status(beyond cancel) are server-owned and must not change via PostgREST.
DROP POLICY IF EXISTS bookings_update_client ON bookings;
CREATE POLICY bookings_update_client ON bookings
  FOR UPDATE TO authenticated
  USING (client_id = auth.uid())
  WITH CHECK (
    client_id = auth.uid()
    -- immutable, server-owned columns must equal their prior values
    AND amount        = (SELECT b.amount        FROM bookings b WHERE b.id = bookings.id)
    AND platform_fee  = (SELECT b.platform_fee  FROM bookings b WHERE b.id = bookings.id)
    AND service_id    = (SELECT b.service_id    FROM bookings b WHERE b.id = bookings.id)
    AND client_id     = (SELECT b.client_id     FROM bookings b WHERE b.id = bookings.id)
    AND handyman_id IS NOT DISTINCT FROM (SELECT b.handyman_id FROM bookings b WHERE b.id = bookings.id)
    AND surge_multiplier = (SELECT b.surge_multiplier FROM bookings b WHERE b.id = bookings.id)
    -- the only status change a client may self-serve is PENDING -> CANCELLED
    AND (
      status = (SELECT b.status FROM bookings b WHERE b.id = bookings.id)
      OR (
        (SELECT b.status FROM bookings b WHERE b.id = bookings.id) = 'PENDING'
        AND status = 'CANCELLED'
      )
    )
  );

-- ─── H2: the assigned handyman may not rewrite money columns or jump status. ─
-- Direct status changes via PostgREST are blocked entirely; all lifecycle
-- transitions must go through transition_booking_state / the Edge Functions
-- (which run SECURITY DEFINER and enforce the state machine + guards).
DROP POLICY IF EXISTS bookings_update_handyman ON bookings;
CREATE POLICY bookings_update_handyman ON bookings
  FOR UPDATE TO authenticated
  USING (
    handyman_id = auth.uid()
    AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND user_type = 'handyman')
  )
  WITH CHECK (
    handyman_id = auth.uid()
    AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND user_type = 'handyman')
    AND status       = (SELECT b.status       FROM bookings b WHERE b.id = bookings.id)
    AND amount       = (SELECT b.amount       FROM bookings b WHERE b.id = bookings.id)
    AND platform_fee = (SELECT b.platform_fee FROM bookings b WHERE b.id = bookings.id)
    AND client_id    = (SELECT b.client_id    FROM bookings b WHERE b.id = bookings.id)
    AND service_id   = (SELECT b.service_id   FROM bookings b WHERE b.id = bookings.id)
    AND handyman_id  = (SELECT b.handyman_id  FROM bookings b WHERE b.id = bookings.id)
  );

-- ─── M9: stop letting every authenticated user enumerate the whole users ─────
-- table (emails/phones). Replace the blanket "any ACTIVE user" read with one
-- scoped to: your own row, admins, booking counterparties, and searchable
-- (online + KYC-approved) handymen. users_select_own already covers self/admin.
DROP POLICY IF EXISTS users_select_public ON users;
CREATE POLICY users_select_related ON users
  FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR is_admin()
    OR EXISTS (
      SELECT 1 FROM bookings b
      WHERE (b.client_id = auth.uid() AND b.handyman_id = users.id)
         OR (b.handyman_id = auth.uid() AND b.client_id = users.id)
    )
    OR EXISTS (
      SELECT 1 FROM handymen h
      WHERE h.id = users.id AND h.is_online = true AND h.kyc_status = 'APPROVED'
    )
  );

-- ─── M8: notification_queue was created without RLS → fully open to any ──────
-- authenticated PostgREST caller. It is written/read only by the service-role
-- worker + SECURITY DEFINER triggers, so deny the authenticated role outright
-- (no policies = deny-all once RLS is enabled).
ALTER TABLE public.notification_queue ENABLE ROW LEVEL SECURITY;

-- ─── M8: same for kyc_rate_limits (bypass/lock-out vector). Only the ─────────
-- SECURITY DEFINER RPC touches it; deny the authenticated role.
ALTER TABLE public.kyc_rate_limits ENABLE ROW LEVEL SECURITY;

-- kyc_check_rate_limit is called from the Edge Function with the user's token,
-- so it must run as owner to write kyc_rate_limits under the new RLS. Make it
-- SECURITY DEFINER and derive the handyman from auth.uid() rather than trusting
-- a caller-supplied id (prevents resetting your own / poisoning others' limit).
CREATE OR REPLACE FUNCTION kyc_check_rate_limit(p_handyman_id UUID DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  cur int;
  win constant timestamptz := date_trunc('minute', now());
  v_id uuid := COALESCE(auth.uid(), p_handyman_id);
BEGIN
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  INSERT INTO kyc_rate_limits (handyman_id, window_start, count)
  VALUES (v_id, win, 1)
  ON CONFLICT (handyman_id, window_start)
  DO UPDATE SET count = kyc_rate_limits.count + 1
  RETURNING count INTO cur;

  IF cur > 10 THEN
    RETURN jsonb_build_object('allowed', false, 'retry_after', 60);
  ELSE
    RETURN jsonb_build_object('allowed', true);
  END IF;
END;
$$;
-- Revoking anon alone is a no-op while PUBLIC still holds the default EXECUTE
-- grant; revoke PUBLIC and grant only the service role (the kyc-upload Edge
-- Function calls this with the service-role key).
REVOKE EXECUTE ON FUNCTION kyc_check_rate_limit(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION kyc_check_rate_limit(UUID) TO service_role;

-- ─── M10: harden the payment capture RPC ────────────────────────────────────
-- (a) run as owner with a pinned search_path, (b) reconcile the caller-supplied
-- amount against the booking's stored amount so a forged/mismatched webhook
-- can't inflate the payout, (c) revoke the default PUBLIC EXECUTE grant and hand
-- it to service_role only so just the service role (webhook) can call it.
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
  SELECT client_id, handyman_id, status, amount, platform_fee
    INTO v_client_id, v_booking_handyman_id, v_status, v_booking_amount, v_booking_platform_fee
  FROM bookings
  WHERE id = booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'BOOKING_NOT_FOUND: %', booking_id;
  END IF;

  IF v_booking_handyman_id IS DISTINCT FROM handyman_id THEN
    RAISE EXCEPTION 'HANDYMAN_MISMATCH: booking % is not assigned to handyman %',
      booking_id, handyman_id;
  END IF;

  -- reconcile money against the server-owned booking record; never trust the
  -- amount handed in by the webhook payload.
  IF amount IS DISTINCT FROM v_booking_amount THEN
    RAISE EXCEPTION 'AMOUNT_MISMATCH: capture amount % does not match booking amount %',
      amount, v_booking_amount;
  END IF;
  IF net_amount IS DISTINCT FROM (v_booking_amount - v_booking_platform_fee) THEN
    RAISE EXCEPTION 'NET_AMOUNT_MISMATCH: % does not match booking net %',
      net_amount, (v_booking_amount - v_booking_platform_fee);
  END IF;

  IF EXISTS (
    SELECT 1 FROM payments p
    WHERE p.booking_id = execute_payment_transaction.booking_id
      AND p.status = 'CAPTURED'
  ) THEN
    RAISE EXCEPTION 'PAYMENT_ALREADY_CAPTURED: %', booking_id;
  END IF;

  IF v_status <> 'COMPLETED' THEN
    RAISE EXCEPTION 'INVALID_BOOKING_STATE: booking % is %, expected COMPLETED',
      booking_id, v_status;
  END IF;

  SELECT wallet_balance INTO v_current_balance FROM handymen WHERE id = handyman_id FOR UPDATE;
  v_new_balance := COALESCE(v_current_balance, 0) + net_amount;

  UPDATE handymen
  SET wallet_balance = v_new_balance, updated_at = now()
  WHERE id = handyman_id;

  UPDATE bookings
  SET status = 'PAID', updated_at = now()
  WHERE id = booking_id;

  INSERT INTO payments (
    booking_id, client_id, status, amount_authorized, amount_captured,
    provider_payment_id, captured_at, updated_at
  ) VALUES (
    booking_id, v_client_id, 'CAPTURED', amount, amount,
    payment_intent_id, now(), now()
  )
  ON CONFLICT (booking_id) DO UPDATE
  SET status = 'CAPTURED',
      amount_captured = EXCLUDED.amount_captured,
      provider_payment_id = EXCLUDED.provider_payment_id,
      captured_at = now(),
      updated_at = now();

  INSERT INTO wallet_transactions (
    handyman_id, booking_id, tx_type, amount, balance_after, description
  ) VALUES (
    handyman_id, booking_id, 'CREDIT', net_amount, v_new_balance,
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
$$;
REVOKE EXECUTE ON FUNCTION execute_payment_transaction(UUID, TEXT, NUMERIC, NUMERIC, NUMERIC, UUID)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION execute_payment_transaction(UUID, TEXT, NUMERIC, NUMERIC, NUMERIC, UUID)
  TO service_role;

-- ─── M10b: same PUBLIC-grant gap on create_booking. Migrations 008/010 revoked ─
-- anon/authenticated, but the default PUBLIC EXECUTE grant let any authenticated
-- PostgREST caller invoke it directly and bypass the create-booking Edge
-- Function's validation. Revoke PUBLIC and grant only the service role (the sole
-- caller). Idempotent re-grant is safe on an already-provisioned project.
REVOKE EXECUTE ON FUNCTION public.create_booking(uuid, booking_type, text, text, double precision, double precision, timestamptz, text)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_booking(uuid, booking_type, text, text, double precision, double precision, timestamptz, text)
  TO service_role;

-- ─── M11: lock the booking row on read inside transition_booking_state so two ─
-- handymen can't both pass the PENDING check and double-accept. Full function
-- re-emitted (CREATE OR REPLACE requires the whole body); only change vs. the
-- prior version is the `FOR UPDATE` on step 3.
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
  v_handyman_record handymen%ROWTYPE;
BEGIN
  v_actor_id := auth.uid();
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING HINT = 'auth.uid() returned null';
  END IF;

  SELECT user_type INTO STRICT v_actor_type FROM users WHERE id = v_actor_id;

  -- lock the booking row for the duration of the transaction
  SELECT * INTO STRICT v_booking FROM bookings WHERE id = p_booking_id FOR UPDATE;

  v_from_status := v_booking.status;

  IF v_from_status IN ('PAID'::booking_status, 'CANCELLED'::booking_status, 'REJECTED'::booking_status) THEN
    RAISE EXCEPTION 'Booking is closed (status: %)', v_from_status USING DETAIL = 'BOOKING_TERMINAL';
  END IF;

  CASE p_action
    WHEN 'ACCEPT' THEN
      IF v_actor_type != 'handyman' THEN
        RAISE EXCEPTION 'Only handymen can accept bookings' USING DETAIL = 'WRONG_ACTOR';
      END IF;
      IF v_from_status != 'PENDING'::booking_status THEN
        RAISE EXCEPTION 'Can only accept PENDING bookings (current: %)', v_from_status USING DETAIL = 'TRANSITION_NOT_ALLOWED';
      END IF;
      SELECT * INTO STRICT v_handyman_record FROM handymen WHERE id = v_actor_id;
      IF NOT v_handyman_record.is_online THEN
        RAISE EXCEPTION 'Handyman must be online to accept' USING DETAIL = 'GUARD_NOT_SATISFIED';
      END IF;
      IF v_handyman_record.kyc_status != 'APPROVED' THEN
        RAISE EXCEPTION 'Handyman KYC must be approved' USING DETAIL = 'GUARD_NOT_SATISFIED';
      END IF;
      IF v_booking.request_expires_at IS NOT NULL AND v_booking.request_expires_at < now() THEN
        RAISE EXCEPTION 'Booking request has expired' USING DETAIL = 'GUARD_NOT_SATISFIED';
      END IF;
      v_to_status := 'ACCEPTED'::booking_status;
      UPDATE bookings SET status = v_to_status, handyman_id = v_actor_id, updated_at = now() WHERE id = p_booking_id;

    WHEN 'REJECT' THEN
      IF v_actor_type != 'handyman' THEN
        RAISE EXCEPTION 'Only handymen can reject bookings' USING DETAIL = 'WRONG_ACTOR';
      END IF;
      IF v_from_status != 'PENDING'::booking_status THEN
        RAISE EXCEPTION 'Can only reject PENDING bookings (current: %)', v_from_status USING DETAIL = 'TRANSITION_NOT_ALLOWED';
      END IF;
      v_to_status := 'REJECTED'::booking_status;
      UPDATE bookings SET status = v_to_status, handyman_id = v_actor_id, updated_at = now() WHERE id = p_booking_id;

    WHEN 'CANCEL' THEN
      IF v_actor_type != 'client' THEN
        RAISE EXCEPTION 'Only clients can cancel bookings' USING DETAIL = 'WRONG_ACTOR';
      END IF;
      IF v_actor_id != v_booking.client_id THEN
        RAISE EXCEPTION 'Only the booking owner can cancel' USING DETAIL = 'WRONG_ACTOR';
      END IF;
      IF v_from_status != 'PENDING'::booking_status THEN
        RAISE EXCEPTION 'Can only cancel PENDING bookings (current: %). After acceptance, use the dispute flow.', v_from_status USING DETAIL = 'TRANSITION_NOT_ALLOWED';
      END IF;
      v_to_status := 'CANCELLED'::booking_status;
      UPDATE bookings SET status = v_to_status, updated_at = now() WHERE id = p_booking_id;

    WHEN 'START_TRANSIT' THEN
      IF v_actor_type != 'handyman' THEN
        RAISE EXCEPTION 'Only handymen can start transit' USING DETAIL = 'WRONG_ACTOR';
      END IF;
      IF v_actor_id != v_booking.handyman_id THEN
        RAISE EXCEPTION 'Only the assigned handyman can start transit' USING DETAIL = 'WRONG_ACTOR';
      END IF;
      IF v_from_status != 'ACCEPTED'::booking_status THEN
        RAISE EXCEPTION 'Can only start transit for ACCEPTED bookings (current: %)', v_from_status USING DETAIL = 'TRANSITION_NOT_ALLOWED';
      END IF;
      v_to_status := 'IN_TRANSIT'::booking_status;
      UPDATE bookings SET status = v_to_status, updated_at = now() WHERE id = p_booking_id;

    WHEN 'MARK_ARRIVED' THEN
      IF v_actor_type != 'handyman' THEN
        RAISE EXCEPTION 'Only handymen can mark arrival' USING DETAIL = 'WRONG_ACTOR';
      END IF;
      IF v_actor_id != v_booking.handyman_id THEN
        RAISE EXCEPTION 'Only the assigned handyman can mark arrival' USING DETAIL = 'WRONG_ACTOR';
      END IF;
      IF v_from_status != 'IN_TRANSIT'::booking_status THEN
        RAISE EXCEPTION 'Can only mark arrival for IN_TRANSIT bookings (current: %)', v_from_status USING DETAIL = 'TRANSITION_NOT_ALLOWED';
      END IF;
      v_to_status := 'ARRIVED'::booking_status;
      UPDATE bookings SET status = v_to_status, updated_at = now() WHERE id = p_booking_id;

    WHEN 'START_WORK' THEN
      IF v_actor_type != 'handyman' THEN
        RAISE EXCEPTION 'Only handymen can start work' USING DETAIL = 'WRONG_ACTOR';
      END IF;
      IF v_actor_id != v_booking.handyman_id THEN
        RAISE EXCEPTION 'Only the assigned handyman can start work' USING DETAIL = 'WRONG_ACTOR';
      END IF;
      IF v_from_status != 'ARRIVED'::booking_status THEN
        RAISE EXCEPTION 'Can only start work for ARRIVED bookings (current: %)', v_from_status USING DETAIL = 'TRANSITION_NOT_ALLOWED';
      END IF;
      IF v_booking.before_photo_url IS NULL THEN
        RAISE EXCEPTION 'Before-photo must be uploaded before starting work' USING DETAIL = 'GUARD_NOT_SATISFIED';
      END IF;
      v_to_status := 'WORK_STARTED'::booking_status;
      UPDATE bookings SET status = v_to_status, updated_at = now() WHERE id = p_booking_id;

    WHEN 'COMPLETE' THEN
      IF v_actor_type != 'handyman' THEN
        RAISE EXCEPTION 'Only handymen can complete bookings' USING DETAIL = 'WRONG_ACTOR';
      END IF;
      IF v_actor_id != v_booking.handyman_id THEN
        RAISE EXCEPTION 'Only the assigned handyman can complete' USING DETAIL = 'WRONG_ACTOR';
      END IF;
      IF v_from_status != 'WORK_STARTED'::booking_status THEN
        RAISE EXCEPTION 'Can only complete WORK_STARTED bookings (current: %)', v_from_status USING DETAIL = 'TRANSITION_NOT_ALLOWED';
      END IF;
      IF v_booking.after_photo_url IS NULL THEN
        RAISE EXCEPTION 'After-photo must be uploaded before completing' USING DETAIL = 'GUARD_NOT_SATISFIED';
      END IF;
      v_to_status := 'COMPLETED'::booking_status;
      UPDATE bookings SET status = v_to_status, updated_at = now() WHERE id = p_booking_id;

    ELSE
      RAISE EXCEPTION 'Unknown action: %', p_action USING DETAIL = 'TRANSITION_NOT_ALLOWED';
  END CASE;

  INSERT INTO booking_events (booking_id, actor_id, from_status, to_status, metadata)
  VALUES (p_booking_id, v_actor_id, v_from_status, v_to_status,
          jsonb_build_object('action', p_action) || p_metadata);

  RETURN row_to_json(v_booking)::jsonb || jsonb_build_object('status', v_to_status, 'updated_at', now());
END;
$$;

-- ─── M13: the notification/overlap triggers keyed only on handyman_id being ──
-- set, so a REJECT (which also stamps the rejecting handyman) misfired: it
-- queued a reminder for a dead booking and ran the double-booking check,
-- blocking rejects that overlapped an existing slot. Gate both on the ACCEPT
-- transition (status becomes ACCEPTED).
CREATE OR REPLACE FUNCTION public.enqueue_scheduled_booking_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_lead_time interval := interval '1 hour';
BEGIN
  IF new.status = 'ACCEPTED'
     AND new.handyman_id IS NOT NULL
     AND (old.handyman_id IS DISTINCT FROM new.handyman_id)
     AND new.scheduled_at IS NOT NULL
  THEN
    INSERT INTO public.notification_queue (booking_id, handyman_id, send_at)
    VALUES (new.id, new.handyman_id, new.scheduled_at - v_lead_time);
  END IF;
  RETURN new;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_booking_accept()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_overlapping int;
  v_duration interval;
BEGIN
  IF new.status = 'ACCEPTED'
     AND new.handyman_id IS NOT NULL
     AND (old.handyman_id IS DISTINCT FROM new.handyman_id)
  THEN
    SELECT estimated_duration INTO STRICT v_duration FROM public.services WHERE id = new.service_id;

    SELECT count(*) INTO v_overlapping
    FROM public.bookings
    WHERE handyman_id = new.handyman_id
      AND id != new.id
      AND status NOT IN ('CANCELLED', 'COMPLETED', 'PAID', 'REJECTED')
      AND scheduled_at IS NOT NULL
      AND tsrange(scheduled_at, scheduled_at + v_duration) &&
          tsrange(new.scheduled_at, new.scheduled_at + v_duration);

    IF v_overlapping > 0 THEN
      RAISE EXCEPTION 'Handyman is already booked during this time' USING ERRCODE = '42202';
    END IF;
  END IF;
  RETURN new;
END;
$$;

-- also clean up any queued reminder if a booking ends up REJECTED
DROP TRIGGER IF EXISTS trigger_cleanup_notification_on_cancel ON public.bookings;
CREATE TRIGGER trigger_cleanup_notification_on_cancel
  AFTER UPDATE OF status ON public.bookings
  FOR EACH ROW
  WHEN (new.status IN ('CANCELLED', 'REJECTED'))
  EXECUTE FUNCTION public.cleanup_notification_on_cancel();

-- ─── M12: authenticate the notification-worker cron invocation. ─────────────
-- The worker now requires the service-role bearer (see edge function + the
-- verify_jwt flag in supabase/config.toml). Re-point the cron job to send it.
-- PREREQUISITE (run once, do NOT commit the key):
--   select vault.create_secret('<YOUR_SERVICE_ROLE_KEY>', 'service_role_key');
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'process-upcoming-handyman-notifications') THEN
    PERFORM cron.unschedule('process-upcoming-handyman-notifications');
  END IF;
END $$;

SELECT cron.schedule(
  'process-upcoming-handyman-notifications',
  '* * * * *',
  $$
    select net.http_post(
      url := 'https://wvrhxxtvefeyynglfibq.supabase.co/functions/v1/notification-worker',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (
          select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key'
        )
      )
    );
  $$
);
