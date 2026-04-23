
-- 1. Update existing NULL/empty persona to 'undefined'
UPDATE public.user_preferences 
SET persona = 'undefined' 
WHERE persona IS NULL OR persona = '';

-- 2. Insert user_preferences rows for auth.users who don't have one
INSERT INTO public.user_preferences (user_id, persona)
SELECT u.id, 'undefined'
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_preferences up WHERE up.user_id = u.id
);

-- 3. Set default value and NOT NULL constraint
ALTER TABLE public.user_preferences 
  ALTER COLUMN persona SET DEFAULT 'undefined',
  ALTER COLUMN persona SET NOT NULL;

-- 4. Simplify get_persona_distribution (no more COALESCE/NULLIF needed)
CREATE OR REPLACE FUNCTION public.get_persona_distribution()
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result json;
BEGIN
  IF NOT public.has_admin_or_viewer_role(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT json_build_object(
    'total', (SELECT COUNT(*) FROM public.user_preferences),
    'counts', (
      SELECT json_object_agg(persona, cnt)
      FROM (
        SELECT persona, COUNT(*) AS cnt
        FROM public.user_preferences
        GROUP BY persona
      ) sub
    )
  ) INTO result;

  RETURN result;
END;
$$;
