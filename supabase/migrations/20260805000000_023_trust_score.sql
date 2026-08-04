-- 023_trust_score.sql
-- Trust Score computation — the single owner of `handymen.trust_score` /
-- `handymen.review_count`.
--
--   * Weighted score over the last 50 visible reviews, stored on `handymen`.
--   * Weights are position-based within the actual window (newest = window
--     size, oldest = 1), so recency matters even for a handyman with few
--     reviews.
--   * Recomputed inside the review transaction via an AFTER trigger covering
--     INSERT, rating/is_hidden/reviewee_id UPDATE and DELETE, race-safe with a
--     per-reviewee advisory lock.
--   * `trust_score` + `review_count` exposed in `search_nearest_handymen`.
--
-- This migration REPLACES 022's plain-average path. 022 shipped
-- `recalculate_handyman_rating` + the `reviews_sync_handyman_rating` trigger;
-- two triggers writing the same column with different maths would leave the
-- score dependent on which trigger fired last, so this migration drops both
-- and matches 022's event list.
--
-- No mirror columns on `users`. Nothing reads `users.trust_score` or
-- `users.review_count` (search, booking detail and profiles all read
-- `handymen`); 018 grants UPDATE on `users` while 021 pins only
-- user_type/user_status/email there, and a second copy with nothing keeping it
-- in sync is a drift source. The DROP COLUMN IF EXISTS below also converges
-- any environment where the earlier draft of this migration added the mirror.

-- ---------------------------------------------------------------------------
-- 1. Remove 022's plain-average trigger path, and the users mirror
-- ---------------------------------------------------------------------------

DROP TRIGGER IF EXISTS reviews_sync_handyman_rating ON public.reviews;
DROP FUNCTION IF EXISTS public.recalculate_handyman_rating(uuid);

ALTER TABLE public.users
  DROP COLUMN IF EXISTS trust_score,
  DROP COLUMN IF EXISTS review_count;

-- ---------------------------------------------------------------------------
-- 2. recompute_trust_score(uuid) — SECURITY DEFINER, trigger/backfill only
-- ---------------------------------------------------------------------------
-- Weights newest visible review = min(count, 50), the oldest in the window = 1,
-- so a handyman with 3 reviews gets weights 3/2/1 (newest carries 50%) rather
-- than 50/49/48 (a plain average in everything but name).
-- review_count reflects ALL visible reviews (not capped at 50).
-- Locked per reviewee so concurrent inserts cannot interleave read-modify-write.
-- Only `handymen` is written: the users mirror is gone (see header).

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

  -- row_number() is computed over every visible review with an explicit ORDER
  -- BY; rn <= 50 on the wrapping select keeps the 50 newest deterministically
  -- (no LIMIT inside the window subquery).
  SELECT
    CASE WHEN SUM(w) = 0 THEN NULL ELSE ROUND(SUM(rating * w)::numeric / SUM(w), 2) END
  INTO v_weighted_score
  FROM (
    SELECT rating, (LEAST(v_total_count, 50) - rn + 1) AS w
    FROM (
      SELECT rating,
             row_number() OVER (ORDER BY created_at DESC, id DESC) AS rn
      FROM public.reviews
      WHERE reviewee_id = p_reviewee_id
        AND is_hidden = false
    ) ranked
    WHERE rn <= 50
  ) weighted;

  UPDATE public.handymen
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
-- 3. Trigger — fires inside the review transaction
-- ---------------------------------------------------------------------------
-- Event list matches 022 so the two paths cannot disagree about when a score
-- should change: hiding an abusive review or editing a rating drops the old
-- value out of the score, and repointing a review moves the score off the
-- handyman who no longer owns it.

CREATE OR REPLACE FUNCTION public.recompute_trust_score_on_review()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF TG_OP <> 'INSERT' THEN
    PERFORM public.recompute_trust_score(OLD.reviewee_id);
  END IF;

  IF TG_OP <> 'DELETE' AND (TG_OP = 'INSERT' OR NEW.reviewee_id <> OLD.reviewee_id) THEN
    PERFORM public.recompute_trust_score(NEW.reviewee_id);
  END IF;

  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.recompute_trust_score_on_review() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.recompute_trust_score_on_review() FROM anon;
REVOKE ALL ON FUNCTION public.recompute_trust_score_on_review() FROM authenticated;

DROP TRIGGER IF EXISTS trg_reviews_recompute_trust_score ON public.reviews;

CREATE TRIGGER trg_reviews_recompute_trust_score
  AFTER INSERT OR UPDATE OF rating, is_hidden, reviewee_id OR DELETE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.recompute_trust_score_on_review();

-- ---------------------------------------------------------------------------
-- 4. Backfill every handyman from current reviews
-- ---------------------------------------------------------------------------
-- Runs over `handymen`, not just reviewees who already have a review, so a
-- handyman with a seeded trust_score and no reviews lands on NULL / 0 rather
-- than keeping whatever the seed put there (022's backfill had the same
-- coverage).

DO $$
DECLARE
  v_id uuid;
BEGIN
  FOR v_id IN SELECT id FROM public.handymen LOOP
    PERFORM public.recompute_trust_score(v_id);
  END LOOP;
END;
$$;

-- ---------------------------------------------------------------------------
-- 5. search_nearest_handymen — expose trust_score + review_count
-- ---------------------------------------------------------------------------
-- Changing the RETURN TABLE shape requires DROP (CREATE OR REPLACE cannot
-- alter a function's return type). CASCADE also drops notify_nearby_handymen,
-- which depends on this function — recreate it below with an identical body.
-- Body keeps 016's NULL-category handling ("All Services").

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
-- Identical to 012, including the FROM PUBLIC revoke.

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

REVOKE EXECUTE ON FUNCTION public.notify_nearby_handymen(uuid) FROM PUBLIC;