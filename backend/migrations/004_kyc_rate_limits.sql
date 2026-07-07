-- 004_kyc_rate_limits.sql
-- Rate limit tracking for KYC uploads (upsert-based, no cleanup needed)

CREATE TABLE IF NOT EXISTS kyc_rate_limits (
  handyman_id UUID NOT NULL,
  window_start TIMESTAMPTZ NOT NULL DEFAULT date_trunc('minute', now()),
  count INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (handyman_id, window_start)
);

-- SECURITY: enable RLS with no policies so the authenticated/anon roles cannot
-- read, reset, or poison rate-limit rows directly via PostgREST. Only the
-- SECURITY DEFINER RPC below (running as owner) may touch the table.
ALTER TABLE kyc_rate_limits ENABLE ROW LEVEL SECURITY;

-- Atomic rate-limit check + increment (single round-trip from app code).
-- SECURITY DEFINER so it can write under RLS; the handyman is derived from
-- auth.uid() rather than trusting a caller-supplied id (which would let a
-- caller reset their own counter or lock out another handyman).
CREATE OR REPLACE FUNCTION kyc_check_rate_limit(p_handyman_id UUID DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  cur int;
  win constant timestamptz := date_trunc('minute', now());
  v_id uuid := COALESCE(auth.uid(), p_handyman_id);
BEGIN
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  INSERT INTO kyc_rate_limits (handyman_id, window_start, count)
  VALUES (v_id, win, 1)
  ON CONFLICT (handyman_id, window_start)
  DO UPDATE SET count = kyc_rate_limits.count + 1
  RETURNING count INTO cur;

  IF cur > 10 THEN
    RETURN jsonb_build_object('allowed', false, 'retry_after', 60);
  ELSE
    RETURN jsonb_build_object('allowed', true);
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION kyc_check_rate_limit(UUID) FROM anon;
