-- Create a function to get admin statistics (requires service role for auth.users count)
-- This function uses SECURITY DEFINER to access stats

CREATE OR REPLACE FUNCTION public.get_admin_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
  total_users int;
  total_trips int;
  total_km float;
  total_ik float;
BEGIN
  -- Only admins can call this
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  -- Count unique users from trips table (approximation of active users)
  SELECT COUNT(DISTINCT user_id) INTO total_users FROM public.trips;
  
  -- Get trip stats
  SELECT 
    COUNT(*),
    COALESCE(SUM(distance), 0),
    COALESCE(SUM(ik_amount), 0)
  INTO total_trips, total_km, total_ik
  FROM public.trips;

  result := json_build_object(
    'total_users', total_users,
    'total_trips', total_trips,
    'total_km', total_km,
    'total_ik', total_ik
  );

  RETURN result;
END;
$$;

-- Create a function to get new registrations by day (based on first trip creation)
CREATE OR REPLACE FUNCTION public.get_registrations_by_day(days_back int DEFAULT 30)
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
  WITH first_trips AS (
    SELECT 
      user_id,
      MIN(created_at::date) as first_activity
    FROM public.trips
    GROUP BY user_id
  )
  SELECT 
    d.day::date,
    COUNT(f.user_id)
  FROM generate_series(
    CURRENT_DATE - days_back,
    CURRENT_DATE,
    '1 day'::interval
  ) AS d(day)
  LEFT JOIN first_trips f ON f.first_activity = d.day::date
  GROUP BY d.day
  ORDER BY d.day;
END;
$$;