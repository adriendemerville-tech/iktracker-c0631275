CREATE OR REPLACE FUNCTION public.get_rolling_unique_visitors(days_back integer DEFAULT 30, window_size integer DEFAULT 7)
RETURNS TABLE(day date, unique_visitors bigint)
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
    (
      SELECT COUNT(DISTINCT ma.session_id)
      FROM public.marketing_analytics ma
      WHERE ma.event_type = 'page_view'
        AND ma.created_at::date > d.day::date - window_size
        AND ma.created_at::date <= d.day::date
        AND (ma.user_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = ma.user_id AND ur.role = 'admin'))
        AND (ma.ip_address IS NULL OR NOT EXISTS (SELECT 1 FROM public.excluded_ips ei WHERE ei.ip_address = ma.ip_address))
    )::bigint AS unique_visitors
  FROM generate_series(CURRENT_DATE - days_back, CURRENT_DATE, '1 day'::interval) AS d(day)
  ORDER BY d.day;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_rolling_unique_visitors(integer, integer) TO authenticated;