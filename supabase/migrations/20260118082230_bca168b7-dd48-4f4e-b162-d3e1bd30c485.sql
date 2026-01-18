-- Create function to get bareme simulations by day
CREATE OR REPLACE FUNCTION public.get_bareme_simulations_by_day(days_back integer DEFAULT 5)
RETURNS TABLE (
  day date,
  count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    DATE(created_at) as day,
    COUNT(*) as count
  FROM marketing_analytics
  WHERE event_type = 'simulation'
    AND (page LIKE '%bareme%' OR page LIKE '%barème%' OR page = 'bareme-ik' OR page = 'bareme-ik-2026')
    AND created_at >= CURRENT_DATE - (days_back || ' days')::interval
  GROUP BY DATE(created_at)
  ORDER BY day ASC;
$$;