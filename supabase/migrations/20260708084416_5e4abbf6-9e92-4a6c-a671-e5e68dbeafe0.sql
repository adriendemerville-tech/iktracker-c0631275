
DROP FUNCTION IF EXISTS public.get_persona_distribution();

CREATE OR REPLACE FUNCTION public.get_persona_distribution()
RETURNS TABLE(persona text, count bigint)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_admin_or_viewer_role(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT COALESCE(up.persona, 'unknown')::text AS persona,
         COUNT(*)::bigint AS count
  FROM public.user_preferences up
  WHERE NOT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = up.user_id AND ur.role = 'admin'
  )
  GROUP BY COALESCE(up.persona, 'unknown')
  ORDER BY count DESC;
END;
$function$;
