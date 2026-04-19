-- Table d'événements de reprise de tournée
CREATE TABLE public.tour_recovery_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  session_id UUID,
  trip_id UUID,
  event_type TEXT NOT NULL,
  context TEXT,
  inactivity_seconds INTEGER,
  is_mobile BOOLEAN,
  stops_count INTEGER,
  distance_km DOUBLE PRECISION,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_tour_recovery_events_session ON public.tour_recovery_events(session_id);
CREATE INDEX idx_tour_recovery_events_user ON public.tour_recovery_events(user_id);
CREATE INDEX idx_tour_recovery_events_created ON public.tour_recovery_events(created_at DESC);
CREATE INDEX idx_tour_recovery_events_type ON public.tour_recovery_events(event_type);

ALTER TABLE public.tour_recovery_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own recovery events"
  ON public.tour_recovery_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own recovery events"
  ON public.tour_recovery_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all recovery events"
  ON public.tour_recovery_events FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Viewers can view all recovery events"
  ON public.tour_recovery_events FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'viewer'::app_role));

-- Colonnes agrégées sur tour_sessions
ALTER TABLE public.tour_sessions
  ADD COLUMN recovery_attempts INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN recovery_success INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN notifications_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN last_recovery_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN last_error TEXT;

-- Fonction RPC : registre tournées avec stats reprise (admin)
CREATE OR REPLACE FUNCTION public.get_tour_recovery_registry(
  days_back INTEGER DEFAULT 30,
  limit_count INTEGER DEFAULT 200
)
RETURNS TABLE(
  session_id UUID,
  trip_id UUID,
  user_id UUID,
  user_email TEXT,
  source TEXT,
  is_active BOOLEAN,
  started_at TIMESTAMP WITH TIME ZONE,
  last_activity TIMESTAMP WITH TIME ZONE,
  finalized_at TIMESTAMP WITH TIME ZONE,
  stops_count INTEGER,
  distance_km DOUBLE PRECISION,
  recovery_attempts BIGINT,
  recovery_success BIGINT,
  notifications_count BIGINT,
  errors_count BIGINT,
  last_error TEXT
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_admin_or_viewer_role(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  WITH session_events AS (
    SELECT 
      e.session_id,
      COUNT(*) FILTER (WHERE e.event_type IN ('modal_shown','transparent_resume_attempt','auto_finalize_attempt','resume_clicked')) AS attempts,
      COUNT(*) FILTER (WHERE e.event_type IN ('resume_success','transparent_resume_success','auto_finalize_success')) AS successes,
      COUNT(*) FILTER (WHERE e.event_type IN ('toast_shown','modal_shown')) AS notifs,
      COUNT(*) FILTER (WHERE e.event_type LIKE '%error%' OR e.event_type LIKE '%failure%') AS errors,
      (ARRAY_AGG(e.error_message ORDER BY e.created_at DESC) FILTER (WHERE e.error_message IS NOT NULL))[1] AS last_err
    FROM public.tour_recovery_events e
    WHERE e.created_at >= NOW() - (days_back || ' days')::interval
    GROUP BY e.session_id
  ),
  -- Sessions actives ou récemment actives
  active_sessions AS (
    SELECT 
      ts.id AS sess_id,
      NULL::UUID AS tr_id,
      ts.user_id,
      'active'::TEXT AS src,
      ts.is_active,
      ts.started_at,
      ts.last_activity,
      NULL::TIMESTAMP WITH TIME ZONE AS finalized,
      jsonb_array_length(ts.stops) AS stops,
      ts.total_distance_km AS dist
    FROM public.tour_sessions ts
    WHERE ts.created_at >= NOW() - (days_back || ' days')::interval
  ),
  -- Tournées finalisées
  finalized_trips AS (
    SELECT 
      NULL::UUID AS sess_id,
      t.id AS tr_id,
      t.user_id,
      'finalized'::TEXT AS src,
      false AS is_active,
      t.created_at AS started_at,
      t.created_at AS last_activity,
      t.created_at AS finalized,
      CASE WHEN t.tour_stops IS NOT NULL THEN jsonb_array_length(t.tour_stops) ELSE 0 END AS stops,
      t.distance AS dist
    FROM public.trips t
    WHERE t.tour_stops IS NOT NULL
      AND t.deleted_at IS NULL
      AND t.created_at >= NOW() - (days_back || ' days')::interval
  ),
  combined AS (
    SELECT * FROM active_sessions
    UNION ALL
    SELECT * FROM finalized_trips
  )
  SELECT 
    c.sess_id,
    c.tr_id,
    c.user_id,
    u.email::TEXT,
    c.src,
    c.is_active,
    c.started_at,
    c.last_activity,
    c.finalized,
    c.stops,
    c.dist,
    COALESCE(se.attempts, 0),
    COALESCE(se.successes, 0),
    COALESCE(se.notifs, 0),
    COALESCE(se.errors, 0),
    se.last_err
  FROM combined c
  LEFT JOIN auth.users u ON u.id = c.user_id
  LEFT JOIN session_events se ON se.session_id = c.sess_id
  ORDER BY c.last_activity DESC NULLS LAST
  LIMIT limit_count;
END;
$$;

-- Fonction RPC : stats globales reprise tournée
CREATE OR REPLACE FUNCTION public.get_tour_recovery_stats(days_back INTEGER DEFAULT 30)
RETURNS JSON
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result JSON;
BEGIN
  IF NOT public.has_admin_or_viewer_role(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT json_build_object(
    'total_sessions', (SELECT COUNT(*) FROM public.tour_sessions WHERE created_at >= NOW() - (days_back || ' days')::interval),
    'active_sessions', (SELECT COUNT(*) FROM public.tour_sessions WHERE is_active = true),
    'finalized_tours', (SELECT COUNT(*) FROM public.trips WHERE tour_stops IS NOT NULL AND deleted_at IS NULL AND created_at >= NOW() - (days_back || ' days')::interval),
    'recovery_attempts', (SELECT COUNT(*) FROM public.tour_recovery_events WHERE event_type IN ('modal_shown','transparent_resume_attempt','auto_finalize_attempt','resume_clicked') AND created_at >= NOW() - (days_back || ' days')::interval),
    'recovery_success', (SELECT COUNT(*) FROM public.tour_recovery_events WHERE event_type IN ('resume_success','transparent_resume_success','auto_finalize_success') AND created_at >= NOW() - (days_back || ' days')::interval),
    'recovery_errors', (SELECT COUNT(*) FROM public.tour_recovery_events WHERE (event_type LIKE '%error%' OR event_type LIKE '%failure%') AND created_at >= NOW() - (days_back || ' days')::interval),
    'notifications_total', (SELECT COUNT(*) FROM public.tour_recovery_events WHERE event_type IN ('toast_shown','modal_shown') AND created_at >= NOW() - (days_back || ' days')::interval),
    'events_by_type', (
      SELECT json_object_agg(event_type, c) FROM (
        SELECT event_type, COUNT(*) AS c FROM public.tour_recovery_events
        WHERE created_at >= NOW() - (days_back || ' days')::interval
        GROUP BY event_type
      ) sub
    )
  ) INTO result;

  RETURN result;
END;
$$;