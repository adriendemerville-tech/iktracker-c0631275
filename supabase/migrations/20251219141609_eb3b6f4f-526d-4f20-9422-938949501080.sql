
CREATE OR REPLACE FUNCTION public.get_signup_clicks_by_day(start_date timestamp with time zone, end_date timestamp with time zone)
RETURNS TABLE(day date, clicks bigint)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    DATE(created_at) as day,
    COUNT(*) as clicks
  FROM marketing_analytics
  WHERE event_type = 'signup_click'
    AND created_at >= start_date
    AND created_at <= end_date
  GROUP BY DATE(created_at)
  ORDER BY day;
$$;
