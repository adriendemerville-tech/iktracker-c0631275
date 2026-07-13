-- Retention job: keep marketing_analytics for 90 days.
CREATE OR REPLACE FUNCTION public.purge_old_marketing_analytics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.marketing_analytics
  WHERE created_at < now() - interval '90 days';
END;
$$;

REVOKE ALL ON FUNCTION public.purge_old_marketing_analytics() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.purge_old_marketing_analytics() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purge_old_marketing_analytics() TO service_role;

-- (Re)schedule the daily cron job.
DO $$
DECLARE
  jobid_var bigint;
BEGIN
  SELECT jobid INTO jobid_var FROM cron.job WHERE jobname = 'purge-marketing-analytics-daily';
  IF jobid_var IS NOT NULL THEN
    PERFORM cron.unschedule(jobid_var);
  END IF;
  PERFORM cron.schedule(
    'purge-marketing-analytics-daily',
    '15 3 * * *',
    $cron$ SELECT public.purge_old_marketing_analytics(); $cron$
  );
END $$;