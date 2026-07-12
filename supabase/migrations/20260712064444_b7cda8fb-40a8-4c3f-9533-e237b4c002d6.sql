
CREATE OR REPLACE FUNCTION public.get_signup_funnel(days_back integer DEFAULT 30)
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result json;
  start_date timestamp;
  v_views bigint;
  v_oauth_start bigint;
  v_form_submit bigint;
  v_errors bigint;
  v_success bigint;
  v_google bigint;
  v_apple bigint;
  v_email bigint;
  v_new_users bigint;
BEGIN
  IF NOT public.has_admin_or_viewer_role(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  start_date := CURRENT_DATE - days_back;

  -- Filter admins + excluded IPs, consistent with other marketing RPCs
  WITH filt AS (
    SELECT ma.*
    FROM public.marketing_analytics ma
    WHERE ma.created_at >= start_date
      AND ma.page = 'signup'
      AND (ma.user_id IS NULL OR NOT EXISTS (
        SELECT 1 FROM public.user_roles ur WHERE ur.user_id = ma.user_id AND ur.role = 'admin'))
      AND (ma.ip_address IS NULL OR NOT EXISTS (
        SELECT 1 FROM public.excluded_ips ei WHERE ei.ip_address = ma.ip_address))
  )
  SELECT
    COUNT(*) FILTER (WHERE event_type = 'signup_view'),
    COUNT(*) FILTER (WHERE event_type = 'signup_oauth_start'),
    COUNT(*) FILTER (WHERE event_type = 'signup_form_submit'),
    COUNT(*) FILTER (WHERE event_type = 'signup_error'),
    COUNT(*) FILTER (WHERE event_type = 'signup_success'),
    COUNT(*) FILTER (WHERE event_type = 'signup_success' AND referrer = 'google'),
    COUNT(*) FILTER (WHERE event_type = 'signup_success' AND referrer = 'apple'),
    COUNT(*) FILTER (WHERE event_type = 'signup_success' AND referrer = 'email')
  INTO v_views, v_oauth_start, v_form_submit, v_errors, v_success, v_google, v_apple, v_email
  FROM filt;

  SELECT COUNT(*) INTO v_new_users
  FROM auth.users u
  WHERE u.created_at >= start_date
    AND NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = u.id AND ur.role = 'admin');

  result := json_build_object(
    'days_back', days_back,
    'views', COALESCE(v_views, 0),
    'oauth_start', COALESCE(v_oauth_start, 0),
    'form_submit', COALESCE(v_form_submit, 0),
    'errors', COALESCE(v_errors, 0),
    'success_tracked', COALESCE(v_success, 0),
    'new_users', COALESCE(v_new_users, 0),
    'by_provider', json_build_object(
      'google', COALESCE(v_google, 0),
      'apple', COALESCE(v_apple, 0),
      'email', COALESCE(v_email, 0)
    ),
    'conversion_rate', CASE WHEN v_views > 0
      THEN ROUND((v_new_users::numeric / v_views::numeric) * 100, 1)
      ELSE 0 END,
    'error_rate', CASE WHEN v_form_submit > 0
      THEN ROUND((v_errors::numeric / v_form_submit::numeric) * 100, 1)
      ELSE 0 END,
    'top_errors', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (
        SELECT (user_agent) AS message, COUNT(*) AS count
        FROM public.marketing_analytics ma
        WHERE ma.created_at >= start_date
          AND ma.page = 'signup'
          AND ma.event_type = 'signup_error'
        GROUP BY user_agent
        ORDER BY COUNT(*) DESC
        LIMIT 5
      ) t
    )
  );
  RETURN result;
END;
$function$;
