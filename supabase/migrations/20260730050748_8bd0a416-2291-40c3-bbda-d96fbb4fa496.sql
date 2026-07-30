CREATE TABLE IF NOT EXISTS public.linkedin_style_samples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content text NOT NULL,
  note text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.linkedin_style_samples TO authenticated;
GRANT ALL ON public.linkedin_style_samples TO service_role;

ALTER TABLE public.linkedin_style_samples ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage linkedin style samples" ON public.linkedin_style_samples;
CREATE POLICY "Admins manage linkedin style samples"
ON public.linkedin_style_samples FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Fix cadence: pg_cron ORs day-of-month and day-of-week when both are restricted,
-- which made "0 7 1-7 * 3" fire every Wednesday AND every 1st-7th day.
SELECT cron.unschedule('linkedin-weekly-post');
SELECT cron.schedule(
  'linkedin-monthly-post',
  '0 7 1-7 * *',
  $$
  SELECT CASE WHEN extract(dow from now() at time zone 'utc') = 3 THEN
    net.http_post(
      url := 'https://yarjaudctshlxkatqgeb.supabase.co/functions/v1/linkedin-weekly-post',
      headers := '{"Content-Type": "application/json", "x-cron-secret": "2e450a8478d1005"}'::jsonb,
      body := '{}'::jsonb
    )::text
  END;
  $$
);