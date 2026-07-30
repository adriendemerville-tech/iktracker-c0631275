DO $$
DECLARE c text; sec text;
BEGIN
  SELECT command INTO c FROM cron.job WHERE jobid = 75;
  sec := (regexp_match(c, '"x-cron-secret":\s*"([^"]+)"'))[1];
  PERFORM net.http_post(
    url := 'https://yarjaudctshlxkatqgeb.supabase.co/functions/v1/linkedin-weekly-post',
    headers := jsonb_build_object('Content-Type','application/json','x-cron-secret',sec),
    body := '{}'::jsonb
  );
END $$;