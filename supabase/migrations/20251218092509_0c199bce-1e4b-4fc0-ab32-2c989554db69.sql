
CREATE OR REPLACE FUNCTION public.get_download_clicks_by_day(days_back integer DEFAULT 30)
 RETURNS TABLE(day date, count bigint)
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
    COUNT(dc.id)
  FROM generate_series(
    CURRENT_DATE - days_back,
    CURRENT_DATE,
    '1 day'::interval
  ) AS d(day)
  LEFT JOIN public.download_clicks dc ON dc.clicked_at::date = d.day::date
  GROUP BY d.day
  ORDER BY d.day;
END;
$function$;
