CREATE TABLE IF NOT EXISTS public.background_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  kind text NOT NULL,
  status text NOT NULL DEFAULT 'queued',
  phase text,
  progress integer NOT NULL DEFAULT 0,
  processed integer NOT NULL DEFAULT 0,
  total integer,
  params jsonb NOT NULL DEFAULT '{}'::jsonb,
  result jsonb,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  finished_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.background_jobs
  ADD CONSTRAINT background_jobs_status_check
  CHECK (status IN ('queued','running','succeeded','failed'));

CREATE INDEX IF NOT EXISTS background_jobs_user_kind_idx
  ON public.background_jobs (user_id, kind, created_at DESC);
CREATE INDEX IF NOT EXISTS background_jobs_running_idx
  ON public.background_jobs (status, updated_at) WHERE status IN ('queued','running');

GRANT SELECT ON public.background_jobs TO authenticated;
GRANT ALL ON public.background_jobs TO service_role;

ALTER TABLE public.background_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own jobs"
  ON public.background_jobs FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.touch_background_jobs_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS background_jobs_touch ON public.background_jobs;
CREATE TRIGGER background_jobs_touch
  BEFORE UPDATE ON public.background_jobs
  FOR EACH ROW EXECUTE FUNCTION public.touch_background_jobs_updated_at();

CREATE OR REPLACE FUNCTION public.cleanup_background_jobs()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  stale_count integer;
  purged_count integer;
BEGIN
  UPDATE public.background_jobs
  SET status = 'failed',
      error = COALESCE(error, 'Job interrompu (timeout serveur)'),
      finished_at = now()
  WHERE status IN ('queued','running')
    AND updated_at < now() - interval '30 minutes';
  GET DIAGNOSTICS stale_count = ROW_COUNT;

  DELETE FROM public.background_jobs
  WHERE created_at < now() - interval '30 days';
  GET DIAGNOSTICS purged_count = ROW_COUNT;

  RETURN jsonb_build_object('stale', stale_count, 'purged', purged_count);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.cleanup_background_jobs() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_background_jobs() TO service_role;

SELECT cron.unschedule('cleanup-background-jobs')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-background-jobs');

SELECT cron.schedule(
  'cleanup-background-jobs',
  '7 * * * *',
  $$SELECT public.cleanup_background_jobs();$$
);