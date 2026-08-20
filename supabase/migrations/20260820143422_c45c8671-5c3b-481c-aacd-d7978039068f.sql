DO $$
DECLARE c text; sec text;
BEGIN
  SELECT command INTO c FROM cron.job WHERE jobid = 11;
  sec := (regexp_match(c, '"x-cron-secret":\s*"([^"]+)"'))[1];

  IF sec IS NULL THEN
    RAISE EXCEPTION 'cron secret introuvable';
  END IF;

  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'submit-indexing-daily') THEN
    PERFORM cron.unschedule('submit-indexing-daily');
  END IF;

  PERFORM cron.schedule(
    'submit-indexing-daily',
    '5 6 * * *',
    format($cmd$
      SELECT net.http_post(
        url := 'https://iktracker.fr/api/public/submit-indexing',
        headers := jsonb_build_object('Content-Type','application/json','x-cron-secret',%L),
        body := '{"sinceHours":26}'::jsonb
      );
    $cmd$, sec)
  );
END $$;