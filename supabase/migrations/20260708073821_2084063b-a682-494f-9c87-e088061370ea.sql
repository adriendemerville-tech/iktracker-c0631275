CREATE TABLE public.calendar_connection_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('google', 'outlook', 'ics')),
  status TEXT NOT NULL CHECK (status IN ('success', 'failure')),
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_calendar_connection_attempts_user_created
  ON public.calendar_connection_attempts(user_id, created_at DESC);
CREATE INDEX idx_calendar_connection_attempts_provider_status
  ON public.calendar_connection_attempts(provider, status, created_at DESC);

GRANT INSERT ON public.calendar_connection_attempts TO authenticated, service_role;
GRANT SELECT ON public.calendar_connection_attempts TO authenticated, service_role;
GRANT ALL ON public.calendar_connection_attempts TO service_role;

ALTER TABLE public.calendar_connection_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own calendar connection attempts"
  ON public.calendar_connection_attempts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all calendar connection attempts"
  ON public.calendar_connection_attempts FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert their own calendar connection attempts"
  ON public.calendar_connection_attempts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage calendar connection attempts"
  ON public.calendar_connection_attempts FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.get_calendar_connection_stats(days_back integer DEFAULT 30)
RETURNS TABLE(
  provider text,
  total_attempts bigint,
  successful_attempts bigint,
  failed_attempts bigint
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_admin_or_viewer_role(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT
    c.provider,
    COUNT(*)::bigint AS total_attempts,
    COUNT(*) FILTER (WHERE c.status = 'success')::bigint AS successful_attempts,
    COUNT(*) FILTER (WHERE c.status = 'failure')::bigint AS failed_attempts
  FROM public.calendar_connection_attempts c
  WHERE c.created_at >= NOW() - (days_back || ' days')::interval
  GROUP BY c.provider
  ORDER BY c.provider;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_calendar_attempts_by_day(
  days_back integer DEFAULT 30,
  _provider text DEFAULT NULL
)
RETURNS TABLE(day date, total_attempts bigint, successful_attempts bigint, failed_attempts bigint)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_admin_or_viewer_role(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT
    d.day::date,
    COUNT(c.id)::bigint AS total_attempts,
    COUNT(c.id) FILTER (WHERE c.status = 'success')::bigint AS successful_attempts,
    COUNT(c.id) FILTER (WHERE c.status = 'failure')::bigint AS failed_attempts
  FROM generate_series(CURRENT_DATE - days_back, CURRENT_DATE, '1 day'::interval) AS d(day)
  LEFT JOIN public.calendar_connection_attempts c
    ON c.created_at::date = d.day::date
    AND (_provider IS NULL OR c.provider = _provider)
  GROUP BY d.day
  ORDER BY d.day;
END;
$$;