-- Update get_admin_stats to accept date range filter
DROP FUNCTION IF EXISTS public.get_admin_stats();

CREATE OR REPLACE FUNCTION public.get_admin_stats(
  start_date date DEFAULT NULL,
  end_date date DEFAULT NULL
)
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
  filter_start date;
  filter_end date;
BEGIN
  -- Only admins can call this
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  -- Set default date range if not provided
  filter_start := COALESCE(start_date, '1900-01-01'::date);
  filter_end := COALESCE(end_date, CURRENT_DATE);

  -- Count unique users from trips table within date range
  SELECT COUNT(DISTINCT user_id) INTO total_users 
  FROM public.trips 
  WHERE created_at::date >= filter_start AND created_at::date <= filter_end;
  
  -- Get trip stats within date range
  SELECT 
    COUNT(*),
    COALESCE(SUM(distance), 0),
    COALESCE(SUM(ik_amount), 0)
  INTO total_trips, total_km, total_ik
  FROM public.trips
  WHERE created_at::date >= filter_start AND created_at::date <= filter_end;

  result := json_build_object(
    'total_users', total_users,
    'total_trips', total_trips,
    'total_km', total_km,
    'total_ik', total_ik
  );

  RETURN result;
END;
$$;