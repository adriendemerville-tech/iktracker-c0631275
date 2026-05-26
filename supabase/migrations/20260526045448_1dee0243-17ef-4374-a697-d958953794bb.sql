CREATE OR REPLACE FUNCTION public.get_tour_mode_users(days_back integer DEFAULT 30)
RETURNS TABLE(
  user_id uuid,
  email text,
  persona text,
  tours_count bigint,
  total_km numeric,
  first_tour_at timestamptz,
  last_tour_at timestamptz
)
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
    t.user_id,
    COALESCE(u.email, '—')::text AS email,
    COALESCE(up.persona, 'non renseigné')::text AS persona,
    COUNT(*)::bigint AS tours_count,
    COALESCE(ROUND(SUM(t.distance)::numeric, 1), 0) AS total_km,
    MIN(t.created_at) AS first_tour_at,
    MAX(t.created_at) AS last_tour_at
  FROM public.trips t
  LEFT JOIN public.user_preferences up ON up.user_id = t.user_id
  LEFT JOIN auth.users u ON u.id = t.user_id
  WHERE t.tour_stops IS NOT NULL
    AND t.deleted_at IS NULL
    AND t.created_at >= NOW() - (days_back || ' days')::interval
    AND NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = t.user_id AND ur.role = 'admin')
  GROUP BY t.user_id, u.email, up.persona
  ORDER BY tours_count DESC, last_tour_at DESC;
END;
$function$;