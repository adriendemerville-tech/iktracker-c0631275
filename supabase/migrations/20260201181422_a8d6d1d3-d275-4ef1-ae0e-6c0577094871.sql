-- Function to get user stats for admin panel
CREATE OR REPLACE FUNCTION public.get_user_stats(_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
  user_trips_count int;
  user_total_km float;
  user_total_ik float;
  user_vehicles_count int;
  user_tours_count int;
  user_shares_count int;
  first_trip_date date;
  last_trip_date date;
BEGIN
  -- Only admins can call this
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  -- Get trip stats
  SELECT 
    COUNT(*),
    COALESCE(SUM(distance), 0),
    COALESCE(SUM(ik_amount), 0),
    MIN(date),
    MAX(date)
  INTO user_trips_count, user_total_km, user_total_ik, first_trip_date, last_trip_date
  FROM public.trips
  WHERE user_id = _user_id AND deleted_at IS NULL;

  -- Get vehicles count
  SELECT COUNT(*) INTO user_vehicles_count
  FROM public.vehicles
  WHERE user_id = _user_id;

  -- Get tours count (trips with tour_stops)
  SELECT COUNT(*) INTO user_tours_count
  FROM public.trips
  WHERE user_id = _user_id 
    AND tour_stops IS NOT NULL 
    AND deleted_at IS NULL;

  -- Get shares count
  SELECT COUNT(*) INTO user_shares_count
  FROM public.share_events
  WHERE user_id = _user_id;

  result := json_build_object(
    'total_trips', user_trips_count,
    'total_km', ROUND(user_total_km::numeric, 1),
    'total_ik', ROUND(user_total_ik::numeric, 2),
    'vehicles_count', user_vehicles_count,
    'tours_count', user_tours_count,
    'shares_count', user_shares_count,
    'first_trip_date', first_trip_date,
    'last_trip_date', last_trip_date
  );

  RETURN result;
END;
$$;