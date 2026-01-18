-- Create function to get monthly stats for the last N months
CREATE OR REPLACE FUNCTION public.get_monthly_stats(months_back integer DEFAULT 5)
RETURNS TABLE (
  month text,
  total_users bigint,
  total_trips bigint,
  total_km double precision,
  total_ik double precision
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH months AS (
    SELECT 
      generate_series(
        date_trunc('month', CURRENT_DATE) - ((months_back - 1) || ' months')::interval,
        date_trunc('month', CURRENT_DATE),
        '1 month'::interval
      )::date as month_start
  ),
  monthly_trips AS (
    SELECT 
      date_trunc('month', t.date)::date as month_start,
      COUNT(*) as trip_count,
      COALESCE(SUM(t.distance), 0) as km_sum,
      COALESCE(SUM(t.ik_amount), 0) as ik_sum
    FROM trips t
    WHERE t.deleted_at IS NULL
      AND t.date >= date_trunc('month', CURRENT_DATE) - ((months_back - 1) || ' months')::interval
      AND NOT EXISTS (
        SELECT 1 FROM user_roles ur WHERE ur.user_id = t.user_id AND ur.role = 'admin'
      )
    GROUP BY date_trunc('month', t.date)::date
  ),
  monthly_users AS (
    SELECT 
      m.month_start,
      COUNT(DISTINCT t.user_id) as user_count
    FROM months m
    LEFT JOIN trips t ON date_trunc('month', t.date)::date = m.month_start
      AND t.deleted_at IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM user_roles ur WHERE ur.user_id = t.user_id AND ur.role = 'admin'
      )
    GROUP BY m.month_start
  )
  SELECT 
    to_char(m.month_start, 'Mon') as month,
    COALESCE(mu.user_count, 0) as total_users,
    COALESCE(mt.trip_count, 0) as total_trips,
    COALESCE(mt.km_sum, 0) as total_km,
    COALESCE(mt.ik_sum, 0) as total_ik
  FROM months m
  LEFT JOIN monthly_trips mt ON mt.month_start = m.month_start
  LEFT JOIN monthly_users mu ON mu.month_start = m.month_start
  ORDER BY m.month_start ASC;
$$;