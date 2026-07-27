-- Database-level CHECK constraint for booking state machine.
-- Secondary safety net: any direct UPDATE bookings SET status = ...
-- that would violate the FSM raises an exception. Primary validation
-- lives in the transition_booking_state RPC; this trigger catches
-- accidental direct status mutations.
--
-- Covers three gaps vs the RPC:
--   1. Pins INSERT status to PENDING (bypass would allow COMPLETED at birth).
--   2. Enforces photo guards on ARRIVED→WORK_STARTED and WORK_STARTED→COMPLETED.
--   3. Bypass GUC requires the caller to be superuser / service_role.
--
-- Bypass with: SET LOCAL app.bypass_booking_fsm_trigger = 'true';
-- (only honoured when current_user IN ('postgres', 'service_role')).

CREATE OR REPLACE FUNCTION public.check_booking_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_role text;
BEGIN
  -- ── Gap 3: bypass gated on role ──────────────────────────────────
  IF current_setting('app.bypass_booking_fsm_trigger', true) = 'true' THEN
    SELECT COALESCE(session_user, current_user) INTO v_role;
    IF v_role IN ('postgres', 'service_role') THEN
      RETURN NEW;
    END IF;
  END IF;

  -- ── Gap 1: INSERT pins status to PENDING ─────────────────────────
  IF TG_OP = 'INSERT' THEN
    NEW.status := 'PENDING';
    RETURN NEW;
  END IF;

  -- ── UPDATE path: validate transition ─────────────────────────────
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  IF NOT (
    CASE OLD.status
      WHEN 'PENDING'      THEN NEW.status IN ('ACCEPTED', 'CANCELLED')
      WHEN 'ACCEPTED'     THEN NEW.status = 'IN_TRANSIT'
      WHEN 'IN_TRANSIT'   THEN NEW.status = 'ARRIVED'
      WHEN 'ARRIVED'      THEN NEW.status = 'WORK_STARTED'
      WHEN 'WORK_STARTED' THEN NEW.status = 'COMPLETED'
      WHEN 'COMPLETED'    THEN NEW.status = 'PAID'
      ELSE false
    END
  ) THEN
    RAISE EXCEPTION 'Invalid booking status transition: % → %', OLD.status, NEW.status
      USING DETAIL = 'TRANSITION_NOT_ALLOWED',
            HINT   = 'Use transition_booking_state() RPC instead of direct UPDATE';
  END IF;

  -- ── Gap 2: photo guards ──────────────────────────────────────────
  IF OLD.status = 'ARRIVED' AND NEW.status = 'WORK_STARTED' THEN
    IF NEW.before_photo_url IS NULL THEN
      RAISE EXCEPTION 'before_photo_url is required to start work'
        USING DETAIL = 'GUARD_NOT_SATISFIED';
    END IF;
  END IF;

  IF OLD.status = 'WORK_STARTED' AND NEW.status = 'COMPLETED' THEN
    IF NEW.after_photo_url IS NULL THEN
      RAISE EXCEPTION 'after_photo_url is required to complete work'
        USING DETAIL = 'GUARD_NOT_SATISFIED';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_booking_fsm ON public.bookings;

CREATE TRIGGER trg_booking_fsm
  BEFORE INSERT OR UPDATE OF status ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.check_booking_transition();
