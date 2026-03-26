
DROP FUNCTION public.search_users(text, integer);

CREATE FUNCTION public.search_users(search_term text DEFAULT ''::text, limit_count integer DEFAULT 50)
 RETURNS TABLE(user_id uuid, email text, first_name text, last_name text, created_at timestamp with time zone, has_plate_detection boolean)
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
    u.id as user_id,
    u.email::text,
    COALESCE(u.raw_user_meta_data->>'first_name', '')::text as first_name,
    COALESCE(u.raw_user_meta_data->>'last_name', '')::text as last_name,
    u.created_at,
    EXISTS(SELECT 1 FROM public.vehicles v WHERE v.user_id = u.id AND v.license_plate IS NOT NULL AND v.license_plate != '') as has_plate_detection
  FROM auth.users u
  WHERE 
    search_term = '' OR
    u.email ILIKE '%' || search_term || '%' OR
    u.raw_user_meta_data->>'first_name' ILIKE '%' || search_term || '%' OR
    u.raw_user_meta_data->>'last_name' ILIKE '%' || search_term || '%' OR
    u.id::text ILIKE '%' || search_term || '%'
  ORDER BY u.created_at DESC
  LIMIT limit_count;
END;
$function$;
