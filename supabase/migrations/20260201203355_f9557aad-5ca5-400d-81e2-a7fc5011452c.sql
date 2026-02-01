CREATE OR REPLACE FUNCTION public.get_user_stats(_user_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  has_takeout_import boolean;
  takeout_import_date timestamp with time zone;
  -- New: source breakdown
  calendar_trips_count int;
  manual_trips_count int;
  tour_trips_count int;
  calendar_pct numeric;
  manual_pct numeric;
  tour_pct numeric;
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

  -- Get calendar trips count (google_calendar or outlook_calendar)
  SELECT COUNT(*) INTO calendar_trips_count
  FROM public.trips
  WHERE user_id = _user_id 
    AND deleted_at IS NULL
    AND source IN ('google_calendar', 'outlook_calendar');

  -- Get manual trips count
  SELECT COUNT(*) INTO manual_trips_count
  FROM public.trips
  WHERE user_id = _user_id 
    AND deleted_at IS NULL
    AND (source = 'manual' OR source IS NULL);

  -- Get tour trips count
  SELECT COUNT(*) INTO tour_trips_count
  FROM public.trips
  WHERE user_id = _user_id 
    AND deleted_at IS NULL
    AND tour_stops IS NOT NULL;

  -- Calculate percentages (cast to numeric before ROUND)
  IF user_trips_count > 0 THEN
    calendar_pct := ROUND((calendar_trips_count::numeric / user_trips_count::numeric) * 100, 1);
    manual_pct := ROUND((manual_trips_count::numeric / user_trips_count::numeric) * 100, 1);
    tour_pct := ROUND((tour_trips_count::numeric / user_trips_count::numeric) * 100, 1);
  ELSE
    calendar_pct := 0;
    manual_pct := 0;
    tour_pct := 0;
  END IF;

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

  -- Check for successful takeout import
  SELECT 
    EXISTS(SELECT 1 FROM public.takeout_import_attempts WHERE user_id = _user_id AND status = 'success'),
    (SELECT created_at FROM public.takeout_import_attempts WHERE user_id = _user_id AND status = 'success' ORDER BY created_at DESC LIMIT 1)
  INTO has_takeout_import, takeout_import_date;

  result := json_build_object(
    'total_trips', user_trips_count,
    'total_km', ROUND(user_total_km::numeric, 1),
    'total_ik', ROUND(user_total_ik::numeric, 2),
    'vehicles_count', user_vehicles_count,
    'tours_count', user_tours_count,
    'shares_count', user_shares_count,
    'first_trip_date', first_trip_date,
    'last_trip_date', last_trip_date,
    'has_takeout_import', COALESCE(has_takeout_import, false),
    'takeout_import_date', takeout_import_date,
    -- New fields
    'calendar_trips_count', calendar_trips_count,
    'manual_trips_count', manual_trips_count,
    'tour_trips_count', tour_trips_count,
    'calendar_pct', calendar_pct,
    'manual_pct', manual_pct,
    'tour_pct', tour_pct
  );

  RETURN result;
END;
$function$;