-- 004_kyc_rate_limits.sql
-- Rate limit tracking for KYC uploads (upsert-based, no cleanup needed)

CREATE TABLE IF NOT EXISTS kyc_rate_limits (
  handyman_id UUID NOT NULL,
  window_start TIMESTAMPTZ NOT NULL DEFAULT date_trunc('minute', now()),
  count INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (handyman_id, window_start)
);

-- Atomic rate-limit check + increment (single round-trip from app code)
CREATE OR REPLACE FUNCTION kyc_check_rate_limit(p_handyman_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  cur int;
  win constant timestamptz := date_trunc('minute', now());
BEGIN
  INSERT INTO kyc_rate_limits (handyman_id, window_start, count)
  VALUES (p_handyman_id, win, 1)
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
