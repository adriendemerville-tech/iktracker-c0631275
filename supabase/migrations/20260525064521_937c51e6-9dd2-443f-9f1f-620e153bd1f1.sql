
-- 1) Stats compteurs Mode Tournée
CREATE OR REPLACE FUNCTION public.get_tour_mode_stats(days_back integer DEFAULT 30)
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result json;
  v_total int;
  v_finalized_auto int;
  v_finalized_manual int;
  v_abandoned int;
  v_active int;
  v_avg_stops numeric;
  v_avg_km numeric;
  v_avg_duration numeric;
  v_unique_users_7d int;
  v_unique_users_period int;
BEGIN
  IF NOT public.has_admin_or_viewer_role(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Tournées finalisées (trips avec tour_stops) sur la période
  SELECT COUNT(*),
         COALESCE(AVG(jsonb_array_length(tour_stops)), 0),
         COALESCE(AVG(distance), 0)
  INTO v_total, v_avg_stops, v_avg_km
  FROM public.trips
  WHERE tour_stops IS NOT NULL
    AND deleted_at IS NULL
    AND created_at >= NOW() - (days_back || ' days')::interval;

  -- Auto-finalisées : trips liés à un event auto_finalize_success
  SELECT COUNT(DISTINCT t.id)
  INTO v_finalized_auto
  FROM public.trips t
  JOIN public.tour_recovery_events e
    ON e.trip_id = t.id
   AND e.event_type = 'auto_finalize_success'
  WHERE t.tour_stops IS NOT NULL
    AND t.deleted_at IS NULL
    AND t.created_at >= NOW() - (days_back || ' days')::interval;

  v_finalized_manual := GREATEST(v_total - v_finalized_auto, 0);

  -- Sessions actives en cours
  SELECT COUNT(*) INTO v_active
  FROM public.tour_sessions
  WHERE is_active = true;

  -- Sessions abandonnées : actives mais sans activité depuis >24h
  SELECT COUNT(*) INTO v_abandoned
  FROM public.tour_sessions
  WHERE is_active = true
    AND last_activity < NOW() - interval '24 hours';

  -- Durée moyenne (minutes) à partir de tour_sessions finalisées (is_active=false) sur période
  SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (last_activity - started_at)) / 60.0), 0)
  INTO v_avg_duration
  FROM public.tour_sessions
  WHERE is_active = false
    AND created_at >= NOW() - (days_back || ' days')::interval;

  -- Utilisateurs uniques ayant créé une tournée sur 7 derniers jours
  SELECT COUNT(DISTINCT t.user_id) INTO v_unique_users_7d
  FROM public.trips t
  WHERE t.tour_stops IS NOT NULL
    AND t.deleted_at IS NULL
    AND t.created_at >= NOW() - interval '7 days'
    AND NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = t.user_id AND ur.role = 'admin');

  -- Utilisateurs uniques sur la période complète
  SELECT COUNT(DISTINCT t.user_id) INTO v_unique_users_period
  FROM public.trips t
  WHERE t.tour_stops IS NOT NULL
    AND t.deleted_at IS NULL
    AND t.created_at >= NOW() - (days_back || ' days')::interval
    AND NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = t.user_id AND ur.role = 'admin');

  result := json_build_object(
    'total_tours', v_total,
    'finalized_manual', v_finalized_manual,
    'finalized_auto', v_finalized_auto,
    'active_sessions', v_active,
    'abandoned_sessions', v_abandoned,
    'avg_stops', ROUND(v_avg_stops::numeric, 1),
    'avg_km', ROUND(v_avg_km::numeric, 1),
    'avg_duration_min', ROUND(v_avg_duration::numeric, 0),
    'unique_users_7d', v_unique_users_7d,
    'unique_users_period', v_unique_users_period
  );
  RETURN result;
END;
$$;

-- 2) Série journalière : tournées + utilisateurs uniques 7j glissants
CREATE OR REPLACE FUNCTION public.get_tour_mode_daily(days_back integer DEFAULT 30)
RETURNS TABLE(day date, tours_created bigint, unique_users_7d_rolling bigint)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_admin_or_viewer_role(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT
    d.day::date,
    (
      SELECT COUNT(*)::bigint
      FROM public.trips t
      WHERE t.tour_stops IS NOT NULL
        AND t.deleted_at IS NULL
        AND t.created_at::date = d.day::date
        AND NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = t.user_id AND ur.role = 'admin')
    ),
    (
      SELECT COUNT(DISTINCT t.user_id)::bigint
      FROM public.trips t
      WHERE t.tour_stops IS NOT NULL
        AND t.deleted_at IS NULL
        AND t.created_at::date BETWEEN (d.day::date - 6) AND d.day::date
        AND NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = t.user_id AND ur.role = 'admin')
    )
  FROM generate_series(CURRENT_DATE - days_back, CURRENT_DATE, '1 day'::interval) AS d(day)
  ORDER BY d.day;
END;
$$;

-- 3) Distribution par persona des utilisateurs Mode Tournée
CREATE OR REPLACE FUNCTION public.get_tour_mode_personas(days_back integer DEFAULT 30)
RETURNS TABLE(persona text, users_count bigint, tours_count bigint)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_admin_or_viewer_role(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT
    COALESCE(up.persona, 'non renseigné')::text AS persona,
    COUNT(DISTINCT t.user_id)::bigint AS users_count,
    COUNT(*)::bigint AS tours_count
  FROM public.trips t
  LEFT JOIN public.user_preferences up ON up.user_id = t.user_id
  WHERE t.tour_stops IS NOT NULL
    AND t.deleted_at IS NULL
    AND t.created_at >= NOW() - (days_back || ' days')::interval
    AND NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = t.user_id AND ur.role = 'admin')
  GROUP BY COALESCE(up.persona, 'non renseigné')
  ORDER BY tours_count DESC;
END;
$$;
