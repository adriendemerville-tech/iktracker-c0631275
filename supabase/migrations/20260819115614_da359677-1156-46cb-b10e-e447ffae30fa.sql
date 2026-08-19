ALTER TABLE public.marketing_analytics ADD COLUMN IF NOT EXISTS variant text;

CREATE INDEX IF NOT EXISTS idx_marketing_analytics_variant
  ON public.marketing_analytics (variant, event_type, created_at DESC)
  WHERE variant IS NOT NULL;

CREATE OR REPLACE FUNCTION public.get_ab_test_results(days_back integer DEFAULT 30)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb)
  FROM (
    SELECT
      variant,
      COUNT(DISTINCT session_id) FILTER (WHERE event_type = 'page_view')      AS visitors,
      COUNT(DISTINCT session_id) FILTER (WHERE event_type = 'signup_click')   AS cta_clicks,
      COUNT(DISTINCT session_id) FILTER (WHERE event_type = 'signup_view')    AS signup_views,
      COUNT(DISTINCT session_id) FILTER (WHERE event_type IN ('signup_oauth_start','signup_form_submit')) AS signup_starts,
      COUNT(DISTINCT session_id) FILTER (WHERE event_type = 'signup_success') AS signups
    FROM public.marketing_analytics
    WHERE variant IS NOT NULL
      AND created_at >= now() - (days_back || ' days')::interval
    GROUP BY variant
    ORDER BY variant
  ) t;
$$;

REVOKE ALL ON FUNCTION public.get_ab_test_results(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_ab_test_results(integer) TO authenticated;