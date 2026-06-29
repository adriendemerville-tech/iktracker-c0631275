
SELECT vault.create_secret('c16tRVhJh-BkmMWZUUe7PeQfGGIp9BlgqPhXT152xjZoWtcsuQwgoT6_R2mB_j4v', 'recurring_trips_cron_token', 'Token sent to generate-recurring-trips edge function by pg_cron');

DO $$
DECLARE
  v_jobid bigint;
BEGIN
  SELECT jobid INTO v_jobid FROM cron.job WHERE jobname = 'generate-recurring-trips-daily';
  IF v_jobid IS NOT NULL THEN
    PERFORM cron.unschedule(v_jobid);
  END IF;
END $$;

SELECT cron.schedule(
  'generate-recurring-trips-daily',
  '0 5 * * *',
  $$
  SELECT net.http_post(
    url := 'https://yarjaudctshlxkatqgeb.supabase.co/functions/v1/generate-recurring-trips',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlhcmphdWRjdHNobHhrYXRxZ2ViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4NzY2NTIsImV4cCI6MjA4MTQ1MjY1Mn0.FRJSAOY3ruERComZ0QeEyQNK_yNzsS3XwR4qBRsNZWI',
      'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'recurring_trips_cron_token' LIMIT 1)
    ),
    body := '{}'::jsonb
  );
  $$
);
