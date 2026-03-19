
CREATE OR REPLACE FUNCTION public.get_api_cost_by_model(days_back integer DEFAULT 30)
 RETURNS TABLE(model text, request_count bigint, tokens_in bigint, tokens_out bigint, cost numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  RETURN QUERY
  SELECT 
    COALESCE(a.model, 'unknown')::text as model,
    COUNT(*)::bigint as request_count,
    COALESCE(SUM(a.tokens_input), 0)::bigint as tokens_in,
    COALESCE(SUM(a.tokens_output), 0)::bigint as tokens_out,
    ROUND(COALESCE(SUM(a.cost_euros), 0), 4) as cost
  FROM public.api_usage_logs a
  WHERE a.created_at >= NOW() - (days_back || ' days')::interval
  GROUP BY COALESCE(a.model, 'unknown')
  ORDER BY cost DESC;
END;
$function$;
