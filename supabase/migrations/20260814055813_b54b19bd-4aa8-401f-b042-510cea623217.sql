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
      AND COALESCE(jsonb_array_length(tour_stops), 0) < 2
  )
  UPDATE public.trips t
  SET
    start_location = COALESCE(
      NULLIF(t.start_location, ''),
      NULLIF(c.tour_stops->0->>'city', ''),
      NULLIF(c.tour_stops->0->>'address', ''),
      t.start_location
    ),
    start_address = COALESCE(NULLIF(t.start_address, ''), NULLIF(c.tour_stops->0->>'address', ''), t.start_address),
    start_lat = COALESCE(t.start_lat, NULLIF(c.tour_stops->0->>'lat', '')::double precision),
    start_lng = COALESCE(t.start_lng, NULLIF(c.tour_stops->0->>'lng', '')::double precision),
    tour_stops = NULL
  FROM candidates c
  WHERE t.id = c.id;

  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;

DROP FUNCTION IF EXISTS public.get_total_tours_count(timestamp with time zone, timestamp with time zone);