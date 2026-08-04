-- ============================================================================
-- 022: recompute handymen.trust_score and review_count from reviews
-- ============================================================================
--
-- Filed as a gap while writing 021: nothing anywhere wrote either column. Every
-- handyman's rating was whatever the seed put there, and 0.0 / no reviews for
-- anyone who signed up. get_booking_detail (017) and the handyman profile screen
-- both render these, so the number clients used to pick a handyman was fiction.
--
-- The trigger has to be SECURITY DEFINER. 021 pins trust_score and review_count
-- in handymen_update_own, and a trigger function runs under the role that fired
-- it, so an ordinary client posting a review would have its own UPDATE rejected
-- by that WITH CHECK. Owned by the migration role, the function is the table
-- owner and RLS does not apply.
--
-- This is a plain average over visible reviews. The weighted rolling average of
-- the last 50 is a Week 13 item; when it lands it replaces the body of
-- recalculate_handyman_rating() and nothing else has to change.

-- ---------------------------------------------------------------------------
-- 1. the recompute
-- ---------------------------------------------------------------------------
--
-- Recomputes from scratch rather than incrementing. Slower, but it cannot drift,
-- and it means the backfill below is the same code path as the trigger.
--
-- is_hidden = false matches idx_reviews_reviewee, so this stays an index-only
-- scan, and it means an admin hiding an abusive review drops it out of the score.
--
-- No visible reviews leaves trust_score NULL rather than 0. The column's CHECK
-- allows NULL or 1..5, and NULL is what "unrated" means everywhere else in the
-- schema. A 0 would both violate the CHECK and read as a terrible handyman.

CREATE OR REPLACE FUNCTION public.recalculate_handyman_rating(p_handyman_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER SET search_path = public
AS $$
  UPDATE handymen h
  SET trust_score  = agg.avg_rating,
      review_count = agg.total,
      updated_at   = now()
  FROM (
    SELECT round(avg(r.rating), 2) AS avg_rating,
           count(*)                AS total
    FROM reviews r
    WHERE r.reviewee_id = p_handyman_id
      AND r.is_hidden = false
  ) AS agg
  WHERE h.id = p_handyman_id;
$$;

REVOKE EXECUTE ON FUNCTION public.recalculate_handyman_rating(uuid) FROM PUBLIC;

-- ---------------------------------------------------------------------------
-- 2. the trigger
-- ---------------------------------------------------------------------------
--
-- Fires on is_hidden and rating edits as well as inserts, and on both the old
-- and the new reviewee so that repointing a review moves the score off the
-- handyman who no longer owns it.
--
-- The UPDATE above is a no-op when the reviewee is a client, since there is no
-- handymen row to match. Reviews are two-way, so roughly half the rows here are
-- client-directed and this is the cheap way to skip them.

CREATE OR REPLACE FUNCTION public.reviews_sync_handyman_rating()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF TG_OP <> 'INSERT' THEN
    PERFORM recalculate_handyman_rating(OLD.reviewee_id);
  END IF;

  IF TG_OP <> 'DELETE' AND (TG_OP = 'INSERT' OR NEW.reviewee_id <> OLD.reviewee_id) THEN
    PERFORM recalculate_handyman_rating(NEW.reviewee_id);
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS reviews_sync_handyman_rating ON public.reviews;
CREATE TRIGGER reviews_sync_handyman_rating
  AFTER INSERT OR UPDATE OF rating, is_hidden, reviewee_id OR DELETE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.reviews_sync_handyman_rating();

-- ---------------------------------------------------------------------------
-- 3. backfill
-- ---------------------------------------------------------------------------
--
-- Covers every handyman, not just the ones with reviews, so the seeded scores
-- that were never derived from anything get replaced by the real figure (NULL
-- and 0 where there are no reviews).

DO $$
DECLARE
  v_id uuid;
BEGIN
  FOR v_id IN SELECT id FROM handymen LOOP
    PERFORM recalculate_handyman_rating(v_id);
  END LOOP;
END;
$$;
