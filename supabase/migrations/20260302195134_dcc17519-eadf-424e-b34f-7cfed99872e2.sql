
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
  calendar_trips_count int;
  manual_trips_count int;
  tour_trips_count int;
  calendar_pct numeric;
  manual_pct numeric;
  tour_pct numeric;
  user_active_days int;
  user_created_at timestamp with time zone;
  conversion_page text;
  -- New fields
  user_last_sign_in timestamp with time zone;
  last_session_minutes int;
  last_active_day date;
  session_start timestamp with time zone;
  session_end timestamp with time zone;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  -- Get user creation date and last sign in from auth.users
  SELECT created_at, last_sign_in_at INTO user_created_at, user_last_sign_in
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

  -- Get calendar trips count
  SELECT COUNT(*) INTO calendar_trips_count
  FROM public.trips
  WHERE user_id = _user_id AND deleted_at IS NULL
    AND source IN ('google_calendar', 'outlook_calendar');

  -- Get manual trips count
  SELECT COUNT(*) INTO manual_trips_count
  FROM public.trips
  WHERE user_id = _user_id AND deleted_at IS NULL
    AND (source = 'manual' OR source IS NULL);

  -- Get tour trips count
  SELECT COUNT(*) INTO tour_trips_count
  FROM public.trips
  WHERE user_id = _user_id AND deleted_at IS NULL
    AND tour_stops IS NOT NULL;

  IF user_trips_count > 0 THEN
    calendar_pct := ROUND((calendar_trips_count::numeric / user_trips_count::numeric) * 100, 1);
    manual_pct := ROUND((manual_trips_count::numeric / user_trips_count::numeric) * 100, 1);
    tour_pct := ROUND((tour_trips_count::numeric / user_trips_count::numeric) * 100, 1);
  ELSE
    calendar_pct := 0;
    manual_pct := 0;
    tour_pct := 0;
  END IF;

  SELECT COUNT(*) INTO user_vehicles_count FROM public.vehicles WHERE user_id = _user_id;

  SELECT COUNT(*) INTO user_tours_count
  FROM public.trips WHERE user_id = _user_id AND tour_stops IS NOT NULL AND deleted_at IS NULL;

  SELECT COUNT(*) INTO user_shares_count FROM public.share_events WHERE user_id = _user_id;

  SELECT 
    EXISTS(SELECT 1 FROM public.takeout_import_attempts WHERE user_id = _user_id AND status = 'success'),
    (SELECT created_at FROM public.takeout_import_attempts WHERE user_id = _user_id AND status = 'success' ORDER BY created_at DESC LIMIT 1)
  INTO has_takeout_import, takeout_import_date;

  -- Count unique active days
  SELECT COUNT(DISTINCT activity_date) INTO user_active_days
  FROM (
    SELECT DATE(created_at) as activity_date FROM public.trips WHERE user_id = _user_id
    UNION
    SELECT DATE(shared_at) FROM public.share_events WHERE user_id = _user_id
    UNION
    SELECT DATE(clicked_at) FROM public.download_clicks WHERE user_id = _user_id
    UNION
    SELECT DATE(created_at) FROM public.vehicles WHERE user_id = _user_id
    UNION
    SELECT DATE(updated_at) FROM public.vehicles WHERE user_id = _user_id
    UNION
    SELECT DATE(created_at) FROM public.marketing_analytics WHERE user_id = _user_id
    UNION
    SELECT DATE(created_at) FROM public.feedback WHERE user_id = _user_id
    UNION
    SELECT DATE(created_at) FROM public.calendar_connections WHERE user_id = _user_id
    UNION
    SELECT DATE(updated_at) FROM public.calendar_connections WHERE user_id = _user_id
  ) all_activities;

  -- Calculate last session duration: time span of activity on the most recent active day
  SELECT MAX(activity_date) INTO last_active_day
  FROM (
    SELECT DATE(created_at) as activity_date FROM public.trips WHERE user_id = _user_id
    UNION
    SELECT DATE(shared_at) FROM public.share_events WHERE user_id = _user_id
    UNION
    SELECT DATE(clicked_at) FROM public.download_clicks WHERE user_id = _user_id
    UNION
    SELECT DATE(created_at) FROM public.marketing_analytics WHERE user_id = _user_id
    UNION
    SELECT DATE(created_at) FROM public.feedback WHERE user_id = _user_id
  ) recent;

  IF last_active_day IS NOT NULL THEN
    SELECT MIN(ts), MAX(ts) INTO session_start, session_end
    FROM (
      SELECT created_at as ts FROM public.trips WHERE user_id = _user_id AND DATE(created_at) = last_active_day
      UNION ALL
      SELECT shared_at FROM public.share_events WHERE user_id = _user_id AND DATE(shared_at) = last_active_day
      UNION ALL
      SELECT clicked_at FROM public.download_clicks WHERE user_id = _user_id AND DATE(clicked_at) = last_active_day
      UNION ALL
      SELECT created_at FROM public.marketing_analytics WHERE user_id = _user_id AND DATE(created_at) = last_active_day
      UNION ALL
      SELECT created_at FROM public.feedback WHERE user_id = _user_id AND DATE(created_at) = last_active_day
    ) day_activity;
    
    last_session_minutes := GREATEST(1, EXTRACT(EPOCH FROM (session_end - session_start))::int / 60);
  ELSE
    last_session_minutes := 0;
  END IF;

  -- Conversion page
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
    'conversion_page', conversion_page,
    'last_sign_in', user_last_sign_in,
    'last_session_minutes', COALESCE(last_session_minutes, 0)
  );

  RETURN result;
END;
$function$;
