GRANT EXECUTE ON FUNCTION public.tour_points_distance_km(jsonb) TO supabase_read_only_user;
GRANT EXECUTE ON FUNCTION public.tour_points_detect_stops(jsonb) TO supabase_read_only_user;
GRANT EXECUTE ON FUNCTION public.tour_haversine_km(double precision, double precision, double precision, double precision) TO supabase_read_only_user;