
-- Update search_users function to search across all user metadata more inclusively
CREATE OR REPLACE FUNCTION public.search_users(search_term text)
RETURNS TABLE(
  id uuid,
  email text,
  first_name text,
  last_name text,
  created_at timestamptz,
  raw_user_meta_data jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    u.id,
    u.email::text,
    (u.raw_user_meta_data->>'first_name')::text as first_name,
    (u.raw_user_meta_data->>'last_name')::text as last_name,
    u.created_at,
    u.raw_user_meta_data
  FROM auth.users u
  WHERE 
    -- Search in email
    u.email ILIKE '%' || search_term || '%'
    -- Search in first_name
    OR u.raw_user_meta_data->>'first_name' ILIKE '%' || search_term || '%'
    -- Search in last_name  
    OR u.raw_user_meta_data->>'last_name' ILIKE '%' || search_term || '%'
    -- Search in full name (first + last)
    OR (COALESCE(u.raw_user_meta_data->>'first_name', '') || ' ' || COALESCE(u.raw_user_meta_data->>'last_name', '')) ILIKE '%' || search_term || '%'
    -- Search in full metadata as text (catches any field)
    OR u.raw_user_meta_data::text ILIKE '%' || search_term || '%'
  ORDER BY u.created_at DESC
  LIMIT 50;
$$;
