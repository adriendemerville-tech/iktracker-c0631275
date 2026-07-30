
CREATE OR REPLACE FUNCTION public.demote_invalid_tours()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected integer;
BEGIN
  WITH candidates AS (
    SELECT id,
           tour_stops,
           COALESCE(jsonb_array_length(tour_stops), 0) AS n
    FROM public.trips
    WHERE deleted_at IS NULL
      AND tour_stops IS NOT NULL
      AND jsonb_typeof(tour_stops) = 'array'
      AND COALESCE(jsonb_array_length(tour_stops), 0) < 3
  )
  UPDATE public.trips t
  SET
    start_location = COALESCE(
      NULLIF(t.start_location, ''),
      NULLIF(c.tour_stops->0->>'city', ''),
      NULLIF(c.tour_stops->0->>'address', ''),
      t.start_location
    ),
    end_location = COALESCE(
      NULLIF(t.end_location, ''),
      CASE WHEN c.n >= 2 THEN NULLIF(c.tour_stops->(c.n - 1)->>'city', '') END,
      CASE WHEN c.n >= 2 THEN NULLIF(c.tour_stops->(c.n - 1)->>'address', '') END,
      t.end_location
    ),
    start_address = COALESCE(NULLIF(t.start_address, ''), NULLIF(c.tour_stops->0->>'address', ''), t.start_address),
    end_address = COALESCE(
      NULLIF(t.end_address, ''),
      CASE WHEN c.n >= 2 THEN NULLIF(c.tour_stops->(c.n - 1)->>'address', '') END,
      t.end_address
    ),
    start_lat = COALESCE(t.start_lat, NULLIF(c.tour_stops->0->>'lat', '')::double precision),
    start_lng = COALESCE(t.start_lng, NULLIF(c.tour_stops->0->>'lng', '')::double precision),
    end_lat = COALESCE(t.end_lat, CASE WHEN c.n >= 2 THEN NULLIF(c.tour_stops->(c.n - 1)->>'lat', '')::double precision END),
    end_lng = COALESCE(t.end_lng, CASE WHEN c.n >= 2 THEN NULLIF(c.tour_stops->(c.n - 1)->>'lng', '')::double precision END),
    tour_stops = NULL
  FROM candidates c
  WHERE t.id = c.id;

  GET DIAGNOSTICS affected = ROW_COUNT;
  RAISE NOTICE 'demote_invalid_tours: % trips demoted', affected;
  RETURN affected;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.demote_invalid_tours() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.demote_invalid_tours() TO service_role;

SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'demote-invalid-tours-daily';

SELECT cron.schedule(
  'demote-invalid-tours-daily',
  '20 3 * * *',
  $cron$ SELECT public.demote_invalid_tours(); $cron$
);

SELECT public.demote_invalid_tours();
