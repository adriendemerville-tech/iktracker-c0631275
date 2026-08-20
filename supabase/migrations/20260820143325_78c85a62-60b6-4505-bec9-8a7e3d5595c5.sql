CREATE TABLE IF NOT EXISTS public.indexing_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text NOT NULL,
  provider text NOT NULL CHECK (provider IN ('google','indexnow')),
  status text NOT NULL DEFAULT 'success',
  http_status integer,
  response text,
  content_updated_at timestamptz,
  submitted_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_indexing_submissions_lookup
  ON public.indexing_submissions (provider, url, content_updated_at);
CREATE INDEX IF NOT EXISTS idx_indexing_submissions_submitted
  ON public.indexing_submissions (submitted_at DESC);

GRANT SELECT ON public.indexing_submissions TO authenticated;
GRANT ALL ON public.indexing_submissions TO service_role;

ALTER TABLE public.indexing_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins and viewers can read indexing submissions" ON public.indexing_submissions;
CREATE POLICY "Admins and viewers can read indexing submissions"
  ON public.indexing_submissions
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'viewer'));

DO $$
DECLARE c text; sec text;
BEGIN
  SELECT command INTO c FROM cron.job WHERE command LIKE '%x-cron-secret%' LIMIT 1;
  sec := (regexp_match(c, '"x-cron-secret":\s*"([^"]+)"'))[1];

  IF sec IS NULL THEN
    RAISE NOTICE 'No cron secret found, skipping schedule creation';
    RETURN;
  END IF;

  PERFORM cron.unschedule('submit-indexing-daily')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'submit-indexing-daily');

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