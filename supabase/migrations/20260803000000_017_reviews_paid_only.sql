-- 017_reviews_paid_only.sql
-- Post-job ratings unlock only after a booking reaches PAID (escrow captured).
-- The previous policy allowed reviews on COMPLETED bookings too; the product
-- spec fires the rating prompt on the PAID state transition, so submissions
-- must be gated the same way. Kept in sync with backend/rls-policies/001_core_rls.sql.

DROP POLICY IF EXISTS reviews_insert_participant ON reviews;

CREATE POLICY reviews_insert_participant ON reviews
  FOR INSERT TO authenticated
  WITH CHECK (
    reviewer_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = booking_id
        AND b.status = 'PAID'
        AND (b.client_id = auth.uid() OR b.handyman_id = auth.uid())
    )
  );