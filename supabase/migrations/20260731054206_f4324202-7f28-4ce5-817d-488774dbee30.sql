CREATE OR REPLACE FUNCTION public.get_recent_signups(limit_count integer DEFAULT 10)
 RETURNS TABLE(user_id uuid, email text, created_at timestamp with time zone)
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT u.id, u.email::text, u.created_at
  FROM auth.users u
  WHERE public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'viewer')
  ORDER BY u.created_at DESC
  LIMIT limit_count;
$function$;

REVOKE ALL ON FUNCTION public.get_recent_signups(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_recent_signups(integer) TO authenticated, service_role;