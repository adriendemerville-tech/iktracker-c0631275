-- Drop and recreate get_registrations_by_day to count actual user registrations from auth.users
CREATE OR REPLACE FUNCTION public.get_registrations_by_day(days_back integer DEFAULT 30)
RETURNS TABLE(day date, count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only admins can call this
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  RETURN QUERY
  SELECT 
    d.day::date,
    COUNT(u.id)
  FROM generate_series(
    CURRENT_DATE - days_back,
    CURRENT_DATE,
    '1 day'::interval
  ) AS d(day)
  LEFT JOIN auth.users u ON u.created_at::date = d.day::date
    AND NOT EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = u.id AND ur.role = 'admin'
    )
  GROUP BY d.day
  ORDER BY d.day;
END;
$$;