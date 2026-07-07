-- Add missing database objects required by Edge Functions.
-- All statements are idempotent (IF NOT EXISTS / OR REPLACE / IF NOT FOUND).

-- 0. Add REJECTED to booking_status enum (needed by reject-booking Edge Function)
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'REJECTED';

-- 1. Lightweight transient location table (replaces handymen.location for proximity search)
CREATE TABLE IF NOT EXISTS public.handyman_locations (
  id uuid REFERENCES public.handymen(id) ON DELETE CASCADE PRIMARY KEY,
  location geography(Point, 4326) NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.handyman_locations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'handyman_locations' AND policyname = 'handyman_locations_upsert_own'
  ) THEN
    CREATE POLICY handyman_locations_upsert_own
      ON public.handyman_locations FOR INSERT
      TO authenticated
      WITH CHECK (id = auth.uid());
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'handyman_locations' AND policyname = 'handyman_locations_update_own'
  ) THEN
    CREATE POLICY handyman_locations_update_own
      ON public.handyman_locations FOR UPDATE
      TO authenticated
      USING (id = auth.uid())
      WITH CHECK (id = auth.uid());
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'handyman_locations' AND policyname = 'handyman_locations_select_searchable'
  ) THEN
    CREATE POLICY handyman_locations_select_searchable
      ON public.handyman_locations FOR SELECT
      TO authenticated
      USING (
        (SELECT is_admin())
        OR id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.handymen h
          WHERE h.id = handyman_locations.id
            AND h.is_online = true
            AND h.kyc_status = 'APPROVED'
        )
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS handyman_locations_gist
  ON public.handyman_locations USING gist(location);

DROP INDEX IF EXISTS idx_handymen_location;

-- 2. upsert_handyman_location (security-definer: caller must match p_handyman_id)
CREATE OR REPLACE FUNCTION public.upsert_handyman_location(
  p_handyman_id uuid,
  p_lat double precision,
  p_lng double precision
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF p_handyman_id <> auth.uid() THEN
    RAISE EXCEPTION 'Handyman ID does not match authenticated user'
      USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.handyman_locations (id, location, updated_at)
  VALUES (
    p_handyman_id,
    st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography,
    now()
  )
  ON CONFLICT (id) DO UPDATE
  SET
    location = excluded.location,
    updated_at = excluded.updated_at;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.upsert_handyman_location(uuid, double precision, double precision)
  FROM public;
GRANT  EXECUTE ON FUNCTION public.upsert_handyman_location(uuid, double precision, double precision)
  TO authenticated;

-- 3. search_nearest_handymen — only callable by service_role (notify_nearby_handymen)
CREATE OR REPLACE FUNCTION public.search_nearest_handymen(
  p_client_lat double precision,
  p_client_lng double precision,
  p_radius_meters float,
  p_category service_category
)
RETURNS TABLE (
  handyman_id uuid,
  user_name text,
  photo_url text,
  is_online boolean,
  distance_meters float8
)
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    h.id,
    u.full_name,
    u.photo_url,
    h.is_online,
    st_distance(
      hl.location,
      st_setsrid(st_makepoint(p_client_lng, p_client_lat), 4326)::geography
    ) AS distance_meters
  FROM public.handymen h
  JOIN public.users u ON h.id = u.id
  JOIN public.handyman_locations hl ON h.id = hl.id
  JOIN public.handyman_services hs ON h.id = hs.handyman_id
  JOIN public.services s ON hs.service_id = s.id
  WHERE h.is_online = true
    AND h.kyc_status = 'APPROVED'
    AND hl.location IS NOT NULL
    AND s.category = p_category
    AND st_dwithin(
      hl.location,
      st_setsrid(st_makepoint(p_client_lng, p_client_lat), 4326)::geography,
      p_radius_meters
    )
  ORDER BY distance_meters ASC
  LIMIT 20;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.search_nearest_handymen(double precision, double precision, float, service_category)
  FROM public;
-- Only notify_nearby_handymen calls this, which itself is service_role only.

-- 4. get_handyman_blocked_slots
CREATE OR REPLACE FUNCTION public.get_handyman_blocked_slots(
  p_handyman_id uuid,
  p_start_date timestamptz,
  p_end_date timestamptz
)
RETURNS TABLE (
  blocked_start timestamptz,
  blocked_end timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.scheduled_at AS blocked_start,
    b.scheduled_at + s.estimated_duration AS blocked_end
  FROM public.bookings b
  JOIN public.services s ON b.service_id = s.id
  WHERE b.handyman_id = p_handyman_id
    AND b.scheduled_at >= p_start_date
    AND b.scheduled_at <= p_end_date
    AND b.status NOT IN ('CANCELLED', 'COMPLETED', 'PAID', 'REJECTED')
  ORDER BY b.scheduled_at ASC;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_handyman_blocked_slots(uuid, timestamptz, timestamptz)
  FROM public;
GRANT  EXECUTE ON FUNCTION public.get_handyman_blocked_slots(uuid, timestamptz, timestamptz)
  TO authenticated;

-- 5. create_booking RPC (called by create-booking Edge Function)
-- Derives client_id from auth.uid() and amount from services.base_rate — cannot impersonate.
CREATE OR REPLACE FUNCTION public.create_booking(
  p_service_id uuid,
  p_booking_type booking_type,
  p_description text,
  p_address_text text,
  p_lat double precision,
  p_lng double precision,
  p_scheduled_at timestamptz DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_client_id uuid;
  v_booking_id uuid;
  v_status booking_status := 'PENDING';
  v_expires_at timestamptz := now() + interval '30 minutes';
  v_amount numeric;
  v_platform_fee numeric;
  v_booking jsonb;
BEGIN
  v_client_id := auth.uid();
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

REVOKE EXECUTE ON FUNCTION public.create_booking(uuid, booking_type, text, text, double precision, double precision, timestamptz, text)
  FROM public;
-- Only callable via service_role key (Edge Function). Not exposed to anon/authenticated.

-- 6. kyc_rate_limits table (rate-limit tracking for KYC uploads)
-- The kyc_check_rate_limit function is created/replaced in 012, but the table
-- itself only exists in backend/migrations/004. Add it here so the hardening
-- migration's ALTER TABLE succeeds.
CREATE TABLE IF NOT EXISTS public.kyc_rate_limits (
  handyman_id UUID NOT NULL,
  window_start TIMESTAMPTZ NOT NULL DEFAULT date_trunc('minute', now()),
  count INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (handyman_id, window_start)
);

ALTER TABLE public.kyc_rate_limits ENABLE ROW LEVEL SECURITY;
