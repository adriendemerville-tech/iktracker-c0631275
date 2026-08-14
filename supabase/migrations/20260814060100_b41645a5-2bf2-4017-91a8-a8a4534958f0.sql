CREATE OR REPLACE FUNCTION public.get_total_tours_count(start_date date DEFAULT NULL::date, end_date date DEFAULT NULL::date)
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COUNT(*)::integer
  FROM tour_sessions s
  WHERE NOT EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = s.user_id
        AND ur.role = 'admin'
    )
    AND (start_date IS NULL OR s.started_at::date >= start_date)
    AND (end_date IS NULL OR s.started_at::date <= end_date)
$function$;