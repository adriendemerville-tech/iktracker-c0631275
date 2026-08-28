SELECT cron.schedule(
  'forum-bot-tick-hourly',
  '17 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://project--5bbd6f17-49e4-4066-9f35-29e062baefea.lovable.app/api/public/forum-bot-tick',
    headers := '{"Content-Type": "application/json", "x-cron-secret": "2e450a8478d1005d8d2861bfe671a0ec9357d0a8f0aba12a901412947a9101d4"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);