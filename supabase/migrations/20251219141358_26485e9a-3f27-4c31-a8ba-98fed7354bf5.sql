
-- Drop and recreate get_marketing_stats to include signup clicks
DROP FUNCTION IF EXISTS public.get_marketing_stats(integer);

CREATE OR REPLACE FUNCTION public.get_marketing_stats(days_back integer DEFAULT 30)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result json;
  total_views bigint;
  unique_sessions bigint;
  total_cta_clicks bigint;
  total_simulations bigint;
  total_signup_clicks bigint;
  mobile_views bigint;
  desktop_views bigint;
  tablet_views bigint;
  start_date timestamp;
BEGIN
  -- Only admins can call this
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  start_date := CURRENT_DATE - days_back;

  -- Total page views (excluding admin visits)
  SELECT COUNT(*) INTO total_views
  FROM public.marketing_analytics ma
  WHERE ma.event_type = 'page_view' 
    AND ma.created_at >= start_date
    AND (ma.user_id IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = ma.user_id AND ur.role = 'admin'
    ));

  -- Unique sessions (excluding admin visits)
  SELECT COUNT(DISTINCT ma.session_id) INTO unique_sessions
  FROM public.marketing_analytics ma
  WHERE ma.event_type = 'page_view' 
    AND ma.created_at >= start_date 
    AND ma.session_id IS NOT NULL
    AND (ma.user_id IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = ma.user_id AND ur.role = 'admin'
    ));

  -- CTA clicks (excluding admin visits)
  SELECT COUNT(*) INTO total_cta_clicks
  FROM public.marketing_analytics ma
  WHERE ma.event_type = 'cta_click' 
    AND ma.created_at >= start_date
    AND (ma.user_id IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = ma.user_id AND ur.role = 'admin'
    ));

  -- IK simulations (excluding admin visits)
  SELECT COUNT(*) INTO total_simulations
  FROM public.marketing_analytics ma
  WHERE ma.event_type = 'ik_simulation' 
    AND ma.created_at >= start_date
    AND (ma.user_id IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = ma.user_id AND ur.role = 'admin'
    ));

  -- Signup clicks (excluding admin visits)
  SELECT COUNT(*) INTO total_signup_clicks
  FROM public.marketing_analytics ma
  WHERE ma.event_type = 'signup_click' 
    AND ma.created_at >= start_date
    AND (ma.user_id IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = ma.user_id AND ur.role = 'admin'
    ));

  -- Device breakdown (excluding admin visits)
  SELECT COUNT(*) INTO mobile_views
  FROM public.marketing_analytics ma
  WHERE ma.event_type = 'page_view' 
    AND ma.device_type = 'mobile' 
    AND ma.created_at >= start_date
    AND (ma.user_id IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = ma.user_id AND ur.role = 'admin'
    ));

  SELECT COUNT(*) INTO desktop_views
  FROM public.marketing_analytics ma
  WHERE ma.event_type = 'page_view' 
    AND ma.device_type = 'desktop' 
    AND ma.created_at >= start_date
    AND (ma.user_id IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = ma.user_id AND ur.role = 'admin'
    ));

  SELECT COUNT(*) INTO tablet_views
  FROM public.marketing_analytics ma
  WHERE ma.event_type = 'page_view' 
    AND ma.device_type = 'tablet' 
    AND ma.created_at >= start_date
    AND (ma.user_id IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = ma.user_id AND ur.role = 'admin'
    ));

  result := json_build_object(
    'total_views', COALESCE(total_views, 0),
    'unique_sessions', COALESCE(unique_sessions, 0),
    'total_cta_clicks', COALESCE(total_cta_clicks, 0),
    'total_simulations', COALESCE(total_simulations, 0),
    'total_signup_clicks', COALESCE(total_signup_clicks, 0),
    'mobile_views', COALESCE(mobile_views, 0),
    'desktop_views', COALESCE(desktop_views, 0),
    'tablet_views', COALESCE(tablet_views, 0),
    'mobile_pct', CASE WHEN total_views > 0 THEN ROUND((mobile_views::numeric / total_views::numeric) * 100, 1) ELSE 0 END,
    'desktop_pct', CASE WHEN total_views > 0 THEN ROUND((desktop_views::numeric / total_views::numeric) * 100, 1) ELSE 0 END
  );

  RETURN result;
END;
$function$;
