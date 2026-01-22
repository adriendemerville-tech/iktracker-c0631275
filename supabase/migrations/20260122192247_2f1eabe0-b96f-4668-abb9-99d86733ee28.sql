-- Update get_bareme_simulations_by_day to exclude IPs
CREATE OR REPLACE FUNCTION public.get_bareme_simulations_by_day(days_back integer DEFAULT 5)
 RETURNS TABLE(day date, count bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    DATE(ma.created_at) as day,
    COUNT(*) as count
  FROM marketing_analytics ma
  WHERE ma.event_type = 'simulation'
    AND (ma.page LIKE '%bareme%' OR ma.page LIKE '%barème%' OR ma.page = 'bareme-ik' OR ma.page = 'bareme-ik-2026')
    AND ma.created_at >= CURRENT_DATE - (days_back || ' days')::interval
    AND (ma.ip_address IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.excluded_ips ei 
      WHERE ei.ip_address = ma.ip_address
    ))
  GROUP BY DATE(ma.created_at)
  ORDER BY day ASC;
$function$;