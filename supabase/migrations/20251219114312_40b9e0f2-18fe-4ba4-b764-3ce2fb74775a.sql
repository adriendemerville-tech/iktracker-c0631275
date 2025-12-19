-- Create table for marketing analytics
CREATE TABLE public.marketing_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  event_type TEXT NOT NULL, -- 'page_view', 'cta_click', 'ik_simulation'
  page TEXT NOT NULL, -- 'landing', 'signup', 'bareme', 'expert-comptable', etc.
  device_type TEXT NOT NULL DEFAULT 'desktop', -- 'mobile', 'tablet', 'desktop'
  session_id TEXT, -- to track unique sessions
  referrer TEXT,
  user_agent TEXT
);

-- Enable RLS
ALTER TABLE public.marketing_analytics ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts for tracking (public marketing pages)
CREATE POLICY "Allow anonymous inserts for marketing tracking"
ON public.marketing_analytics
FOR INSERT
WITH CHECK (true);

-- Only admins can read
CREATE POLICY "Only admins can read marketing analytics"
ON public.marketing_analytics
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Create index for faster queries
CREATE INDEX idx_marketing_analytics_created_at ON public.marketing_analytics(created_at);
CREATE INDEX idx_marketing_analytics_event_type ON public.marketing_analytics(event_type);
CREATE INDEX idx_marketing_analytics_page ON public.marketing_analytics(page);

-- Function to get marketing stats
CREATE OR REPLACE FUNCTION public.get_marketing_stats(days_back integer DEFAULT 30)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result json;
  total_views bigint;
  unique_sessions bigint;
  total_cta_clicks bigint;
  total_simulations bigint;
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

  -- Total page views
  SELECT COUNT(*) INTO total_views
  FROM public.marketing_analytics
  WHERE event_type = 'page_view' AND created_at >= start_date;

  -- Unique sessions
  SELECT COUNT(DISTINCT session_id) INTO unique_sessions
  FROM public.marketing_analytics
  WHERE event_type = 'page_view' AND created_at >= start_date AND session_id IS NOT NULL;

  -- CTA clicks
  SELECT COUNT(*) INTO total_cta_clicks
  FROM public.marketing_analytics
  WHERE event_type = 'cta_click' AND created_at >= start_date;

  -- IK simulations
  SELECT COUNT(*) INTO total_simulations
  FROM public.marketing_analytics
  WHERE event_type = 'ik_simulation' AND created_at >= start_date;

  -- Device breakdown
  SELECT COUNT(*) INTO mobile_views
  FROM public.marketing_analytics
  WHERE event_type = 'page_view' AND device_type = 'mobile' AND created_at >= start_date;

  SELECT COUNT(*) INTO desktop_views
  FROM public.marketing_analytics
  WHERE event_type = 'page_view' AND device_type = 'desktop' AND created_at >= start_date;

  SELECT COUNT(*) INTO tablet_views
  FROM public.marketing_analytics
  WHERE event_type = 'page_view' AND device_type = 'tablet' AND created_at >= start_date;

  result := json_build_object(
    'total_views', COALESCE(total_views, 0),
    'unique_sessions', COALESCE(unique_sessions, 0),
    'total_cta_clicks', COALESCE(total_cta_clicks, 0),
    'total_simulations', COALESCE(total_simulations, 0),
    'mobile_views', COALESCE(mobile_views, 0),
    'desktop_views', COALESCE(desktop_views, 0),
    'tablet_views', COALESCE(tablet_views, 0),
    'mobile_pct', CASE WHEN total_views > 0 THEN ROUND((mobile_views::numeric / total_views::numeric) * 100, 1) ELSE 0 END,
    'desktop_pct', CASE WHEN total_views > 0 THEN ROUND((desktop_views::numeric / total_views::numeric) * 100, 1) ELSE 0 END
  );

  RETURN result;
END;
$$;

-- Function to get views by day
CREATE OR REPLACE FUNCTION public.get_marketing_views_by_day(days_back integer DEFAULT 30)
RETURNS TABLE(day date, views bigint, unique_visitors bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only admins can call this
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  RETURN QUERY
  SELECT 
    d.day::date,
    COUNT(ma.id) as views,
    COUNT(DISTINCT ma.session_id) as unique_visitors
  FROM generate_series(
    CURRENT_DATE - days_back,
    CURRENT_DATE,
    '1 day'::interval
  ) AS d(day)
  LEFT JOIN public.marketing_analytics ma 
    ON ma.created_at::date = d.day::date 
    AND ma.event_type = 'page_view'
  GROUP BY d.day
  ORDER BY d.day;
END;
$$;

-- Function to get stats by page
CREATE OR REPLACE FUNCTION public.get_marketing_stats_by_page(days_back integer DEFAULT 30)
RETURNS TABLE(page text, views bigint, cta_clicks bigint, simulations bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  start_date timestamp;
BEGIN
  -- Only admins can call this
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin role required';
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
  GROUP BY ma.page
  ORDER BY views DESC;
END;
$$;