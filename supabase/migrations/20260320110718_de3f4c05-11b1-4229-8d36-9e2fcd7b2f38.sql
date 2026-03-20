-- Create a helper function to check if user has admin OR viewer role
CREATE OR REPLACE FUNCTION public.has_admin_or_viewer_role(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'viewer')
  )
$$;

-- Update read-only admin RPCs to allow viewer access too
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
  IF NOT public.has_admin_or_viewer_role(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: admin or viewer role required';
  END IF;

  filter_start := COALESCE(start_date, '1900-01-01'::date);
  filter_end := COALESCE(end_date, CURRENT_DATE);

  SELECT COUNT(DISTINCT t.user_id) INTO total_users 
  FROM public.trips t
  WHERE t.deleted_at IS NULL
    AND t.date >= filter_start 
    AND t.date <= filter_end
    AND NOT EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = t.user_id AND ur.role = 'admin'
    );
  
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
$function$;

CREATE OR REPLACE FUNCTION public.get_daily_active_users(days_back integer DEFAULT 7)
 RETURNS TABLE(day date, count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_admin_or_viewer_role(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT 
    d.day::date,
    COUNT(DISTINCT sub.user_id)
  FROM generate_series(CURRENT_DATE - days_back, CURRENT_DATE, '1 day'::interval) AS d(day)
  LEFT JOIN (
    SELECT user_id, created_at::date as activity_date FROM public.trips WHERE deleted_at IS NULL
    UNION
    SELECT user_id, shared_at::date FROM public.share_events
    UNION
    SELECT user_id, clicked_at::date FROM public.download_clicks
    UNION
    SELECT user_id, created_at::date FROM public.feedback
  ) sub ON sub.activity_date = d.day::date
    AND NOT EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = sub.user_id AND ur.role = 'admin'
    )
  GROUP BY d.day
  ORDER BY d.day;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_registrations_by_day(days_back integer DEFAULT 30)
 RETURNS TABLE(day date, count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_admin_or_viewer_role(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT 
    d.day::date,
    COUNT(u.id)
  FROM generate_series(CURRENT_DATE - days_back, CURRENT_DATE, '1 day'::interval) AS d(day)
  LEFT JOIN auth.users u ON u.created_at::date = d.day::date
    AND NOT EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = u.id AND ur.role = 'admin'
    )
  GROUP BY d.day
  ORDER BY d.day;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_shares_by_day(days_back integer DEFAULT 30)
 RETURNS TABLE(day date, count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_admin_or_viewer_role(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT 
    d.day::date,
    COUNT(se.id)
  FROM generate_series(CURRENT_DATE - days_back, CURRENT_DATE, '1 day'::interval) AS d(day)
  LEFT JOIN public.share_events se ON se.shared_at::date = d.day::date
    AND NOT EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = se.user_id AND ur.role = 'admin'
    )
  GROUP BY d.day
  ORDER BY d.day;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_download_clicks_by_day(days_back integer DEFAULT 30)
 RETURNS TABLE(day date, count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_admin_or_viewer_role(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT 
    d.day::date,
    COUNT(dc.id)
  FROM generate_series(CURRENT_DATE - days_back, CURRENT_DATE, '1 day'::interval) AS d(day)
  LEFT JOIN public.download_clicks dc ON dc.clicked_at::date = d.day::date
    AND NOT EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = dc.user_id AND ur.role = 'admin'
    )
  GROUP BY d.day
  ORDER BY d.day;
END;
$function$;

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
  IF NOT public.has_admin_or_viewer_role(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT COUNT(*) INTO total_clicks FROM public.download_clicks dc
  WHERE NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = dc.user_id AND ur.role = 'admin');
  
  SELECT COUNT(DISTINCT dc.user_id) INTO unique_users FROM public.download_clicks dc
  WHERE NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = dc.user_id AND ur.role = 'admin');
  
  SELECT COUNT(DISTINCT t.user_id) INTO total_users_with_trips FROM public.trips t
  WHERE NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = t.user_id AND ur.role = 'admin');
  
  IF unique_users > 0 THEN avg_clicks_per_user := total_clicks::float / unique_users::float;
  ELSE avg_clicks_per_user := 0; END IF;
  
  IF total_users_with_trips > 0 THEN pct_users_clicked := (unique_users::float / total_users_with_trips::float) * 100;
  ELSE pct_users_clicked := 0; END IF;

  result := json_build_object(
    'total_clicks', total_clicks, 'unique_users', unique_users,
    'avg_clicks_per_user', ROUND(avg_clicks_per_user::numeric, 2),
    'pct_users_clicked', ROUND(pct_users_clicked::numeric, 1)
  );
  RETURN result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_share_stats()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result json;
  total_shares int;
  unique_sharers int;
  total_users_with_trips int;
  pct_users_shared float;
BEGIN
  IF NOT public.has_admin_or_viewer_role(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT COUNT(*) INTO total_shares FROM public.share_events se
  WHERE NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = se.user_id AND ur.role = 'admin');
  
  SELECT COUNT(DISTINCT se.user_id) INTO unique_sharers FROM public.share_events se
  WHERE NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = se.user_id AND ur.role = 'admin');
  
  SELECT COUNT(DISTINCT t.user_id) INTO total_users_with_trips FROM public.trips t
  WHERE NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = t.user_id AND ur.role = 'admin');
  
  IF total_users_with_trips > 0 THEN pct_users_shared := (unique_sharers::float / total_users_with_trips::float) * 100;
  ELSE pct_users_shared := 0; END IF;

  result := json_build_object(
    'total_shares', total_shares, 'unique_sharers', unique_sharers,
    'pct_users_shared', ROUND(pct_users_shared::numeric, 1)
  );
  RETURN result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_takeout_import_stats()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result json;
  total_attempts int;
  successful_imports int;
  unique_users_imported int;
BEGIN
  IF NOT public.has_admin_or_viewer_role(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT COUNT(*) INTO total_attempts FROM public.takeout_import_attempts tia
  WHERE NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = tia.user_id AND ur.role = 'admin');

  SELECT COUNT(*) INTO successful_imports FROM public.takeout_import_attempts tia
  WHERE tia.status = 'success' AND NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = tia.user_id AND ur.role = 'admin');

  SELECT COUNT(DISTINCT tia.user_id) INTO unique_users_imported FROM public.takeout_import_attempts tia
  WHERE tia.status = 'success' AND NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = tia.user_id AND ur.role = 'admin');

  result := json_build_object(
    'total_attempts', COALESCE(total_attempts, 0),
    'successful_imports', COALESCE(successful_imports, 0),
    'unique_users_imported', COALESCE(unique_users_imported, 0)
  );
  RETURN result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_marketing_stats(days_back integer DEFAULT 30)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result json;
  total_views bigint; unique_sessions bigint; total_cta_clicks bigint;
  total_simulations bigint; total_signup_clicks bigint;
  mobile_views bigint; desktop_views bigint; tablet_views bigint;
  start_date timestamp;
BEGIN
  IF NOT public.has_admin_or_viewer_role(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  start_date := CURRENT_DATE - days_back;

  SELECT COUNT(*) INTO total_views FROM public.marketing_analytics ma
  WHERE ma.event_type = 'page_view' AND ma.created_at >= start_date
    AND (ma.user_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = ma.user_id AND ur.role = 'admin'))
    AND (ma.ip_address IS NULL OR NOT EXISTS (SELECT 1 FROM public.excluded_ips ei WHERE ei.ip_address = ma.ip_address));

  SELECT COUNT(DISTINCT ma.session_id) INTO unique_sessions FROM public.marketing_analytics ma
  WHERE ma.event_type = 'page_view' AND ma.created_at >= start_date AND ma.session_id IS NOT NULL
    AND (ma.user_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = ma.user_id AND ur.role = 'admin'))
    AND (ma.ip_address IS NULL OR NOT EXISTS (SELECT 1 FROM public.excluded_ips ei WHERE ei.ip_address = ma.ip_address));

  SELECT COUNT(*) INTO total_cta_clicks FROM public.marketing_analytics ma
  WHERE ma.event_type = 'cta_click' AND ma.created_at >= start_date
    AND (ma.user_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = ma.user_id AND ur.role = 'admin'))
    AND (ma.ip_address IS NULL OR NOT EXISTS (SELECT 1 FROM public.excluded_ips ei WHERE ei.ip_address = ma.ip_address));

  SELECT COUNT(*) INTO total_simulations FROM public.marketing_analytics ma
  WHERE ma.event_type = 'ik_simulation' AND ma.created_at >= start_date
    AND (ma.user_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = ma.user_id AND ur.role = 'admin'))
    AND (ma.ip_address IS NULL OR NOT EXISTS (SELECT 1 FROM public.excluded_ips ei WHERE ei.ip_address = ma.ip_address));

  SELECT COUNT(*) INTO total_signup_clicks FROM public.marketing_analytics ma
  WHERE ma.event_type = 'signup_click' AND ma.created_at >= start_date
    AND (ma.user_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = ma.user_id AND ur.role = 'admin'))
    AND (ma.ip_address IS NULL OR NOT EXISTS (SELECT 1 FROM public.excluded_ips ei WHERE ei.ip_address = ma.ip_address));

  SELECT COUNT(*) INTO mobile_views FROM public.marketing_analytics ma
  WHERE ma.event_type = 'page_view' AND ma.device_type = 'mobile' AND ma.created_at >= start_date
    AND (ma.user_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = ma.user_id AND ur.role = 'admin'))
    AND (ma.ip_address IS NULL OR NOT EXISTS (SELECT 1 FROM public.excluded_ips ei WHERE ei.ip_address = ma.ip_address));

  SELECT COUNT(*) INTO desktop_views FROM public.marketing_analytics ma
  WHERE ma.event_type = 'page_view' AND ma.device_type = 'desktop' AND ma.created_at >= start_date
    AND (ma.user_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = ma.user_id AND ur.role = 'admin'))
    AND (ma.ip_address IS NULL OR NOT EXISTS (SELECT 1 FROM public.excluded_ips ei WHERE ei.ip_address = ma.ip_address));

  SELECT COUNT(*) INTO tablet_views FROM public.marketing_analytics ma
  WHERE ma.event_type = 'page_view' AND ma.device_type = 'tablet' AND ma.created_at >= start_date
    AND (ma.user_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = ma.user_id AND ur.role = 'admin'))
    AND (ma.ip_address IS NULL OR NOT EXISTS (SELECT 1 FROM public.excluded_ips ei WHERE ei.ip_address = ma.ip_address));

  result := json_build_object(
    'total_views', COALESCE(total_views, 0), 'unique_sessions', COALESCE(unique_sessions, 0),
    'total_cta_clicks', COALESCE(total_cta_clicks, 0), 'total_simulations', COALESCE(total_simulations, 0),
    'total_signup_clicks', COALESCE(total_signup_clicks, 0),
    'mobile_views', COALESCE(mobile_views, 0), 'desktop_views', COALESCE(desktop_views, 0),
    'tablet_views', COALESCE(tablet_views, 0),
    'mobile_pct', CASE WHEN total_views > 0 THEN ROUND((mobile_views::numeric / total_views::numeric) * 100, 1) ELSE 0 END,
    'desktop_pct', CASE WHEN total_views > 0 THEN ROUND((desktop_views::numeric / total_views::numeric) * 100, 1) ELSE 0 END
  );
  RETURN result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_marketing_stats_by_page(days_back integer DEFAULT 30)
 RETURNS TABLE(page text, views bigint, cta_clicks bigint, simulations bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  start_date timestamp;
BEGIN
  IF NOT public.has_admin_or_viewer_role(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  start_date := CURRENT_DATE - days_back;

  RETURN QUERY
  SELECT 
    ma.page,
    COUNT(*) FILTER (WHERE ma.event_type = 'page_view') as views,
    COUNT(*) FILTER (WHERE ma.event_type = 'cta_click') as cta_clicks,
    COUNT(*) FILTER (WHERE ma.event_type = 'ik_simulation') as simulations
  FROM public.marketing_analytics ma
  WHERE ma.created_at >= start_date
    AND (ma.user_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = ma.user_id AND ur.role = 'admin'))
    AND (ma.ip_address IS NULL OR NOT EXISTS (SELECT 1 FROM public.excluded_ips ei WHERE ei.ip_address = ma.ip_address))
  GROUP BY ma.page
  ORDER BY views DESC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_marketing_views_by_day(days_back integer DEFAULT 30)
 RETURNS TABLE(day date, views bigint, unique_visitors bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_admin_or_viewer_role(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT 
    d.day::date,
    COUNT(ma.id) as views,
    COUNT(DISTINCT ma.session_id) as unique_visitors
  FROM generate_series(CURRENT_DATE - days_back, CURRENT_DATE, '1 day'::interval) AS d(day)
  LEFT JOIN public.marketing_analytics ma 
    ON ma.created_at::date = d.day::date 
    AND ma.event_type = 'page_view'
    AND (ma.user_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = ma.user_id AND ur.role = 'admin'))
    AND (ma.ip_address IS NULL OR NOT EXISTS (SELECT 1 FROM public.excluded_ips ei WHERE ei.ip_address = ma.ip_address))
  GROUP BY d.day
  ORDER BY d.day;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_top_users(sort_by text DEFAULT 'trips'::text, limit_count integer DEFAULT 10)
 RETURNS TABLE(user_id uuid, total_trips bigint, total_km numeric, total_ik numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_admin_or_viewer_role(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT 
    t.user_id,
    COUNT(*)::bigint as total_trips,
    ROUND(COALESCE(SUM(t.distance), 0)::numeric, 0) as total_km,
    ROUND(COALESCE(SUM(t.ik_amount), 0)::numeric, 2) as total_ik
  FROM public.trips t
  WHERE NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = t.user_id AND ur.role = 'admin')
  GROUP BY t.user_id
  ORDER BY 
    CASE WHEN sort_by = 'trips' THEN COUNT(*) END DESC NULLS LAST,
    CASE WHEN sort_by = 'km' THEN SUM(t.distance) END DESC NULLS LAST,
    CASE WHEN sort_by = 'ik' THEN SUM(t.ik_amount) END DESC NULLS LAST
  LIMIT limit_count;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_monthly_stats(months_back integer DEFAULT 5)
 RETURNS TABLE(month text, total_users bigint, total_trips bigint, total_km double precision, total_ik double precision)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH months AS (
    SELECT generate_series(
      date_trunc('month', CURRENT_DATE) - ((months_back - 1) || ' months')::interval,
      date_trunc('month', CURRENT_DATE), '1 month'::interval
    )::date as month_start
  ),
  monthly_trips AS (
    SELECT date_trunc('month', t.date)::date as month_start,
      COUNT(*) as trip_count, COALESCE(SUM(t.distance), 0) as km_sum, COALESCE(SUM(t.ik_amount), 0) as ik_sum
    FROM trips t
    WHERE t.deleted_at IS NULL AND t.date >= date_trunc('month', CURRENT_DATE) - ((months_back - 1) || ' months')::interval
      AND NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = t.user_id AND ur.role = 'admin')
    GROUP BY date_trunc('month', t.date)::date
  ),
  monthly_users AS (
    SELECT m.month_start, COUNT(DISTINCT t.user_id) as user_count
    FROM months m
    LEFT JOIN trips t ON date_trunc('month', t.date)::date = m.month_start AND t.deleted_at IS NULL
      AND NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = t.user_id AND ur.role = 'admin')
    GROUP BY m.month_start
  )
  SELECT to_char(m.month_start, 'Mon') as month,
    COALESCE(mu.user_count, 0) as total_users, COALESCE(mt.trip_count, 0) as total_trips,
    COALESCE(mt.km_sum, 0) as total_km, COALESCE(mt.ik_sum, 0) as total_ik
  FROM months m
  LEFT JOIN monthly_trips mt ON mt.month_start = m.month_start
  LEFT JOIN monthly_users mu ON mu.month_start = m.month_start
  ORDER BY m.month_start ASC;
$function$;

-- get_user_stats stays admin-only (contains sensitive per-user data)
-- search_users stays admin-only (accesses auth.users)
-- get_recent_signups stays admin-only (accesses auth.users)

-- API cost functions - allow viewer access
CREATE OR REPLACE FUNCTION public.get_api_cost_stats(days_back integer DEFAULT 30)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result json;
  total_requests bigint; total_tokens_in bigint; total_tokens_out bigint; total_cost numeric;
  period_requests bigint; period_tokens_in bigint; period_tokens_out bigint; period_cost numeric;
BEGIN
  IF NOT public.has_admin_or_viewer_role(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT COUNT(*), COALESCE(SUM(tokens_input), 0), COALESCE(SUM(tokens_output), 0), COALESCE(SUM(cost_euros), 0)
  INTO total_requests, total_tokens_in, total_tokens_out, total_cost FROM public.api_usage_logs;

  SELECT COUNT(*), COALESCE(SUM(tokens_input), 0), COALESCE(SUM(tokens_output), 0), COALESCE(SUM(cost_euros), 0)
  INTO period_requests, period_tokens_in, period_tokens_out, period_cost
  FROM public.api_usage_logs WHERE created_at >= NOW() - (days_back || ' days')::interval;

  result := json_build_object(
    'total_requests', total_requests, 'total_tokens_input', total_tokens_in,
    'total_tokens_output', total_tokens_out, 'total_cost', ROUND(total_cost, 4),
    'period_requests', period_requests, 'period_tokens_input', period_tokens_in,
    'period_tokens_output', period_tokens_out, 'period_cost', ROUND(period_cost, 4)
  );
  RETURN result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_api_cost_by_day(days_back integer DEFAULT 30)
 RETURNS TABLE(day date, request_count bigint, tokens bigint, cost numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_admin_or_viewer_role(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT d.day::date, COUNT(a.id)::bigint as request_count,
    COALESCE(SUM(a.tokens_input + a.tokens_output), 0)::bigint as tokens,
    ROUND(COALESCE(SUM(a.cost_euros), 0), 4) as cost
  FROM generate_series(CURRENT_DATE - days_back, CURRENT_DATE, '1 day'::interval) AS d(day)
  LEFT JOIN public.api_usage_logs a ON a.created_at::date = d.day::date
  GROUP BY d.day ORDER BY d.day;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_api_cost_by_function(days_back integer DEFAULT 30)
 RETURNS TABLE(function_name text, request_count bigint, tokens_in bigint, tokens_out bigint, cost numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_admin_or_viewer_role(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT a.function_name, COUNT(*)::bigint as request_count,
    COALESCE(SUM(a.tokens_input), 0)::bigint as tokens_in,
    COALESCE(SUM(a.tokens_output), 0)::bigint as tokens_out,
    ROUND(COALESCE(SUM(a.cost_euros), 0), 4) as cost
  FROM public.api_usage_logs a
  WHERE a.created_at >= NOW() - (days_back || ' days')::interval
  GROUP BY a.function_name ORDER BY cost DESC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_api_cost_by_model(days_back integer DEFAULT 30)
 RETURNS TABLE(model text, request_count bigint, tokens_in bigint, tokens_out bigint, cost numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_admin_or_viewer_role(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT COALESCE(a.model, 'unknown')::text as model, COUNT(*)::bigint as request_count,
    COALESCE(SUM(a.tokens_input), 0)::bigint as tokens_in,
    COALESCE(SUM(a.tokens_output), 0)::bigint as tokens_out,
    ROUND(COALESCE(SUM(a.cost_euros), 0), 4) as cost
  FROM public.api_usage_logs a
  WHERE a.created_at >= NOW() - (days_back || ' days')::interval
  GROUP BY COALESCE(a.model, 'unknown') ORDER BY cost DESC;
END;
$function$;