-- 1. Update the RPC to return distinct users per provider/status
CREATE OR REPLACE FUNCTION public.get_calendar_connection_stats(days_back integer DEFAULT 30)
 RETURNS TABLE(provider text, total_attempts bigint, successful_attempts bigint, failed_attempts bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_admin_or_viewer_role(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT
    c.provider,
    COUNT(DISTINCT c.user_id)::bigint AS total_attempts,
    COUNT(DISTINCT c.user_id) FILTER (
      WHERE EXISTS (
        SELECT 1 FROM public.calendar_connection_attempts c2
        WHERE c2.user_id = c.user_id AND c2.provider = c.provider AND c2.status = 'success'
          AND c2.created_at >= NOW() - (days_back || ' days')::interval
      )
    )::bigint AS successful_attempts,
    COUNT(DISTINCT c.user_id) FILTER (
      WHERE NOT EXISTS (
        SELECT 1 FROM public.calendar_connection_attempts c3
        WHERE c3.user_id = c.user_id AND c3.provider = c.provider AND c3.status = 'success'
          AND c3.created_at >= NOW() - (days_back || ' days')::interval
      )
    )::bigint AS failed_attempts
  FROM public.calendar_connection_attempts c
  WHERE c.created_at >= NOW() - (days_back || ' days')::interval
  GROUP BY c.provider
  ORDER BY c.provider;
END;
$function$;

-- 2. Backfill: register a synthetic success attempt for every existing ICS connection
INSERT INTO public.calendar_connection_attempts (user_id, provider, status, metadata, created_at)
SELECT cc.user_id, 'ics', 'success',
       jsonb_build_object('trigger', 'backfill_from_existing_connection'),
       cc.created_at
FROM public.calendar_connections cc
WHERE cc.provider = 'ics'
  AND NOT EXISTS (
    SELECT 1 FROM public.calendar_connection_attempts a
    WHERE a.user_id = cc.user_id AND a.provider = 'ics'
  );