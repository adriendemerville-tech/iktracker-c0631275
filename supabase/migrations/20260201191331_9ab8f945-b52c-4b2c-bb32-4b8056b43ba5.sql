-- Fix get_admin_stats to filter by trip date instead of created_at
CREATE OR REPLACE FUNCTION public.get_admin_stats(start_date date DEFAULT NULL::date, end_date date DEFAULT NULL::date)
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

  -- Count unique users from trips table within date range, excluding admins
  -- Use trip date (not created_at) for filtering
  SELECT COUNT(DISTINCT t.user_id) INTO total_users 
  FROM public.trips t
  WHERE t.deleted_at IS NULL
    AND t.date >= filter_start 
    AND t.date <= filter_end
    AND NOT EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = t.user_id AND ur.role = 'admin'
    );
  
  -- Get trip stats within date range, excluding admin trips
  -- Use trip date (not created_at) for filtering
  SELECT 
    COUNT(*),
    COALESCE(SUM(t.distance), 0),
    COALESCE(SUM(t.ik_amount), 0)
  INTO total_trips, total_km, total_ik
  FROM public.trips t
  WHERE t.deleted_at IS NULL
    AND t.date >= filter_start 
    AND t.date <= filter_end
    AND NOT EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = t.user_id AND ur.role = 'admin'
    );

  result := json_build_object(
    'total_users', total_users,
    'total_trips', total_trips,
    'total_km', total_km,
    'total_ik', total_ik
  );

  RETURN result;
END;
$$;