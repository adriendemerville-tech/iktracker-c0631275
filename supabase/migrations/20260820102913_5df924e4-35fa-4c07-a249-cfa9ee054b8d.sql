ALTER TABLE public.tour_sessions
  ADD COLUMN IF NOT EXISTS finalized_at timestamptz,
  ADD COLUMN IF NOT EXISTS finalize_reason text,
  ADD COLUMN IF NOT EXISTS trip_id uuid REFERENCES public.trips(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tour_sessions_active_activity
  ON public.tour_sessions (last_activity) WHERE is_active;

-- Haversine distance in km
CREATE OR REPLACE FUNCTION public.tour_haversine_km(
  lat1 double precision, lng1 double precision,
  lat2 double precision, lng2 double precision
) RETURNS double precision
LANGUAGE sql IMMUTABLE PARALLEL SAFE
AS $$
  SELECT 2 * 6371 * asin(sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2) +
    cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lng2 - lng1) / 2), 2)
  ));
$$;

-- Server-side distance from a jsonb array of {lat,lng,timestamp}
CREATE OR REPLACE FUNCTION public.tour_points_distance_km(_points jsonb)
RETURNS double precision
LANGUAGE plpgsql IMMUTABLE
SET search_path = public
AS $$
DECLARE
  total double precision := 0;
  prev jsonb;
  cur jsonb;
  seg double precision;
  secs double precision;
BEGIN
  IF _points IS NULL OR jsonb_typeof(_points) <> 'array' THEN RETURN 0; END IF;
  FOR cur IN SELECT * FROM jsonb_array_elements(_points) LOOP
    IF prev IS NOT NULL THEN
      seg := public.tour_haversine_km(
        (prev->>'lat')::double precision, (prev->>'lng')::double precision,
        (cur->>'lat')::double precision, (cur->>'lng')::double precision);
      secs := greatest(1, ((cur->>'timestamp')::double precision - (prev->>'timestamp')::double precision) / 1000);
      -- same filters as the client: ignore <50 m jitter and >50 m/s aberrations
      IF seg * 1000 >= 50 AND (seg * 1000 / secs) <= 50 THEN
        total := total + seg;
      END IF;
    END IF;
    prev := cur;
  END LOOP;
  RETURN round(total::numeric, 3);
END;
$$;

-- Server-side stop detection (>= 7 min within 100 m)
CREATE OR REPLACE FUNCTION public.tour_points_detect_stops(_points jsonb)
RETURNS jsonb
LANGUAGE plpgsql IMMUTABLE
SET search_path = public
AS $$
DECLARE
  stops jsonb := '[]'::jsonb;
  anchor jsonb;
  cur jsonb;
  anchor_ms double precision;
BEGIN
  IF _points IS NULL OR jsonb_typeof(_points) <> 'array' THEN RETURN stops; END IF;
  FOR cur IN SELECT * FROM jsonb_array_elements(_points) LOOP
    IF anchor IS NULL THEN
      anchor := cur; anchor_ms := (cur->>'timestamp')::double precision;
      CONTINUE;
    END IF;
    IF public.tour_haversine_km(
         (anchor->>'lat')::double precision, (anchor->>'lng')::double precision,
         (cur->>'lat')::double precision, (cur->>'lng')::double precision) * 1000 > 100 THEN
      anchor := cur; anchor_ms := (cur->>'timestamp')::double precision;
    ELSIF (cur->>'timestamp')::double precision - anchor_ms >= 420000 THEN
      stops := stops || jsonb_build_array(jsonb_build_object(
        'id', gen_random_uuid(),
        'lat', (anchor->>'lat')::double precision,
        'lng', (anchor->>'lng')::double precision,
        'timestamp', to_char(to_timestamp(anchor_ms / 1000) AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
        'source', 'server'
      ));
      anchor := cur; anchor_ms := (cur->>'timestamp')::double precision;
    END IF;
  END LOOP;
  RETURN stops;
END;
$$;

-- Authoritative ingest: the tab only sends raw sensor data, the server owns state
CREATE OR REPLACE FUNCTION public.tour_session_ingest(
  _session_id uuid,
  _points jsonb DEFAULT '[]'::jsonb,
  _stops jsonb DEFAULT NULL,
  _pending_stop jsonb DEFAULT NULL,
  _client_distance_km double precision DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s public.tour_sessions%ROWTYPE;
  merged jsonb;
  server_km double precision;
  final_km double precision;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;

  SELECT * INTO s FROM public.tour_sessions
   WHERE id = COALESCE(_session_id, id) AND user_id = auth.uid() AND is_active
   ORDER BY started_at DESC LIMIT 1;

  IF NOT FOUND THEN RETURN jsonb_build_object('found', false); END IF;

  -- merge + dedupe points by timestamp, keep chronological order, cap at 5000
  SELECT COALESCE(jsonb_agg(p ORDER BY (p->>'timestamp')::double precision), '[]'::jsonb)
    INTO merged
  FROM (
    SELECT DISTINCT ON ((p->>'timestamp')) p
    FROM jsonb_array_elements(COALESCE(s.gps_points, '[]'::jsonb) || COALESCE(_points, '[]'::jsonb)) p
  ) d(p);

  IF jsonb_array_length(merged) > 5000 THEN
    SELECT jsonb_build_array(merged->0) || COALESCE(jsonb_agg(e ORDER BY ord), '[]'::jsonb)
      INTO merged
    FROM (
      SELECT e, ord FROM jsonb_array_elements(merged) WITH ORDINALITY t(e, ord)
      ORDER BY ord DESC LIMIT 4999
    ) x;
  END IF;

  server_km := public.tour_points_distance_km(merged);
  -- distance is monotonic: never regress on a stale client payload
  final_km := greatest(COALESCE(s.total_distance_km, 0), COALESCE(_client_distance_km, 0), server_km);

  UPDATE public.tour_sessions
     SET gps_points = merged,
         stops = CASE
                   WHEN _stops IS NULL THEN stops
                   WHEN jsonb_array_length(_stops) >= jsonb_array_length(COALESCE(stops, '[]'::jsonb)) THEN _stops
                   ELSE stops
                 END,
         pending_stop = COALESCE(_pending_stop, pending_stop),
         total_distance_km = final_km,
         last_activity = now(),
         updated_at = now()
   WHERE id = s.id
   RETURNING * INTO s;

  RETURN jsonb_build_object(
    'found', true,
    'session_id', s.id,
    'total_distance_km', s.total_distance_km,
    'server_distance_km', server_km,
    'stops', s.stops,
    'gps_points_count', jsonb_array_length(s.gps_points),
    'last_activity', s.last_activity
  );
END;
$$;

-- Authoritative finalization: creates the trip once, idempotent
CREATE OR REPLACE FUNCTION public.tour_session_finalize(
  _session_id uuid,
  _reason text DEFAULT 'client'
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s public.tour_sessions%ROWTYPE;
  eff_stops jsonb;
  stop_count int;
  km double precision;
  v_id uuid;
  first_stop jsonb;
  last_stop jsonb;
  start_loc text;
  end_loc text;
  new_trip uuid;
BEGIN
  SELECT * INTO s FROM public.tour_sessions WHERE id = _session_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('found', false); END IF;

  -- caller must be the owner, unless invoked by the server-side watchdog
  IF auth.uid() IS NOT NULL AND auth.uid() <> s.user_id THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF NOT s.is_active THEN
    RETURN jsonb_build_object('found', true, 'already_finalized', true, 'trip_id', s.trip_id);
  END IF;

  eff_stops := COALESCE(s.stops, '[]'::jsonb);
  IF jsonb_array_length(eff_stops) = 0 THEN
    eff_stops := public.tour_points_detect_stops(COALESCE(s.gps_points, '[]'::jsonb));
  END IF;
  stop_count := jsonb_array_length(eff_stops);
  km := greatest(COALESCE(s.total_distance_km, 0), public.tour_points_distance_km(COALESCE(s.gps_points, '[]'::jsonb)));

  IF stop_count > 0 OR km >= 0.5 THEN
    SELECT id INTO v_id FROM public.vehicles WHERE user_id = s.user_id ORDER BY created_at LIMIT 1;
    first_stop := eff_stops->0;
    last_stop := eff_stops->(stop_count - 1);
    start_loc := COALESCE(first_stop->>'city', first_stop->>'address', 'À compléter');
    end_loc := CASE WHEN stop_count >= 2
                    THEN COALESCE(last_stop->>'city', last_stop->>'address', 'À compléter')
                    ELSE 'À compléter' END;

    INSERT INTO public.trips (
      user_id, vehicle_id, date, start_location, end_location, distance,
      purpose, round_trip, tour_stops, status, source
    ) VALUES (
      s.user_id, v_id, (s.started_at AT TIME ZONE 'UTC')::date,
      start_loc, end_loc, round(km::numeric, 2),
      CASE WHEN stop_count >= 2 THEN 'Tournée récupérée' ELSE 'Trajet à vérifier' END,
      false,
      CASE WHEN stop_count >= 2 THEN eff_stops ELSE NULL END,
      'pending_location', 'tour'
    ) RETURNING id INTO new_trip;
  END IF;

  UPDATE public.tour_sessions
     SET is_active = false,
         finalized_at = now(),
         finalize_reason = _reason,
         trip_id = new_trip,
         stops = eff_stops,
         total_distance_km = km,
         updated_at = now()
   WHERE id = s.id;

  RETURN jsonb_build_object('found', true, 'trip_id', new_trip, 'stops_count', stop_count, 'distance_km', km);
END;
$$;

-- Watchdog: sessions abandoned by the tab are closed server-side
CREATE OR REPLACE FUNCTION public.finalize_stale_tour_sessions(_max_idle interval DEFAULT '3 hours')
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  n int := 0;
BEGIN
  FOR r IN SELECT id FROM public.tour_sessions
            WHERE is_active AND last_activity < now() - _max_idle
  LOOP
    PERFORM public.tour_session_finalize(r.id, 'watchdog_timeout');
    n := n + 1;
  END LOOP;
  RETURN n;
END;
$$;

REVOKE ALL ON FUNCTION public.finalize_stale_tour_sessions(interval) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_stale_tour_sessions(interval) TO service_role;
GRANT EXECUTE ON FUNCTION public.tour_session_ingest(uuid, jsonb, jsonb, jsonb, double precision) TO authenticated;
GRANT EXECUTE ON FUNCTION public.tour_session_finalize(uuid, text) TO authenticated;

SELECT cron.schedule(
  'finalize-stale-tour-sessions',
  '*/15 * * * *',
  $$SELECT public.finalize_stale_tour_sessions('3 hours'::interval);$$
);