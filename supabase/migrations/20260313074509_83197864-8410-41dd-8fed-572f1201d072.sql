
-- Table to track API/edge function usage for cost monitoring
CREATE TABLE public.api_usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  function_name text NOT NULL,
  tokens_input integer DEFAULT 0,
  tokens_output integer DEFAULT 0,
  model text,
  cost_euros numeric(10, 6) DEFAULT 0,
  user_id uuid,
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE public.api_usage_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can read
CREATE POLICY "Admins can view all usage logs"
ON public.api_usage_logs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Edge functions can insert (using service role, but also allow authenticated inserts)
CREATE POLICY "Authenticated users can insert usage logs"
ON public.api_usage_logs
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Admin RPC to get cost stats
CREATE OR REPLACE FUNCTION public.get_api_cost_stats(days_back integer DEFAULT 30)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result json;
  total_requests bigint;
  total_tokens_in bigint;
  total_tokens_out bigint;
  total_cost numeric;
  period_requests bigint;
  period_tokens_in bigint;
  period_tokens_out bigint;
  period_cost numeric;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  -- All-time stats
  SELECT 
    COUNT(*),
    COALESCE(SUM(tokens_input), 0),
    COALESCE(SUM(tokens_output), 0),
    COALESCE(SUM(cost_euros), 0)
  INTO total_requests, total_tokens_in, total_tokens_out, total_cost
  FROM public.api_usage_logs;

  -- Period stats
  SELECT 
    COUNT(*),
    COALESCE(SUM(tokens_input), 0),
    COALESCE(SUM(tokens_output), 0),
    COALESCE(SUM(cost_euros), 0)
  INTO period_requests, period_tokens_in, period_tokens_out, period_cost
  FROM public.api_usage_logs
  WHERE created_at >= NOW() - (days_back || ' days')::interval;

  result := json_build_object(
    'total_requests', total_requests,
    'total_tokens_input', total_tokens_in,
    'total_tokens_output', total_tokens_out,
    'total_cost', ROUND(total_cost, 4),
    'period_requests', period_requests,
    'period_tokens_input', period_tokens_in,
    'period_tokens_output', period_tokens_out,
    'period_cost', ROUND(period_cost, 4)
  );

  RETURN result;
END;
$$;

-- Cost breakdown by function
CREATE OR REPLACE FUNCTION public.get_api_cost_by_function(days_back integer DEFAULT 30)
RETURNS TABLE(function_name text, request_count bigint, tokens_in bigint, tokens_out bigint, cost numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  RETURN QUERY
  SELECT 
    a.function_name,
    COUNT(*)::bigint as request_count,
    COALESCE(SUM(a.tokens_input), 0)::bigint as tokens_in,
    COALESCE(SUM(a.tokens_output), 0)::bigint as tokens_out,
    ROUND(COALESCE(SUM(a.cost_euros), 0), 4) as cost
  FROM public.api_usage_logs a
  WHERE a.created_at >= NOW() - (days_back || ' days')::interval
  GROUP BY a.function_name
  ORDER BY cost DESC;
END;
$$;

-- Daily cost breakdown
CREATE OR REPLACE FUNCTION public.get_api_cost_by_day(days_back integer DEFAULT 30)
RETURNS TABLE(day date, request_count bigint, tokens bigint, cost numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  RETURN QUERY
  SELECT 
    d.day::date,
    COUNT(a.id)::bigint as request_count,
    COALESCE(SUM(a.tokens_input + a.tokens_output), 0)::bigint as tokens,
    ROUND(COALESCE(SUM(a.cost_euros), 0), 4) as cost
  FROM generate_series(
    CURRENT_DATE - days_back,
    CURRENT_DATE,
    '1 day'::interval
  ) AS d(day)
  LEFT JOIN public.api_usage_logs a ON a.created_at::date = d.day::date
  GROUP BY d.day
  ORDER BY d.day;
END;
$$;
