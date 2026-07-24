-- Database-level CHECK constraint for booking state machine.
-- Secondary safety net: any direct UPDATE bookings SET status = ...
-- that would violate the FSM raises an exception. Primary validation
-- lives in the transition_booking_state RPC; this trigger catches
-- accidental direct status mutations.
--
-- Bypass with: SET LOCAL app.bypass_booking_fsm_trigger = 'true';
-- before the UPDATE (e.g. admin fixup scripts).

CREATE OR REPLACE FUNCTION public.check_booking_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_setting('app.bypass_booking_fsm_trigger', true) = 'true' THEN
    RETURN NEW;
  END IF;

  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  IF NOT (
    CASE OLD.status
      WHEN 'PENDING'     THEN NEW.status IN ('ACCEPTED', 'CANCELLED', 'REJECTED')
      WHEN 'ACCEPTED'    THEN NEW.status = 'IN_TRANSIT'
      WHEN 'IN_TRANSIT'  THEN NEW.status = 'ARRIVED'
      WHEN 'ARRIVED'     THEN NEW.status = 'WORK_STARTED'
      WHEN 'WORK_STARTED' THEN NEW.status = 'COMPLETED'
      WHEN 'COMPLETED'   THEN NEW.status = 'PAID'
      ELSE false
    END
  ) THEN
    RAISE EXCEPTION 'Invalid booking status transition: % → %', OLD.status, NEW.status
      USING DETAIL = 'TRANSITION_NOT_ALLOWED',
            HINT   = 'Use transition_booking_state() RPC instead of direct UPDATE';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_booking_fsm ON public.bookings;

CREATE TRIGGER trg_booking_fsm
  BEFORE UPDATE OF status ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.check_booking_transition();
