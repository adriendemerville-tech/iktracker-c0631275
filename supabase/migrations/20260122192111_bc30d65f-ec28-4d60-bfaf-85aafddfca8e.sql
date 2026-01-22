-- Add ip_address column to marketing_analytics
ALTER TABLE public.marketing_analytics 
ADD COLUMN IF NOT EXISTS ip_address text;

-- Create table for excluded IPs
CREATE TABLE IF NOT EXISTS public.excluded_ips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ip_address text NOT NULL UNIQUE,
  reason text,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.excluded_ips ENABLE ROW LEVEL SECURITY;

-- Only admins can manage excluded IPs
CREATE POLICY "Admins can manage excluded IPs" 
ON public.excluded_ips 
FOR ALL 
USING (public.has_role(auth.uid(), 'admin'));

-- Insert the IPs to exclude
INSERT INTO public.excluded_ips (ip_address, reason) VALUES 
  ('5.49.156.158', 'Admin/Internal IP'),
  ('176.159.92.217', 'Admin/Internal IP')
ON CONFLICT (ip_address) DO NOTHING;

-- Update get_marketing_stats to exclude IPs
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

  -- Total page views (excluding admin visits and excluded IPs)
  SELECT COUNT(*) INTO total_views
  FROM public.marketing_analytics ma
  WHERE ma.event_type = 'page_view' 
    AND ma.created_at >= start_date
    AND (ma.user_id IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = ma.user_id AND ur.role = 'admin'
    ))
    AND (ma.ip_address IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.excluded_ips ei 
      WHERE ei.ip_address = ma.ip_address
    ));

  -- Unique sessions (excluding admin visits and excluded IPs)
  SELECT COUNT(DISTINCT ma.session_id) INTO unique_sessions
  FROM public.marketing_analytics ma
  WHERE ma.event_type = 'page_view' 
    AND ma.created_at >= start_date 
    AND ma.session_id IS NOT NULL
    AND (ma.user_id IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = ma.user_id AND ur.role = 'admin'
    ))
    AND (ma.ip_address IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.excluded_ips ei 
      WHERE ei.ip_address = ma.ip_address
    ));

  -- CTA clicks (excluding admin visits and excluded IPs)
  SELECT COUNT(*) INTO total_cta_clicks
  FROM public.marketing_analytics ma
  WHERE ma.event_type = 'cta_click' 
    AND ma.created_at >= start_date
    AND (ma.user_id IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = ma.user_id AND ur.role = 'admin'
    ))
    AND (ma.ip_address IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.excluded_ips ei 
      WHERE ei.ip_address = ma.ip_address
    ));

  -- IK simulations (excluding admin visits and excluded IPs)
  SELECT COUNT(*) INTO total_simulations
  FROM public.marketing_analytics ma
  WHERE ma.event_type = 'ik_simulation' 
    AND ma.created_at >= start_date
    AND (ma.user_id IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = ma.user_id AND ur.role = 'admin'
    ))
    AND (ma.ip_address IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.excluded_ips ei 
      WHERE ei.ip_address = ma.ip_address
    ));

  -- Signup clicks (excluding admin visits and excluded IPs)
  SELECT COUNT(*) INTO total_signup_clicks
  FROM public.marketing_analytics ma
  WHERE ma.event_type = 'signup_click' 
    AND ma.created_at >= start_date
    AND (ma.user_id IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = ma.user_id AND ur.role = 'admin'
    ))
    AND (ma.ip_address IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.excluded_ips ei 
      WHERE ei.ip_address = ma.ip_address
    ));

  -- Device breakdown (excluding admin visits and excluded IPs)
  SELECT COUNT(*) INTO mobile_views
  FROM public.marketing_analytics ma
  WHERE ma.event_type = 'page_view' 
    AND ma.device_type = 'mobile' 
    AND ma.created_at >= start_date
    AND (ma.user_id IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = ma.user_id AND ur.role = 'admin'
    ))
    AND (ma.ip_address IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.excluded_ips ei 
      WHERE ei.ip_address = ma.ip_address
    ));

  SELECT COUNT(*) INTO desktop_views
  FROM public.marketing_analytics ma
  WHERE ma.event_type = 'page_view' 
    AND ma.device_type = 'desktop' 
    AND ma.created_at >= start_date
    AND (ma.user_id IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = ma.user_id AND ur.role = 'admin'
    ))
    AND (ma.ip_address IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.excluded_ips ei 
      WHERE ei.ip_address = ma.ip_address
    ));

  SELECT COUNT(*) INTO tablet_views
  FROM public.marketing_analytics ma
  WHERE ma.event_type = 'page_view' 
    AND ma.device_type = 'tablet' 
    AND ma.created_at >= start_date
    AND (ma.user_id IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = ma.user_id AND ur.role = 'admin'
    ))
    AND (ma.ip_address IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.excluded_ips ei 
      WHERE ei.ip_address = ma.ip_address
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

-- Update get_marketing_views_by_day to exclude IPs
CREATE OR REPLACE FUNCTION public.get_marketing_views_by_day(days_back integer DEFAULT 30)
 RETURNS TABLE(day date, views bigint, unique_visitors bigint)
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
    AND (ma.user_id IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = ma.user_id AND ur.role = 'admin'
    ))
    AND (ma.ip_address IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.excluded_ips ei 
      WHERE ei.ip_address = ma.ip_address
    ))
  GROUP BY d.day
  ORDER BY d.day;
END;
$function$;

-- Update get_marketing_stats_by_page to exclude IPs
CREATE OR REPLACE FUNCTION public.get_marketing_stats_by_page(days_back integer DEFAULT 30)
 RETURNS TABLE(page text, views bigint, cta_clicks bigint, simulations bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    AND (ma.user_id IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = ma.user_id AND ur.role = 'admin'
    ))
    AND (ma.ip_address IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.excluded_ips ei 
      WHERE ei.ip_address = ma.ip_address
    ))
  GROUP BY ma.page
  ORDER BY views DESC;
END;
$function$;

-- Update get_signup_clicks_by_day to exclude IPs
CREATE OR REPLACE FUNCTION public.get_signup_clicks_by_day(start_date timestamp with time zone, end_date timestamp with time zone)
 RETURNS TABLE(day date, clicks bigint)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    DATE(ma.created_at) as day,
    COUNT(*) as clicks
  FROM marketing_analytics ma
  WHERE ma.event_type = 'signup_click'
    AND ma.created_at >= start_date
    AND ma.created_at <= end_date
    AND (ma.ip_address IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.excluded_ips ei 
      WHERE ei.ip_address = ma.ip_address
    ))
  GROUP BY DATE(ma.created_at)
  ORDER BY day;
$function$;