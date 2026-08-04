-- ============================================================================
-- 021: pin server-owned columns, and gate the dispatch read on KYC
-- ============================================================================
--
-- Three gaps found reviewing 015. All three are the same mistake: a policy that
-- pinned the one column it was written to pin and left its neighbours writable.
-- RLS is the whole authorization boundary here — PostgREST exposes these tables
-- to `authenticated` directly and 018 grants UPDATE on both — so an unpinned
-- column is a client-writable column.
--
-- This is a separate migration rather than an edit to 015 on purpose: 015 may
-- already be applied somewhere, and the CLI would not re-run an edited file.
-- Every statement here is idempotent, so it converges either way.
--
-- Nothing legitimate loses a write. Verified before pinning:
--   * handymen_admin_update and users_admin_all are separate permissive policies,
--     and permissive policies OR together — the admin KYC/suspension flows are
--     unaffected.
--   * the only SQL that writes wallet_balance is execute_payment_transaction,
--     whose EXECUTE is granted to service_role alone (012:285) and whose only
--     caller is payment-webhook on a service-role client. service_role bypasses
--     RLS, so payment capture is unaffected.
--   * no trigger on reviews recalculates trust_score/review_count — in fact
--     nothing writes either column today, which is its own gap, filed separately.

-- ---------------------------------------------------------------------------
-- 1. handymen: money and reputation are server-owned
-- ---------------------------------------------------------------------------
--
-- 015 pinned kyc_status only. wallet_balance, trust_score, review_count,
-- jobs_completed, membership_tier and response_time_avg were all writable with
-- an ordinary user JWT:
--
--   PATCH /rest/v1/handymen?id=eq.<self>  {"wallet_balance": 9999999}
--
-- earningsService reads wallet_balance as the authoritative payout balance, and
-- execute_payment_transaction accumulates onto it (balance + net_amount), so a
-- forged value is permanent and compounds into every later capture. trust_score
-- and review_count are the rating get_booking_detail renders to clients.
--
-- Still writable, because the app legitimately writes them: bio, hourly_rate,
-- years_experience (updateHandymanProfile), is_online and last_seen_at
-- (handyman-status), certifications, location. Note upsert_handyman_location is
-- SECURITY DEFINER and writes handyman_locations, so it is unaffected either way.

-- The subquery reads the pre-statement snapshot under READ COMMITTED, so `prev`
-- is the committed row and the bare column names are the row being written —
-- the same mechanism 015 used to pin kyc_status, widened to its neighbours.
--
-- trust_score and response_time_avg are nullable, so they need IS NOT DISTINCT
-- FROM: a plain `=` yields NULL for NULL = NULL, the WITH CHECK reads that as
-- failure, and a handyman with no reviews yet could not edit their own bio.

DROP POLICY IF EXISTS handymen_update_own ON handymen;
CREATE POLICY handymen_update_own ON handymen
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM handymen prev
      WHERE prev.id = auth.uid()
        AND prev.kyc_status        =                  handymen.kyc_status
        AND prev.membership_tier   =                  handymen.membership_tier
        AND prev.review_count      =                  handymen.review_count
        AND prev.jobs_completed    =                  handymen.jobs_completed
        AND prev.wallet_balance    =                  handymen.wallet_balance
        AND prev.trust_score       IS NOT DISTINCT FROM handymen.trust_score
        AND prev.response_time_avg IS NOT DISTINCT FROM handymen.response_time_avg
    )
  );

-- ---------------------------------------------------------------------------
-- 2. users: user_status is an admin verdict, not a profile field
-- ---------------------------------------------------------------------------
--
-- 015 pinned user_type. AdminContext.suspendUser writes user_status = 'SUSPENDED'
-- on this table, so leaving it unpinned made every suspension self-reversible:
--
--   PATCH /rest/v1/users?id=eq.<self>  {"user_status": "ACTIVE"}
--
-- email is pinned too. Nothing in the app updates it after the initial insert
-- (UpdateUserProfileInput is full_name/phone/photo_url), and public.users.email
-- is what the admin console displays — it should not diverge from the auth
-- identity on the user's own say-so. full_name, phone and photo_url stay open.

-- All three pinned columns are NOT NULL, so plain equality is sufficient here.

DROP POLICY IF EXISTS users_update_own ON users;
CREATE POLICY users_update_own ON users
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM users prev
      WHERE prev.id = auth.uid()
        AND prev.user_type   = users.user_type
        AND prev.user_status = users.user_status
        AND prev.email       = users.email
    )
  );

-- ---------------------------------------------------------------------------
-- 3. list_available_bookings: require approved KYC
-- ---------------------------------------------------------------------------
--
-- The only checks were "authenticated" and "users.user_type = 'handyman'" — and
-- handle_new_user honours user_type from self-supplied signup metadata, so the
-- second one is attacker-controlled at registration. Combined with
-- handyman_services being self-insertable, that made this a live feed of client
-- names, addresses, descriptions and notes for anyone who could sign up:
--
--   1. sign up with user_type: 'handyman'
--   2. POST /rest/v1/handyman_services for a service in each category
--   3. POST /rest/v1/rpc/list_available_bookings
--
-- transition_booking_state already gates *accepting* on is_online and
-- kyc_status = 'APPROVED'; nothing gated the read. KYC is the meaningful gate:
-- it means a human reviewed a government ID. is_online is deliberately NOT
-- required — it is a UX toggle, and a handyman browsing work before going online
-- is legitimate.
--
-- Body is otherwise identical to 015. Note the `v_loc IS NULL` branch is
-- retained: nothing populates handyman_locations except the background location
-- task, so requiring a location here would empty the inbox for every handyman
-- who has not granted background permission. That bypass means proximity
-- filtering is inert for those accounts — a real bug, but a functional one, and
-- out of scope for this migration.

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

  -- Non-handymen and unapproved handymen get an empty set rather than an error:
  -- the client app calls this from a shared code path, and a handyman waiting on
  -- KYC should see an empty inbox, not a failure.
  IF NOT EXISTS (
    SELECT 1
    FROM users u
    JOIN handymen h ON h.id = u.id
    WHERE u.id = v_handyman_id
      AND u.user_type = 'handyman'
      AND h.kyc_status = 'APPROVED'
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
