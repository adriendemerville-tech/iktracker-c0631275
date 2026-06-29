
CREATE OR REPLACE FUNCTION public.get_recurring_trips_stats()
RETURNS TABLE(total_count bigint, day date, count bigint)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') AND NOT public.has_role(auth.uid(), 'viewer') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  WITH total AS (
    SELECT COUNT(*)::bigint AS c FROM public.recurring_trips
  ),
  days AS (
    SELECT (CURRENT_DATE - i)::date AS d
    FROM generate_series(0, 6) AS i
  ),
  per_day AS (
    SELECT (created_at AT TIME ZONE 'UTC')::date AS d, COUNT(*)::bigint AS c
    FROM public.recurring_trips
    WHERE created_at >= (CURRENT_DATE - INTERVAL '6 days')
    GROUP BY 1
  )
  SELECT (SELECT c FROM total) AS total_count,
         days.d AS day,
         COALESCE(per_day.c, 0)::bigint AS count
  FROM days
  LEFT JOIN per_day ON per_day.d = days.d
  ORDER BY days.d ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_recurring_trips_stats() TO authenticated;
