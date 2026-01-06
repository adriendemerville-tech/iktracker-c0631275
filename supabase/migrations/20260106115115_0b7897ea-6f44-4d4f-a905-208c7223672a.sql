-- Create a function to count total tours excluding admin users
CREATE OR REPLACE FUNCTION public.get_total_tours_count(start_date date DEFAULT NULL, end_date date DEFAULT NULL)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::integer
  FROM trips t
  WHERE t.tour_stops IS NOT NULL
    AND t.deleted_at IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.user_id = t.user_id 
      AND ur.role = 'admin'
    )
    AND (start_date IS NULL OR t.date >= start_date)
    AND (end_date IS NULL OR t.date <= end_date)
$$;