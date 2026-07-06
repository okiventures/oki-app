-- Drop old function overloads that were replaced by 010_security_fixes.sql.
-- CREATE OR REPLACE FUNCTION with a different parameter list leaves the old
-- overload alive — these must be explicitly dropped.

drop function if exists public.upsert_handyman_location(uuid, double precision, double precision);
drop function if exists public.create_booking(uuid, uuid, booking_type, text, text, double precision, double precision, numeric, numeric, timestamptz, text);
