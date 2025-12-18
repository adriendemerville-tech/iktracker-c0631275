-- Function to get top users by trips or distance
CREATE OR REPLACE FUNCTION public.get_top_users(
  sort_by text DEFAULT 'trips',
  limit_count integer DEFAULT 10
)
RETURNS TABLE(
  user_id uuid,
  total_trips bigint,
  total_km numeric,
  total_ik numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only admins can call this
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  RETURN QUERY
  SELECT 
    t.user_id,
    COUNT(*)::bigint as total_trips,
    ROUND(COALESCE(SUM(t.distance), 0)::numeric, 0) as total_km,
    ROUND(COALESCE(SUM(t.ik_amount), 0)::numeric, 2) as total_ik
  FROM public.trips t
  GROUP BY t.user_id
  ORDER BY 
    CASE WHEN sort_by = 'trips' THEN COUNT(*) END DESC NULLS LAST,
    CASE WHEN sort_by = 'km' THEN SUM(t.distance) END DESC NULLS LAST,
    CASE WHEN sort_by = 'ik' THEN SUM(t.ik_amount) END DESC NULLS LAST
  LIMIT limit_count;
END;
$$;