-- ============================================================================
-- 015_core_rls_dispatch_realtime.sql
--
-- Three things the migration set was missing, all of which block running the
-- app against a real database:
--
--   1. Core RLS. The policies lived only in backend/rls-policies/001_core_rls.sql,
--      which is outside supabase/migrations — so `supabase db reset` produced a
--      schema with RLS *off* on users/handymen/bookings/etc. Migration 012 then
--      created policies on those tables that were inert. This folds the canonical
--      policy set in so the migrations are authoritative.
--   2. Dispatch read path. bookings_select_participant scopes reads to the client
--      and the assigned handyman. A PENDING booking has no handyman yet, so no
--      handyman could ever see an incoming request. list_available_bookings()
--      is the SECURITY DEFINER read path for the request inbox.
--   3. Realtime. bookings/booking_events were never added to the supabase_realtime
--      publication, so subscribeToBooking() never received anything.
--
-- Idempotent throughout: safe to re-run on an already-provisioned project.
-- ============================================================================

-- ─── 0. Fix: cancelling an unassigned booking violated a CHECK constraint ───
-- bookings_handyman_required_after_pending read
--   CHECK (status = 'PENDING' OR handyman_id IS NOT NULL)
-- but transition_booking_state's CANCEL is only legal *from* PENDING, and a
-- PENDING on-demand booking has no handyman yet. So every client cancel of an
-- unaccepted booking — the one case the FSM allows — failed on the constraint.
-- CANCELLED and REJECTED are terminal states that can legitimately have no
-- handyman; everything past PENDING still requires one.
ALTER TABLE public.bookings
  DROP CONSTRAINT IF EXISTS bookings_handyman_required_after_pending;
ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_handyman_required_after_pending
  CHECK (status IN ('PENDING', 'CANCELLED', 'REJECTED') OR handyman_id IS NOT NULL);

-- ─── 1. Enable RLS on the core tables ───────────────────────────────────────

ALTER TABLE public.users               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.handymen            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.handyman_services   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disputes            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_events      ENABLE ROW LEVEL SECURITY;

-- ─── users ──────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS users_select_own ON users;
CREATE POLICY users_select_own ON users
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR is_admin());

-- Broad reads are scoped to booking counterparties and searchable (online +
-- KYC-approved) handymen — never the whole table (emails/phones).
DROP POLICY IF EXISTS users_select_public ON users;
DROP POLICY IF EXISTS users_select_related ON users;
CREATE POLICY users_select_related ON users
  FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR is_admin()
    OR EXISTS (
      SELECT 1 FROM bookings b
      WHERE (b.client_id = auth.uid() AND b.handyman_id = users.id)
         OR (b.handyman_id = auth.uid() AND b.client_id = users.id)
    )
    OR EXISTS (
      SELECT 1 FROM handymen h
      WHERE h.id = users.id AND h.is_online = true AND h.kyc_status = 'APPROVED'
    )
  );

-- handle_new_user() creates the profile row on signup; this INSERT policy only
-- backstops the client-side ensureUserProfile() fallback. It can never mint an
-- admin — that stays a service-role-only operation.
DROP POLICY IF EXISTS users_insert_own ON users;
CREATE POLICY users_insert_own ON users
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid() AND user_type IN ('client', 'handyman'));

-- user_type is pinned to its current value: a user may edit their profile but
-- never promote themselves.
DROP POLICY IF EXISTS users_update_own ON users;
CREATE POLICY users_update_own ON users
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND user_type = (SELECT u.user_type FROM users u WHERE u.id = auth.uid())
  );

DROP POLICY IF EXISTS users_admin_all ON users;
CREATE POLICY users_admin_all ON users
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- ─── handymen ───────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS handymen_select_searchable ON handymen;
CREATE POLICY handymen_select_searchable ON handymen
  FOR SELECT TO authenticated
  USING (
    is_admin()
    OR id = auth.uid()
    OR (is_online = true AND kyc_status = 'APPROVED')
  );

DROP POLICY IF EXISTS handymen_insert_own ON handymen;
CREATE POLICY handymen_insert_own ON handymen
  FOR INSERT TO authenticated
  WITH CHECK (
    id = auth.uid()
    AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND user_type = 'handyman')
  );

-- kyc_status is pinned: only the admin review flow may change it.
DROP POLICY IF EXISTS handymen_update_own ON handymen;
CREATE POLICY handymen_update_own ON handymen
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND kyc_status = (SELECT h.kyc_status FROM handymen h WHERE h.id = auth.uid())
  );

DROP POLICY IF EXISTS handymen_admin_update ON handymen;
CREATE POLICY handymen_admin_update ON handymen
  FOR UPDATE TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- ─── services (read-only catalog) ───────────────────────────────────────────

DROP POLICY IF EXISTS services_select_all ON services;
CREATE POLICY services_select_all ON services
  FOR SELECT TO authenticated
  USING (is_active = true OR is_admin());

DROP POLICY IF EXISTS services_admin_write ON services;
CREATE POLICY services_admin_write ON services
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- ─── handyman_services ──────────────────────────────────────────────────────

DROP POLICY IF EXISTS handyman_services_select ON handyman_services;
CREATE POLICY handyman_services_select ON handyman_services
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS handyman_services_write_own ON handyman_services;
CREATE POLICY handyman_services_write_own ON handyman_services
  FOR INSERT TO authenticated
  WITH CHECK (
    handyman_id = auth.uid()
    AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND user_type = 'handyman')
  );

DROP POLICY IF EXISTS handyman_services_update_own ON handyman_services;
CREATE POLICY handyman_services_update_own ON handyman_services
  FOR UPDATE TO authenticated
  USING (handyman_id = auth.uid())
  WITH CHECK (handyman_id = auth.uid());

DROP POLICY IF EXISTS handyman_services_delete_own ON handyman_services;
CREATE POLICY handyman_services_delete_own ON handyman_services
  FOR DELETE TO authenticated
  USING (handyman_id = auth.uid());

DROP POLICY IF EXISTS handyman_services_admin ON handyman_services;
CREATE POLICY handyman_services_admin ON handyman_services
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- ─── bookings ───────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS bookings_select_participant ON bookings;
CREATE POLICY bookings_select_participant ON bookings
  FOR SELECT TO authenticated
  USING (
    is_admin()
    OR client_id = auth.uid()
    OR handyman_id = auth.uid()
  );

DROP POLICY IF EXISTS bookings_insert_client ON bookings;
CREATE POLICY bookings_insert_client ON bookings
  FOR INSERT TO authenticated
  WITH CHECK (
    client_id = auth.uid()
    AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND user_type = 'client')
    AND status = 'PENDING'
  );

-- Server-owned columns are pinned to their prior values; the only status change
-- a client may self-serve is PENDING -> CANCELLED. (Matches 012.)
DROP POLICY IF EXISTS bookings_update_client ON bookings;
CREATE POLICY bookings_update_client ON bookings
  FOR UPDATE TO authenticated
  USING (client_id = auth.uid())
  WITH CHECK (
    client_id = auth.uid()
    AND amount           = (SELECT b.amount           FROM bookings b WHERE b.id = bookings.id)
    AND platform_fee     = (SELECT b.platform_fee     FROM bookings b WHERE b.id = bookings.id)
    AND service_id       = (SELECT b.service_id       FROM bookings b WHERE b.id = bookings.id)
    AND client_id        = (SELECT b.client_id        FROM bookings b WHERE b.id = bookings.id)
    AND surge_multiplier = (SELECT b.surge_multiplier FROM bookings b WHERE b.id = bookings.id)
    AND handyman_id IS NOT DISTINCT FROM (SELECT b.handyman_id FROM bookings b WHERE b.id = bookings.id)
    AND (
      status = (SELECT b.status FROM bookings b WHERE b.id = bookings.id)
      OR (
        (SELECT b.status FROM bookings b WHERE b.id = bookings.id) = 'PENDING'
        AND status = 'CANCELLED'
      )
    )
  );

-- The assigned handyman may attach photos/notes but not move status or money;
-- lifecycle transitions go through transition_booking_state. (Matches 012.)
DROP POLICY IF EXISTS bookings_update_handyman ON bookings;
CREATE POLICY bookings_update_handyman ON bookings
  FOR UPDATE TO authenticated
  USING (
    handyman_id = auth.uid()
    AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND user_type = 'handyman')
  )
  WITH CHECK (
    handyman_id = auth.uid()
    AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND user_type = 'handyman')
    AND status       = (SELECT b.status       FROM bookings b WHERE b.id = bookings.id)
    AND amount       = (SELECT b.amount       FROM bookings b WHERE b.id = bookings.id)
    AND platform_fee = (SELECT b.platform_fee FROM bookings b WHERE b.id = bookings.id)
    AND client_id    = (SELECT b.client_id    FROM bookings b WHERE b.id = bookings.id)
    AND service_id   = (SELECT b.service_id   FROM bookings b WHERE b.id = bookings.id)
    AND handyman_id  = (SELECT b.handyman_id  FROM bookings b WHERE b.id = bookings.id)
  );

DROP POLICY IF EXISTS bookings_admin ON bookings;
CREATE POLICY bookings_admin ON bookings
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- ─── payments ───────────────────────────────────────────────────────────────
-- Writes are service-role only (webhook / Edge Functions): no INSERT/UPDATE
-- policy for the authenticated role.

DROP POLICY IF EXISTS payments_select_client ON payments;
CREATE POLICY payments_select_client ON payments
  FOR SELECT TO authenticated
  USING (client_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS payments_select_handyman ON payments;
CREATE POLICY payments_select_handyman ON payments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = payments.booking_id AND b.handyman_id = auth.uid()
    )
  );

-- ─── reviews ────────────────────────────────────────────────────────────────

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

-- ─── wallet_transactions (ledger: reads only) ───────────────────────────────

DROP POLICY IF EXISTS wallet_tx_select_own ON wallet_transactions;
CREATE POLICY wallet_tx_select_own ON wallet_transactions
  FOR SELECT TO authenticated
  USING (handyman_id = auth.uid() OR is_admin());

-- ─── disputes ───────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS disputes_select_participant ON disputes;
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

DROP POLICY IF EXISTS disputes_insert_participant ON disputes;
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

DROP POLICY IF EXISTS disputes_update_reporter ON disputes;
CREATE POLICY disputes_update_reporter ON disputes
  FOR UPDATE TO authenticated
  USING (reporter_id = auth.uid() AND status = 'OPEN')
  WITH CHECK (reporter_id = auth.uid() AND status = 'OPEN');

DROP POLICY IF EXISTS disputes_admin_resolve ON disputes;
CREATE POLICY disputes_admin_resolve ON disputes
  FOR UPDATE TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- ─── booking_events (immutable audit log) ───────────────────────────────────
-- INSERT is SECURITY DEFINER RPC only; no UPDATE/DELETE policies by design.

DROP POLICY IF EXISTS booking_events_select_participant ON booking_events;
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

-- ============================================================================
-- 2. Dispatch read path for the handyman request inbox
-- ============================================================================

-- A PENDING booking has handyman_id NULL, so bookings_select_participant hides
-- it from every handyman — there was no way to render an incoming request.
-- This runs as owner and returns only the fields the inbox needs, for bookings
-- matching a category the caller actually offers, within radius of their last
-- reported location. Handymen who have never reported a location still see the
-- pool (distance comes back NULL) so the app is testable without GPS.
CREATE OR REPLACE FUNCTION public.list_available_bookings(
  p_radius_meters double precision DEFAULT 50000
)
RETURNS TABLE (
  id                 uuid,
  client_id          uuid,
  handyman_id        uuid,
  service_id         uuid,
  booking_type       booking_type,
  status             booking_status,
  description        text,
  address_text       text,
  amount             numeric,
  platform_fee       numeric,
  net_amount         numeric,
  surge_multiplier   numeric,
  scheduled_at       timestamptz,
  request_expires_at timestamptz,
  before_photo_url   text,
  after_photo_url    text,
  notes              text,
  created_at         timestamptz,
  updated_at         timestamptz,
  service_category   service_category,
  client_name        text,
  distance_meters    double precision
)
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_handyman_id uuid := auth.uid();
  v_loc geography;
BEGIN
  IF v_handyman_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  -- Non-handymen get an empty set rather than an error: the client app calls
  -- this from a shared code path.
  IF NOT EXISTS (
    SELECT 1 FROM users u WHERE u.id = v_handyman_id AND u.user_type = 'handyman'
  ) THEN
    RETURN;
  END IF;

  SELECT hl.location INTO v_loc FROM handyman_locations hl WHERE hl.id = v_handyman_id;

  RETURN QUERY
  SELECT
    b.id, b.client_id, b.handyman_id, b.service_id, b.booking_type, b.status,
    b.description, b.address_text, b.amount, b.platform_fee, b.net_amount,
    b.surge_multiplier, b.scheduled_at, b.request_expires_at,
    b.before_photo_url, b.after_photo_url, b.notes, b.created_at, b.updated_at,
    s.category,
    u.full_name,
    CASE WHEN v_loc IS NULL THEN NULL::double precision
         ELSE st_distance(b.location, v_loc) END
  FROM bookings b
  JOIN services s ON s.id = b.service_id
  JOIN users u    ON u.id = b.client_id
  WHERE b.status = 'PENDING'
    AND b.handyman_id IS NULL
    AND (b.request_expires_at IS NULL OR b.request_expires_at > now())
    AND EXISTS (
      SELECT 1
      FROM handyman_services hs
      JOIN services s2 ON s2.id = hs.service_id
      WHERE hs.handyman_id = v_handyman_id
        AND s2.category = s.category
    )
    AND (v_loc IS NULL OR st_dwithin(b.location, v_loc, p_radius_meters))
    -- REJECT leaves the booking PENDING so it can be re-broadcast to other
    -- handymen. Without this, it would bounce straight back into the inbox of
    -- the handyman who just declined it.
    AND NOT EXISTS (
      SELECT 1 FROM booking_events be
      WHERE be.booking_id = b.id
        AND be.actor_id = v_handyman_id
        AND be.metadata ->> 'action' = 'REJECT'
    )
  ORDER BY b.created_at DESC
  LIMIT 50;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.list_available_bookings(double precision) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_available_bookings(double precision) TO authenticated;

-- ============================================================================
-- 3. Realtime publication
-- ============================================================================

-- subscribeToBooking() listens for booking_events INSERTs; nothing was ever
-- published, so a handyman's transition never reached the client's screen.
-- Realtime still applies RLS per subscriber, so this exposes nothing new.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'booking_events'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.booking_events;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'bookings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
  END IF;
END $$;

-- REPLICA IDENTITY FULL so realtime payloads carry the whole row (the default
-- only ships the primary key for UPDATEs).
ALTER TABLE public.bookings       REPLICA IDENTITY FULL;
ALTER TABLE public.booking_events REPLICA IDENTITY FULL;
