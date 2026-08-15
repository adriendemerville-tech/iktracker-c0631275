SELECT cron.unschedule('generate-recurring-trips-daily');

SELECT cron.schedule(
  'generate-recurring-trips-daily',
  '0 5 * * *',
  $$
  SELECT net.http_post(
    url := 'https://yarjaudctshlxkatqgeb.supabase.co/functions/v1/generate-recurring-trips',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlhcmphdWRjdHNobHhrYXRxZ2ViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4NzY2NTIsImV4cCI6MjA4MTQ1MjY1Mn0.FRJSAOY3ruERComZ0QeEyQNK_yNzsS3XwR4qBRsNZWI", "x-cron-secret": "2e450a8478d1005d8d2861bfe671a0ec9357d0a8f0aba12a901412947a9101d4"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

SELECT net.http_post(
  url := 'https://yarjaudctshlxkatqgeb.supabase.co/functions/v1/generate-recurring-trips',
  headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlhcmphdWRjdHNobHhrYXRxZ2ViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4NzY2NTIsImV4cCI6MjA4MTQ1MjY1Mn0.FRJSAOY3ruERComZ0QeEyQNK_yNzsS3XwR4qBRsNZWI", "x-cron-secret": "2e450a8478d1005d8d2861bfe671a0ec9357d0a8f0aba12a901412947a9101d4"}'::jsonb,
  body := '{}'::jsonb
);