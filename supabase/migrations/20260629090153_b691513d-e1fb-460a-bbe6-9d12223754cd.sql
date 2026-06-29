
SELECT cron.schedule(
  'generate-recurring-trips-daily',
  '0 5 * * *',
  $$
  SELECT net.http_post(
    url := 'https://yarjaudctshlxkatqgeb.supabase.co/functions/v1/generate-recurring-trips',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1)
    ),
    body := '{}'::jsonb
  );
  $$
);
