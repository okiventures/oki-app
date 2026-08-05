-- ============================================================================
-- 024 — the table privileges 018 missed
--
-- Part 1: service_role, which 018 never covered at all.
-- Part 2: the two tables added after 018 ran, which no one granted since.
--
-- 018 fixed this for `authenticated` and the same hole was left for
-- `service_role`: on a fresh `supabase db reset` it holds only
-- REFERENCES/TRIGGER/TRUNCATE on every table in public. The tables come from
-- migration 001, which runs outside the session Supabase's ALTER DEFAULT
-- PRIVILEGES applies to, so the stock grants never landed for either role.
--
-- Edge Functions that reach a table with the service role key therefore fail,
-- and _shared/rbac.ts reports the failure as a role mismatch rather than a
-- permission error — its lookup returns 42501, sees a non-array body, and
-- answers "User is not a admin". Observed on a fresh stack:
--
--   review-flag-action   403 FORBIDDEN      "User is not a admin"    (is admin)
--   cancel-booking       403 FORBIDDEN      "User is not a client"   (is client)
--   flag-review          500 INTERNAL_ERROR "permission denied for table review_flags"
--
-- Nothing catches this earlier: CI never applies migrations, and the app's mock
-- mode never reaches an Edge Function.
--
-- Unlike 018 these are not scoped per command. service_role is the trusted
-- server identity, it bypasses RLS by design, and it owns every write the
-- client is deliberately denied — FSM booking_events, payments,
-- wallet_transactions, notification_queue, kyc_rate_limits. Stock Supabase
-- grants it the whole schema; this restores that rather than inventing a
-- narrower policy the Edge Functions would keep tripping over.
-- ============================================================================

GRANT ALL ON ALL TABLES    IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- Tables added by later migrations inherit the grant instead of reopening this
-- gap one table at a time.
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES    TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;

-- ── authenticated: the two tables created after 018 ─────────────────────────
--
-- 015 added availability_blocks and 017 added review_flags, both with RLS
-- policies and neither with a grant, so `authenticated` was left holding the
-- same REFERENCES/TRIGGER/TRUNCATE that 018 was written to fix. flag-review
-- returns 500 "permission denied for table review_flags" as a result.
--
-- Scoped per command like 018: exactly the commands each table has a policy
-- for, no more.
--
--   review_flags        select / insert / admin_update
--   availability_blocks select_visible / insert_own / update_own / delete_own
GRANT SELECT, INSERT, UPDATE         ON public.review_flags        TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.availability_blocks TO authenticated;
