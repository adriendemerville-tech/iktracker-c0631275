
-- Update get_user_stats to include conversion page
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
  -- Source breakdown
  calendar_trips_count int;
  manual_trips_count int;
  tour_trips_count int;
  calendar_pct numeric;
  manual_pct numeric;
  tour_pct numeric;
  -- Unique active days count
  user_active_days int;
  -- Conversion page
  user_created_at timestamp with time zone;
  conversion_page text;
BEGIN
  -- Only admins can call this
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  -- Get user creation date from auth.users
  SELECT created_at INTO user_created_at
  FROM auth.users
  WHERE id = _user_id;

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

  -- Count unique active days (days where user performed any action)
  SELECT COUNT(DISTINCT activity_date) INTO user_active_days
  FROM (
    SELECT DATE(created_at) as activity_date FROM public.trips WHERE user_id = _user_id
    UNION
    SELECT DATE(shared_at) as activity_date FROM public.share_events WHERE user_id = _user_id
    UNION
    SELECT DATE(clicked_at) as activity_date FROM public.download_clicks WHERE user_id = _user_id
    UNION
    SELECT DATE(created_at) as activity_date FROM public.vehicles WHERE user_id = _user_id
    UNION
    SELECT DATE(updated_at) as activity_date FROM public.vehicles WHERE user_id = _user_id
    UNION
    SELECT DATE(created_at) as activity_date FROM public.marketing_analytics WHERE user_id = _user_id
    UNION
    SELECT DATE(created_at) as activity_date FROM public.feedback WHERE user_id = _user_id
    UNION
    SELECT DATE(created_at) as activity_date FROM public.calendar_connections WHERE user_id = _user_id
    UNION
    SELECT DATE(updated_at) as activity_date FROM public.calendar_connections WHERE user_id = _user_id
  ) all_activities;

  -- Find conversion page: last signup_click within 5 minutes before user registration
  IF user_created_at IS NOT NULL THEN
    SELECT ma.page INTO conversion_page
    FROM public.marketing_analytics ma
    WHERE ma.event_type = 'signup_click'
      AND ma.created_at >= (user_created_at - interval '5 minutes')
      AND ma.created_at <= user_created_at
    ORDER BY ma.created_at DESC
    LIMIT 1;
  END IF;

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
    'calendar_trips_count', calendar_trips_count,
    'manual_trips_count', manual_trips_count,
    'tour_trips_count', tour_trips_count,
    'calendar_pct', calendar_pct,
    'manual_pct', manual_pct,
    'tour_pct', tour_pct,
    'page_views', COALESCE(user_active_days, 0),
    'conversion_page', conversion_page
  );

  RETURN result;
END;
$function$;
