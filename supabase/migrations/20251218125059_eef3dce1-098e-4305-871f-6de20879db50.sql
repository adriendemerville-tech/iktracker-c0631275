-- Create function to get recent signups
CREATE OR REPLACE FUNCTION public.get_recent_signups(limit_count integer DEFAULT 10)
RETURNS TABLE (
  user_id uuid,
  email text,
  created_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    id as user_id,
    email,
    created_at
  FROM auth.users
  ORDER BY created_at DESC
  LIMIT limit_count;
$$;

-- Grant execute permission to authenticated users (will be restricted by has_role check in app)
GRANT EXECUTE ON FUNCTION public.get_recent_signups TO authenticated;