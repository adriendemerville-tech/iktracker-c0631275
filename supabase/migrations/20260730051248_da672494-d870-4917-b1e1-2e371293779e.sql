SELECT cron.unschedule('linkedin-monthly-post');
SELECT cron.schedule(
  'linkedin-monthly-post',
  '0 7 1-7 * *',
  $$
  SELECT CASE WHEN extract(dow from now() at time zone 'utc') = 3 THEN
    net.http_post(
      url := 'https://yarjaudctshlxkatqgeb.supabase.co/functions/v1/linkedin-weekly-post',
      headers := '{"Content-Type": "application/json", "x-cron-secret": "2e450a8478d1005d8d2861bfe671a0ec9357d0a8f0aba12a901412947a9101d4"}'::jsonb,
      body := '{}'::jsonb
    )::text
  END;
  $$
);