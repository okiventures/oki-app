-- 001_core_rls.sql
-- Row Level Security policies for core entities
-- Run after 001_core_schema.sql

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE handymen ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE handyman_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_events ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------

CREATE POLICY users_select_own ON users
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR is_admin());

CREATE POLICY users_select_public ON users
  FOR SELECT TO authenticated
  USING (user_status = 'ACTIVE');

CREATE POLICY users_update_own ON users
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND user_type = (SELECT user_type FROM users WHERE id = auth.uid())
  );

CREATE POLICY users_admin_all ON users
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- ---------------------------------------------------------------------------
-- handymen
-- ---------------------------------------------------------------------------

CREATE POLICY handymen_select_searchable ON handymen
  FOR SELECT TO authenticated
  USING (
    is_admin()
    OR id = auth.uid()
    OR (is_online = true AND kyc_status = 'APPROVED')
  );

CREATE POLICY handymen_insert_own ON handymen
  FOR INSERT TO authenticated
  WITH CHECK (
    id = auth.uid()
    AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND user_type = 'handyman')
  );

CREATE POLICY handymen_update_own ON handymen
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND kyc_status = (SELECT kyc_status FROM handymen WHERE id = auth.uid())
  );

CREATE POLICY handymen_admin_update ON handymen
  FOR UPDATE TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- ---------------------------------------------------------------------------
-- services (read-only for clients/handymen)
-- ---------------------------------------------------------------------------

CREATE POLICY services_select_all ON services
  FOR SELECT TO authenticated
  USING (is_active = true OR is_admin());

CREATE POLICY services_admin_write ON services
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- ---------------------------------------------------------------------------
-- handyman_services
-- ---------------------------------------------------------------------------

CREATE POLICY handyman_services_select ON handyman_services
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY handyman_services_write_own ON handyman_services
  FOR INSERT TO authenticated
  WITH CHECK (
    handyman_id = auth.uid()
    AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND user_type = 'handyman')
  );

CREATE POLICY handyman_services_update_own ON handyman_services
  FOR UPDATE TO authenticated
  USING (handyman_id = auth.uid())
  WITH CHECK (handyman_id = auth.uid());

CREATE POLICY handyman_services_delete_own ON handyman_services
  FOR DELETE TO authenticated
  USING (handyman_id = auth.uid());

CREATE POLICY handyman_services_admin ON handyman_services
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- ---------------------------------------------------------------------------
-- bookings
-- ---------------------------------------------------------------------------

CREATE POLICY bookings_select_participant ON bookings
  FOR SELECT TO authenticated
  USING (
    is_admin()
    OR client_id = auth.uid()
    OR handyman_id = auth.uid()
  );

CREATE POLICY bookings_insert_client ON bookings
  FOR INSERT TO authenticated
  WITH CHECK (
    client_id = auth.uid()
    AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND user_type = 'client')
    AND status = 'PENDING'
  );

CREATE POLICY bookings_update_client ON bookings
  FOR UPDATE TO authenticated
  USING (client_id = auth.uid())
  WITH CHECK (
    client_id = auth.uid()
    AND (
      status IN ('PENDING', 'CANCELLED')
      OR (SELECT status FROM bookings WHERE id = bookings.id) = status
    )
  );

CREATE POLICY bookings_update_handyman ON bookings
  FOR UPDATE TO authenticated
  USING (
    handyman_id = auth.uid()
    AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND user_type = 'handyman')
  )
  WITH CHECK (
    handyman_id = auth.uid()
    AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND user_type = 'handyman')
  );

CREATE POLICY bookings_admin ON bookings
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- ---------------------------------------------------------------------------
-- payments
-- ---------------------------------------------------------------------------

CREATE POLICY payments_select_client ON payments
  FOR SELECT TO authenticated
  USING (client_id = auth.uid() OR is_admin());

CREATE POLICY payments_select_handyman ON payments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = payments.booking_id AND b.handyman_id = auth.uid()
    )
  );

-- Writes restricted to service role (webhooks / Edge Functions)
-- No INSERT/UPDATE policies for authenticated role

-- ---------------------------------------------------------------------------
-- reviews
-- ---------------------------------------------------------------------------

CREATE POLICY reviews_select_visible ON reviews
  FOR SELECT TO authenticated
  USING (is_hidden = false OR reviewer_id = auth.uid() OR reviewee_id = auth.uid() OR is_admin());

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

CREATE POLICY reviews_admin_moderate ON reviews
  FOR UPDATE TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- ---------------------------------------------------------------------------
-- wallet_transactions
-- ---------------------------------------------------------------------------

CREATE POLICY wallet_tx_select_own ON wallet_transactions
  FOR SELECT TO authenticated
  USING (handyman_id = auth.uid() OR is_admin());

-- INSERT/UPDATE/DELETE: service role only (ledger RPC)

-- ---------------------------------------------------------------------------
-- disputes
-- ---------------------------------------------------------------------------

CREATE POLICY disputes_select_participant ON disputes
  FOR SELECT TO authenticated
  USING (
    is_admin()
    OR reporter_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = disputes.booking_id
        AND (b.client_id = auth.uid() OR b.handyman_id = auth.uid())
    )
  );

CREATE POLICY disputes_insert_participant ON disputes
  FOR INSERT TO authenticated
  WITH CHECK (
    reporter_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = booking_id
        AND (b.client_id = auth.uid() OR b.handyman_id = auth.uid())
    )
  );

CREATE POLICY disputes_update_reporter ON disputes
  FOR UPDATE TO authenticated
  USING (reporter_id = auth.uid() AND status = 'OPEN')
  WITH CHECK (reporter_id = auth.uid() AND status = 'OPEN');

CREATE POLICY disputes_admin_resolve ON disputes
  FOR UPDATE TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- ---------------------------------------------------------------------------
-- booking_events (immutable audit log)
-- ---------------------------------------------------------------------------

CREATE POLICY booking_events_select_participant ON booking_events
  FOR SELECT TO authenticated
  USING (
    is_admin()
    OR EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = booking_events.booking_id
        AND (b.client_id = auth.uid() OR b.handyman_id = auth.uid())
    )
  );

-- INSERT: SECURITY DEFINER RPC only (transition_booking_state)
-- No UPDATE or DELETE policies — immutable by design
