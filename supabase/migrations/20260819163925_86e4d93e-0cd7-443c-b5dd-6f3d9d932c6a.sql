DROP FUNCTION IF EXISTS public.get_ab_test_results(integer);

CREATE FUNCTION public.get_ab_test_results(days_back integer DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  result jsonb;
BEGIN
  IF NOT public.has_admin_or_viewer_role(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO result
  FROM (
    SELECT
      ma.variant,
      COUNT(DISTINCT ma.session_id) FILTER (WHERE ma.event_type = 'page_view')      AS visitors,
      COUNT(DISTINCT ma.session_id) FILTER (WHERE ma.event_type = 'signup_click')   AS cta_clicks,
      COUNT(DISTINCT ma.session_id) FILTER (WHERE ma.event_type = 'signup_view')    AS signup_views,
      COUNT(DISTINCT ma.session_id) FILTER (WHERE ma.event_type IN ('signup_oauth_start','signup_form_submit')) AS signup_starts,
      COUNT(DISTINCT ma.session_id) FILTER (WHERE ma.event_type = 'signup_success') AS signups
    FROM public.marketing_analytics ma
    WHERE ma.variant IS NOT NULL
      AND ma.created_at >= now() - (days_back || ' days')::interval
      AND (ma.user_id IS NULL OR NOT EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = ma.user_id AND ur.role IN ('admin','viewer')))
      AND (ma.ip_address IS NULL OR NOT EXISTS (
            SELECT 1 FROM public.excluded_ips ei WHERE ei.ip_address = ma.ip_address))
      AND ma.session_id NOT IN (
            SELECT DISTINCT m2.session_id
            FROM public.marketing_analytics m2
            WHERE m2.session_id IS NOT NULL
              AND m2.created_at >= now() - (days_back || ' days')::interval
              AND (
                (m2.user_id IS NOT NULL AND EXISTS (
                  SELECT 1 FROM public.user_roles ur2
                  WHERE ur2.user_id = m2.user_id AND ur2.role IN ('admin','viewer')))
                OR (m2.ip_address IS NOT NULL AND EXISTS (
                  SELECT 1 FROM public.excluded_ips ei2 WHERE ei2.ip_address = m2.ip_address))
              )
          )
    GROUP BY ma.variant
  ) t;

  RETURN result;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_ab_test_results(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_ab_test_results(integer) TO authenticated;