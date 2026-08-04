-- 017_review_flags.sql
-- Oki Handyman Marketplace — review moderation
-- Enables RLS on `reviews` and adds a `review_flags` table so any authenticated
-- user can flag a review for moderation. Flagged reviews are hidden from public
-- profiles immediately (is_hidden = true) pending an admin decision.

-- ---------------------------------------------------------------------------
-- reviews RLS (mirrors backend/rls-policies/001_core_rls.sql)
-- ---------------------------------------------------------------------------

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS reviews_select_visible ON reviews;
CREATE POLICY reviews_select_visible ON reviews
  FOR SELECT TO authenticated
  USING (is_hidden = false OR reviewer_id = auth.uid() OR reviewee_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS reviews_insert_participant ON reviews;
CREATE POLICY reviews_insert_participant ON reviews
  FOR INSERT TO authenticated
  WITH CHECK (
    reviewer_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = booking_id
        AND b.status IN ('COMPLETED', 'PAID')
        AND (b.client_id = auth.uid() OR b.handyman_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS reviews_admin_moderate ON reviews;
CREATE POLICY reviews_admin_moderate ON reviews
  FOR UPDATE TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- ---------------------------------------------------------------------------
-- review_flags
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS review_flags (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id     UUID NOT NULL REFERENCES reviews (id) ON DELETE CASCADE,
  flagger_id    UUID NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  reason        TEXT NOT NULL CHECK (length(reason) > 0),
  status        TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'RESOLVED', 'DISMISSED')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at   TIMESTAMPTZ,
  resolved_by   UUID REFERENCES users (id)
);

-- A flagger may only have one open flag per review.
CREATE UNIQUE INDEX IF NOT EXISTS idx_review_flags_unique_pending
  ON review_flags (review_id, flagger_id)
  WHERE status = 'PENDING';

CREATE INDEX IF NOT EXISTS idx_review_flags_status
  ON review_flags (status, created_at DESC)
  WHERE status = 'PENDING';

-- ---------------------------------------------------------------------------
-- RLS on review_flags
-- ---------------------------------------------------------------------------

ALTER TABLE review_flags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS review_flags_select ON review_flags;
CREATE POLICY review_flags_select ON review_flags
  FOR SELECT TO authenticated
  USING (flagger_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS review_flags_insert ON review_flags;
CREATE POLICY review_flags_insert ON review_flags
  FOR INSERT TO authenticated
  WITH CHECK (flagger_id = auth.uid());

DROP POLICY IF EXISTS review_flags_admin_update ON review_flags;
CREATE POLICY review_flags_admin_update ON review_flags
  FOR UPDATE TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- ---------------------------------------------------------------------------
-- Trigger: hide a review from public profiles as soon as it is flagged
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION hide_review_on_flag()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE reviews SET is_hidden = true WHERE id = NEW.review_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_hide_review_on_flag ON review_flags;
CREATE TRIGGER trg_hide_review_on_flag
  AFTER INSERT ON review_flags
  FOR EACH ROW
  EXECUTE FUNCTION hide_review_on_flag();
