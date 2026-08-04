-- 017_trust_score.sql
-- Trust Score computation:
--   * Weighted rolling average of the last 50 reviews stored as `trust_score`
--     on `handymen` and `users`.
--   * Score recomputed inside the insert transaction via an AFTER INSERT
--     trigger on `reviews` (race-safe with an advisory lock).
--   * `trust_score` + `review_count` exposed in `search_nearest_handymen`.

-- ---------------------------------------------------------------------------
-- 1. users: trust_score + review_count columns (mirrors handymen)
-- ---------------------------------------------------------------------------

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS trust_score NUMERIC(3, 2)
    CHECK (trust_score IS NULL OR (trust_score >= 1 AND trust_score <= 5)),
  ADD COLUMN IF NOT EXISTS review_count INTEGER NOT NULL DEFAULT 0
    CHECK (review_count >= 0);

-- ---------------------------------------------------------------------------
-- 2. recompute_trust_score(uuid) — SECURITY DEFINER, trigger/backfill only
-- ---------------------------------------------------------------------------
-- Weights newest visible review 50, the 50th newest 1 (rolling window).
-- review_count reflects ALL visible reviews (not capped at 50).
-- Locked per reviewee so concurrent inserts cannot interleave read-modify-write.

CREATE OR REPLACE FUNCTION public.recompute_trust_score(p_reviewee_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_total_count integer;
  v_weighted_score numeric(3,2);
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('oki_trust_score_' || p_reviewee_id::text));

  SELECT COUNT(*)
  INTO v_total_count
  FROM public.reviews
  WHERE reviewee_id = p_reviewee_id
    AND is_hidden = false;

  SELECT
    CASE WHEN SUM(w) = 0 THEN NULL ELSE ROUND(SUM(rating * w)::numeric / SUM(w), 2) END
  INTO v_weighted_score
  FROM (
    SELECT rating, (51 - rn) AS w
    FROM (
      SELECT rating,
             row_number() OVER (ORDER BY created_at DESC, id DESC) AS rn
      FROM public.reviews
      WHERE reviewee_id = p_reviewee_id
        AND is_hidden = false
      LIMIT 50
    ) ranked
  ) weighted;

  UPDATE public.handymen
  SET trust_score = v_weighted_score,
      review_count = v_total_count
  WHERE id = p_reviewee_id;

  UPDATE public.users
  SET trust_score = v_weighted_score,
      review_count = v_total_count
  WHERE id = p_reviewee_id;
END;
$$;

-- Function is internal plumbing — never callable via PostgREST.
REVOKE ALL ON FUNCTION public.recompute_trust_score(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.recompute_trust_score(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.recompute_trust_score(uuid) FROM authenticated;

-- ---------------------------------------------------------------------------
-- 3. Trigger — fires inside the review INSERT transaction
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.recompute_trust_score_on_review()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  PERFORM public.recompute_trust_score(NEW.reviewee_id);
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.recompute_trust_score_on_review() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.recompute_trust_score_on_review() FROM anon;
REVOKE ALL ON FUNCTION public.recompute_trust_score_on_review() FROM authenticated;

DROP TRIGGER IF EXISTS trg_reviews_recompute_trust_score ON public.reviews;

CREATE TRIGGER trg_reviews_recompute_trust_score
  AFTER INSERT ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.recompute_trust_score_on_review();

-- ---------------------------------------------------------------------------
-- 4. Backfill existing handymen/users from current reviews
-- ---------------------------------------------------------------------------

SELECT public.recompute_trust_score(reviewee_id)
FROM (SELECT DISTINCT reviewee_id FROM public.reviews) r;

-- ---------------------------------------------------------------------------
-- 5. search_nearest_handymen — expose trust_score + review_count
-- ---------------------------------------------------------------------------
-- Changing the RETURN TABLE shape requires DROP (CREATE OR REPLACE cannot
-- alter a function's return type). CASCADE also drops notify_nearby_handymen,
-- which depends on this function — recreate it below with an identical body.

DROP FUNCTION IF EXISTS public.search_nearest_handymen(
  double precision, double precision, float, service_category
) CASCADE;

CREATE FUNCTION public.search_nearest_handymen(
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
  distance_meters float8,
  trust_score numeric,
  review_count integer
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
    ) AS distance_meters,
    h.trust_score,
    h.review_count
  FROM handymen h
  JOIN users u ON h.id = u.id
  JOIN handyman_locations hl ON h.id = hl.id
  JOIN handyman_services hs ON h.id = hs.handyman_id
  JOIN services s ON hs.service_id = s.id
  WHERE h.is_online = true
    AND h.kyc_status = 'APPROVED'
    AND hl.location IS NOT NULL
    AND (p_category IS NULL OR s.category = p_category)
    AND st_dwithin(
      hl.location,
      st_setsrid(st_makepoint(p_client_lng, p_client_lat), 4326)::geography,
      p_radius_meters
    )
  ORDER BY distance_meters ASC
  LIMIT 20;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.search_nearest_handymen(
  double precision, double precision, float, service_category
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_nearest_handymen(
  double precision, double precision, float, service_category
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_nearest_handymen(
  double precision, double precision, float, service_category
) TO service_role;

-- ---------------------------------------------------------------------------
-- 6. Recreate notify_nearby_handymen (dropped by CASCADE above)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.notify_nearby_handymen(
  p_booking_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_service_id uuid;
  v_category    service_category;
  v_lat         double precision;
  v_lng         double precision;
  v_ids         uuid[];
  v_notified    jsonb;
BEGIN
  SELECT b.service_id,
         st_y(b.location::geometry) as lat,
         st_x(b.location::geometry) as lng
  INTO v_service_id, v_lat, v_lng
  FROM bookings b
  WHERE b.id = p_booking_id;

  IF NOT FOUND THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT s.category INTO v_category
  FROM services s
  WHERE s.id = v_service_id;

  IF v_category IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  WITH nearby AS (
    SELECT handyman_id, distance_meters
    FROM public.search_nearest_handymen(v_lat, v_lng, 50000, v_category)
  )
  SELECT
    array_agg(handyman_id),
    jsonb_agg(
      jsonb_build_object(
        'handyman_id',     handyman_id,
        'distance_meters', distance_meters
      )
    )
  INTO v_ids, v_notified
  FROM nearby;

  IF v_ids IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  INSERT INTO public.notification_queue (booking_id, handyman_id, send_at)
  SELECT p_booking_id, unnest(v_ids), now();

  RETURN COALESCE(v_notified, '[]'::jsonb);
END;
$$;

REVOKE ALL ON FUNCTION public.notify_nearby_handymen(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.notify_nearby_handymen(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.notify_nearby_handymen(uuid) FROM authenticated;