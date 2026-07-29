-- ============================================================================
-- 018 — table privileges for the authenticated role
--
-- On a fresh `supabase db reset` the authenticated role held only
-- REFERENCES/TRIGGER/TRUNCATE on every table in public — no SELECT, INSERT,
-- UPDATE or DELETE anywhere. PostgREST runs as authenticated, so every read
-- and write from the app failed with:
--
--   42501 permission denied for table bookings
--
-- The tables are created by migration 001, which runs outside the session
-- Supabase's ALTER DEFAULT PRIVILEGES applies to, so the usual grants never
-- landed. Nothing in migrations 001–017 grants them either; the RLS policies
-- added in 015 silently presupposed privileges that were not there.
--
-- Grants are the coarse gate, RLS is the authorization. So these are scoped to
-- the commands each table actually has a policy for — granting UPDATE on a
-- table whose only policy is SELECT would be a privilege with no gate behind
-- it if a policy were ever added carelessly later.
--
-- Deliberately NOT granted:
--   * anon — the app authenticates before it touches any table.
--   * notification_queue, kyc_rate_limits — RLS on with zero policies, i.e.
--     service-role only. Grants here would be the first crack.
--   * INSERT/UPDATE/DELETE on booking_events, payments, wallet_transactions —
--     those are written by the FSM trigger and Edge Functions under the
--     service role. The client only ever reads them.
--   * DELETE on bookings — no code path deletes a booking and the FKs are
--     ON DELETE RESTRICT. The admin FOR ALL policy loses nothing it uses.
-- ============================================================================

-- Reference data
GRANT SELECT, INSERT, UPDATE, DELETE ON public.services            TO authenticated;

-- Identity and profile
GRANT SELECT, INSERT, UPDATE         ON public.users               TO authenticated;
GRANT SELECT, INSERT, UPDATE         ON public.handymen            TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.handyman_services   TO authenticated;
GRANT SELECT, INSERT, UPDATE         ON public.handyman_locations   TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kyc_documents       TO authenticated;

-- Bookings
GRANT SELECT, INSERT, UPDATE         ON public.bookings            TO authenticated;
GRANT SELECT                         ON public.booking_events      TO authenticated;

-- Money — read-only from the client
GRANT SELECT                         ON public.payments            TO authenticated;
GRANT SELECT                         ON public.wallet_transactions TO authenticated;

-- Post-job
GRANT SELECT, INSERT, UPDATE         ON public.reviews             TO authenticated;
GRANT SELECT, INSERT, UPDATE         ON public.disputes            TO authenticated;
