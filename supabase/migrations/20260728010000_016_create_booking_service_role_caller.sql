-- ============================================================================
-- 016_create_booking_service_role_caller.sql
--
-- Fix: create_booking has been uncallable since migration 012.
--
-- 012 revoked the default PUBLIC EXECUTE grant and handed it to service_role
-- only, so the create-booking Edge Function is the sole legitimate caller. But
-- the function body derives the client from auth.uid(), and PostgREST takes its
-- database role from the JWT it is handed — so the caller cannot be service_role
-- and carry an end-user identity at the same time:
--
--   * pass the user's JWT  -> role is `authenticated` -> permission denied
--   * pass the service key -> auth.uid() is NULL      -> 'Not authenticated'
--
-- The Edge Function papered over this by building a service-role client and then
-- overriding it with the user's Authorization header, which just lands in the
-- first case. Every booking creation returned 500.
--
-- Resolution mirrors what 012 already did for kyc_check_rate_limit: accept an
-- explicit id and prefer auth.uid() when there is one —
--   v_client_id := COALESCE(auth.uid(), p_client_id)
-- Only service_role can execute the function at all, so p_client_id is not
-- reachable by an end user, and a user-token caller still cannot impersonate
-- anyone because auth.uid() wins whenever it is set. Amount and platform fee
-- stay server-derived from services.base_rate; the client-is-a-client check
-- still applies to whichever id is resolved.
-- ============================================================================

DROP FUNCTION IF EXISTS public.create_booking(
  uuid, booking_type, text, text, double precision, double precision, timestamptz, text
);

CREATE OR REPLACE FUNCTION public.create_booking(
  p_service_id   uuid,
  p_booking_type booking_type,
  p_description  text,
  p_address_text text,
  p_lat          double precision,
  p_lng          double precision,
  p_scheduled_at timestamptz DEFAULT NULL,
  p_notes        text DEFAULT NULL,
  p_client_id    uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  -- auth.uid() wins when present, so a caller holding a user token can only
  -- ever create a booking for themselves. p_client_id is the service-role path.
  v_client_id uuid := COALESCE(auth.uid(), p_client_id);
  v_booking_id uuid;
  v_status booking_status := 'PENDING';
  v_expires_at timestamptz := now() + interval '30 minutes';
  v_amount numeric;
  v_platform_fee numeric;
  v_booking jsonb;
BEGIN
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = v_client_id AND user_type = 'client') THEN
    RAISE EXCEPTION 'Only clients can create bookings' USING ERRCODE = '40300';
  END IF;

  SELECT base_rate INTO STRICT v_amount FROM public.services WHERE id = p_service_id;
  v_platform_fee := round(v_amount * 0.10, 2);

  IF p_booking_type = 'ON_DEMAND' AND p_scheduled_at IS NOT NULL THEN
    RAISE EXCEPTION 'On-demand bookings must not have a scheduled time' USING ERRCODE = '42200';
  END IF;

  INSERT INTO public.bookings (
    client_id, service_id, booking_type, status, description,
    address_text, location, amount, platform_fee, scheduled_at,
    request_expires_at, notes
  ) VALUES (
    v_client_id, p_service_id, p_booking_type, v_status, p_description,
    p_address_text,
    st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography,
    v_amount, v_platform_fee, p_scheduled_at,
    CASE WHEN p_booking_type = 'ON_DEMAND' THEN v_expires_at ELSE NULL END,
    p_notes
  )
  RETURNING id INTO v_booking_id;

  INSERT INTO public.booking_events (booking_id, actor_id, from_status, to_status, metadata)
  VALUES (v_booking_id, v_client_id, NULL, v_status, jsonb_build_object('action', 'CREATE'));

  INSERT INTO public.payments (booking_id, client_id, status, amount_authorized, currency)
  VALUES (v_booking_id, v_client_id, 'AUTHORIZED', v_amount, 'PHP');

  SELECT row_to_json(b)::jsonb INTO v_booking FROM public.bookings b WHERE b.id = v_booking_id;
  RETURN v_booking;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_booking(
  uuid, booking_type, text, text, double precision, double precision, timestamptz, text, uuid
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_booking(
  uuid, booking_type, text, text, double precision, double precision, timestamptz, text, uuid
) TO service_role;
