-- ============================================================================
-- 019: stop the notification cron from posting at a hardcoded project
-- ============================================================================
--
-- Migrations 009 and 012 both scheduled 'process-upcoming-handyman-notifications'
-- at '* * * * *' with the worker URL written into the job body:
--
--   https://wvrhxxtvefeyynglfibq.supabase.co/functions/v1/notification-worker
--
-- Every environment that runs the migrations therefore schedules a per-minute
-- POST at that one project. A local `supabase db reset` starts hammering the
-- hosted deployment, and any future project gets someone else's worker instead
-- of its own.
--
-- The job now calls a wrapper that reads the base URL from the vault and does
-- nothing when it is absent, so an unconfigured stack is inert rather than
-- misdirected. Enabling it is a vault write, not another migration.
--
-- Configure once per environment (do NOT commit these values):
--   select vault.create_secret(
--     'https://<project-ref>.supabase.co/functions/v1', 'project_functions_url');
--   select vault.create_secret('<service-role-key>', 'service_role_key');

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION public.invoke_notification_worker()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_base_url text;
  v_key      text;
BEGIN
  -- A stack without supabase_vault has nothing to configure. Bailing here keeps
  -- it silent instead of logging a missing-relation error every minute.
  IF to_regclass('vault.decrypted_secrets') IS NULL THEN
    RETURN;
  END IF;

  SELECT decrypted_secret INTO v_base_url
  FROM vault.decrypted_secrets
  WHERE name = 'project_functions_url';

  SELECT decrypted_secret INTO v_key
  FROM vault.decrypted_secrets
  WHERE name = 'service_role_key';

  -- The worker runs with verify_jwt = false and compares the bearer against the
  -- service-role key itself, so a missing key is as disabling as a missing URL.
  IF v_base_url IS NULL OR v_key IS NULL THEN
    RETURN;
  END IF;

  PERFORM net.http_post(
    url := rtrim(v_base_url, '/') || '/notification-worker',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_key
    )
  );
END;
$$;

-- Only the cron job (which runs as the job owner) ever calls this. It reads a
-- service-role key, so no client role gets EXECUTE.
REVOKE ALL ON FUNCTION public.invoke_notification_worker() FROM PUBLIC;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'process-upcoming-handyman-notifications'
  ) THEN
    PERFORM cron.unschedule('process-upcoming-handyman-notifications');
  END IF;
END $$;

SELECT cron.schedule(
  'process-upcoming-handyman-notifications',
  '* * * * *',
  $$ SELECT public.invoke_notification_worker(); $$
);
