CREATE OR REPLACE FUNCTION public.tour_haversine_km(
  lat1 double precision, lng1 double precision,
  lat2 double precision, lng2 double precision
) RETURNS double precision
LANGUAGE sql IMMUTABLE PARALLEL SAFE
SET search_path = public
AS $$
  SELECT 2 * 6371 * asin(sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2) +
    cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lng2 - lng1) / 2), 2)
  ));
$$;

REVOKE ALL ON FUNCTION public.tour_haversine_km(double precision, double precision, double precision, double precision) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.tour_points_distance_km(jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.tour_points_detect_stops(jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.tour_session_ingest(uuid, jsonb, jsonb, jsonb, double precision) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.tour_session_finalize(uuid, text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.tour_haversine_km(double precision, double precision, double precision, double precision) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.tour_points_distance_km(jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.tour_points_detect_stops(jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.tour_session_ingest(uuid, jsonb, jsonb, jsonb, double precision) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.tour_session_finalize(uuid, text) TO authenticated, service_role;