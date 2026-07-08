-- Function that permanently deletes trips soft-deleted more than 120 days ago
CREATE OR REPLACE FUNCTION public.purge_old_deleted_trips()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  WITH purged AS (
    DELETE FROM public.trips
    WHERE deleted_at IS NOT NULL
      AND deleted_at < now() - interval '120 days'
    RETURNING id
  )
  SELECT count(*)::integer INTO deleted_count FROM purged;

  RETURN deleted_count;
END;
$$;

-- Remove any previous version of the job before re-scheduling
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'purge-old-deleted-trips') THEN
    PERFORM cron.unschedule('purge-old-deleted-trips');
  END IF;
END $$;

-- Schedule daily purge at 03:15 UTC
SELECT cron.schedule(
  'purge-old-deleted-trips',
  '15 3 * * *',
  $$ SELECT public.purge_old_deleted_trips(); $$
);