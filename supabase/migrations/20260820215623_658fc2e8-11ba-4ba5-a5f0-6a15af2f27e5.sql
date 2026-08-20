-- Audit de performance (20/08/2026) : index manquants + get_marketing_stats en 1 passe

-- "Dernier véhicule utilisé" (pick_default_vehicle_for_user, ~3 754 appels, 35 ms -> < 1 ms)
CREATE INDEX IF NOT EXISTS idx_trips_user_created_at
  ON public.trips (user_id, created_at DESC);

-- Listes admin du blog triées par created_at DESC (BlogAdmin) : 70 ms sans index
CREATE INDEX IF NOT EXISTS idx_blog_posts_created_at
  ON public.blog_posts (created_at DESC);

-- Blog public + sitemap : articles publiés triés par date de publication
CREATE INDEX IF NOT EXISTS idx_blog_posts_published_at
  ON public.blog_posts (published_at DESC)
  WHERE status = 'published';

-- get_marketing_stats : 9 scans séparés de marketing_analytics -> 1 seule passe
-- avec agrégation conditionnelle. Mêmes filtres (admins + IPs exclus), mêmes clés JSON,
-- comptes exacts conservés (pas d'estimation).
CREATE OR REPLACE FUNCTION public.get_marketing_stats(days_back integer DEFAULT 30)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result json;
  start_date timestamp;
BEGIN
  IF NOT public.has_admin_or_viewer_role(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  start_date := CURRENT_DATE - days_back;

  WITH filtered AS (
    SELECT ma.event_type, ma.device_type, ma.session_id
    FROM public.marketing_analytics ma
    WHERE ma.created_at >= start_date
      AND (ma.user_id IS NULL OR NOT EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = ma.user_id AND ur.role = 'admin'))
      AND (ma.ip_address IS NULL OR NOT EXISTS (
        SELECT 1 FROM public.excluded_ips ei
        WHERE ei.ip_address = ma.ip_address))
  ),
  agg AS (
    SELECT
      COUNT(*) FILTER (WHERE event_type = 'page_view') AS total_views,
      COUNT(DISTINCT session_id) FILTER (
        WHERE event_type = 'page_view' AND session_id IS NOT NULL) AS unique_sessions,
      COUNT(*) FILTER (WHERE event_type = 'cta_click') AS total_cta_clicks,
      COUNT(*) FILTER (WHERE event_type = 'ik_simulation') AS total_simulations,
      COUNT(*) FILTER (WHERE event_type = 'signup_click') AS total_signup_clicks,
      COUNT(*) FILTER (WHERE event_type = 'crawlers_click') AS total_crawlers_clicks,
      COUNT(*) FILTER (WHERE event_type = 'page_view' AND device_type = 'mobile') AS mobile_views,
      COUNT(*) FILTER (WHERE event_type = 'page_view' AND device_type = 'desktop') AS desktop_views,
      COUNT(*) FILTER (WHERE event_type = 'page_view' AND device_type = 'tablet') AS tablet_views
    FROM filtered
  )
  SELECT json_build_object(
    'total_views', COALESCE(total_views, 0),
    'unique_sessions', COALESCE(unique_sessions, 0),
    'total_cta_clicks', COALESCE(total_cta_clicks, 0),
    'total_simulations', COALESCE(total_simulations, 0),
    'total_signup_clicks', COALESCE(total_signup_clicks, 0),
    'total_crawlers_clicks', COALESCE(total_crawlers_clicks, 0),
    'mobile_views', COALESCE(mobile_views, 0),
    'desktop_views', COALESCE(desktop_views, 0),
    'tablet_views', COALESCE(tablet_views, 0),
    'mobile_pct', CASE WHEN total_views > 0
      THEN ROUND((mobile_views::numeric / total_views::numeric) * 100, 1) ELSE 0 END,
    'desktop_pct', CASE WHEN total_views > 0
      THEN ROUND((desktop_views::numeric / total_views::numeric) * 100, 1) ELSE 0 END
  ) INTO result
  FROM agg;

  RETURN result;
END;
$function$;