-- Update get_admin_stats to exclude admin users
CREATE OR REPLACE FUNCTION public.get_admin_stats(start_date date DEFAULT NULL::date, end_date date DEFAULT NULL::date)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  SELECT COUNT(DISTINCT t.user_id) INTO total_users 
  FROM public.trips t
  WHERE t.created_at::date >= filter_start 
    AND t.created_at::date <= filter_end
    AND NOT EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = t.user_id AND ur.role = 'admin'
    );
  
  -- Get trip stats within date range, excluding admin trips
  SELECT 
    COUNT(*),
    COALESCE(SUM(t.distance), 0),
    COALESCE(SUM(t.ik_amount), 0)
  INTO total_trips, total_km, total_ik
  FROM public.trips t
  WHERE t.created_at::date >= filter_start 
    AND t.created_at::date <= filter_end
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
$function$;

-- Update get_registrations_by_day to exclude admin users
CREATE OR REPLACE FUNCTION public.get_registrations_by_day(days_back integer DEFAULT 30)
 RETURNS TABLE(day date, count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Only admins can call this
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  RETURN QUERY
  WITH first_trips AS (
    SELECT 
      t.user_id,
      MIN(t.created_at::date) as first_activity
    FROM public.trips t
    WHERE NOT EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = t.user_id AND ur.role = 'admin'
    )
    GROUP BY t.user_id
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
$function$;

-- Update get_top_users to exclude admin users
CREATE OR REPLACE FUNCTION public.get_top_users(sort_by text DEFAULT 'trips'::text, limit_count integer DEFAULT 10)
 RETURNS TABLE(user_id uuid, total_trips bigint, total_km numeric, total_ik numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  WHERE NOT EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = t.user_id AND ur.role = 'admin'
  )
  GROUP BY t.user_id
  ORDER BY 
    CASE WHEN sort_by = 'trips' THEN COUNT(*) END DESC NULLS LAST,
    CASE WHEN sort_by = 'km' THEN SUM(t.distance) END DESC NULLS LAST,
    CASE WHEN sort_by = 'ik' THEN SUM(t.ik_amount) END DESC NULLS LAST
  LIMIT limit_count;
END;
$function$;

-- Update get_download_stats to exclude admin users
CREATE OR REPLACE FUNCTION public.get_download_stats()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result json;
  total_clicks int;
  unique_users int;
  total_users_with_trips int;
  avg_clicks_per_user float;
  pct_users_clicked float;
BEGIN
  -- Only admins can call this
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  -- Total clicks (excluding admins)
  SELECT COUNT(*) INTO total_clicks 
  FROM public.download_clicks dc
  WHERE NOT EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = dc.user_id AND ur.role = 'admin'
  );
  
  -- Unique users who clicked (excluding admins)
  SELECT COUNT(DISTINCT dc.user_id) INTO unique_users 
  FROM public.download_clicks dc
  WHERE NOT EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = dc.user_id AND ur.role = 'admin'
  );
  
  -- Total users based on trips table (excluding admins)
  SELECT COUNT(DISTINCT t.user_id) INTO total_users_with_trips 
  FROM public.trips t
  WHERE NOT EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = t.user_id AND ur.role = 'admin'
  );
  
  -- Average clicks per user (among those who clicked)
  IF unique_users > 0 THEN
    avg_clicks_per_user := total_clicks::float / unique_users::float;
  ELSE
    avg_clicks_per_user := 0;
  END IF;
  
  -- Percentage of users who clicked at least once
  IF total_users_with_trips > 0 THEN
    pct_users_clicked := (unique_users::float / total_users_with_trips::float) * 100;
  ELSE
    pct_users_clicked := 0;
  END IF;

  result := json_build_object(
    'total_clicks', total_clicks,
    'unique_users', unique_users,
    'avg_clicks_per_user', ROUND(avg_clicks_per_user::numeric, 2),
    'pct_users_clicked', ROUND(pct_users_clicked::numeric, 1)
  );

  RETURN result;
END;
$function$;

-- Update get_download_clicks_by_day to exclude admin users
CREATE OR REPLACE FUNCTION public.get_download_clicks_by_day(days_back integer DEFAULT 30)
 RETURNS TABLE(day date, count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Only admins can call this
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  RETURN QUERY
  SELECT 
    d.day::date,
    COUNT(dc.id)
  FROM generate_series(
    CURRENT_DATE - days_back,
    CURRENT_DATE,
    '1 day'::interval
  ) AS d(day)
  LEFT JOIN public.download_clicks dc ON dc.clicked_at::date = d.day::date
    AND NOT EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = dc.user_id AND ur.role = 'admin'
    )
  GROUP BY d.day
  ORDER BY d.day;
END;
$function$;