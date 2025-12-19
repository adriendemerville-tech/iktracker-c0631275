-- Create a function to search users by email, first name, or last name
CREATE OR REPLACE FUNCTION public.search_users(search_term text DEFAULT '', limit_count integer DEFAULT 50)
RETURNS TABLE(
  user_id uuid,
  email text,
  first_name text,
  last_name text,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only admins can call this
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  RETURN QUERY
  SELECT 
    u.id as user_id,
    u.email::text,
    COALESCE(u.raw_user_meta_data->>'first_name', '')::text as first_name,
    COALESCE(u.raw_user_meta_data->>'last_name', '')::text as last_name,
    u.created_at
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
$$;