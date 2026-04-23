
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
    'total', (SELECT COUNT(*) FROM auth.users),
    'counts', (
      SELECT json_object_agg(persona_key, cnt)
      FROM (
        SELECT
          COALESCE(NULLIF(up.persona, ''), 'undefined') AS persona_key,
          COUNT(*) AS cnt
        FROM auth.users u
        LEFT JOIN public.user_preferences up ON up.user_id = u.id
        GROUP BY COALESCE(NULLIF(up.persona, ''), 'undefined')
      ) sub
    )
  ) INTO result;

  RETURN result;
END;
$$;
