
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
    UNION
    SELECT id as user_id, last_sign_in_at::date FROM auth.users WHERE last_sign_in_at IS NOT NULL
  ) sub ON sub.activity_date = d.day::date
    AND NOT EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = sub.user_id AND ur.role = 'admin'
    )
  GROUP BY d.day
  ORDER BY d.day;
END;
$function$;
