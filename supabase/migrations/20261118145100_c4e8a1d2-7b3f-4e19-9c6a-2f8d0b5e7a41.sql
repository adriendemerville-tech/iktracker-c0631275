-- Échappement des jokers ILIKE dans la recherche admin des comptes.
-- À appliquer à la main : ce fichier n'est pas exécuté par le dépôt.
--
-- count_admin_users(text) et search_users(text, integer, integer) gardent
-- leur signature, SECURITY DEFINER, search_path = public, le contrôle
-- has_role admin, les bornes (limit de 1 à 100, offset >= 0) et le tri
-- created_at DESC, id DESC.
--
-- Le terme est échappé avant le filtre : d'abord \ en \\, puis % en \%,
-- puis _ en \_. Le motif utilise ILIKE ... ESCAPE '\'. Un terme vide
-- reste vide et continue de tout renvoyer. Le comptage et la liste
-- appliquent exactement le même filtre.
--
-- Aucune signature ne change, donc aucun DROP FUNCTION : CREATE OR REPLACE
-- remplace le corps sans retirer les GRANT déjà posés. Les surcharges
-- search_users(text) et search_users(text, integer) restent celles retirées
-- par la migration précédente ; elles ne sont pas recréées ici.

CREATE OR REPLACE FUNCTION public.count_admin_users(search_term text DEFAULT ''::text)
RETURNS bigint
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  term text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  term := replace(replace(replace(COALESCE(search_term, ''), '\', '\\'), '%', '\%'), '_', '\_');

  RETURN (
    SELECT COUNT(*)
    FROM auth.users u
    WHERE
      term = '' OR
      u.email ILIKE '%' || term || '%' ESCAPE '\' OR
      u.raw_user_meta_data->>'first_name' ILIKE '%' || term || '%' ESCAPE '\' OR
      u.raw_user_meta_data->>'last_name' ILIKE '%' || term || '%' ESCAPE '\' OR
      u.id::text ILIKE '%' || term || '%' ESCAPE '\'
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.search_users(
  search_term text DEFAULT ''::text,
  limit_count integer DEFAULT 50,
  offset_count integer DEFAULT 0
)
RETURNS TABLE(
  user_id uuid,
  email text,
  first_name text,
  last_name text,
  created_at timestamp with time zone,
  has_plate_detection boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  term text;
  safe_limit integer;
  safe_offset integer;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  term := replace(replace(replace(COALESCE(search_term, ''), '\', '\\'), '%', '\%'), '_', '\_');
  safe_limit := LEAST(GREATEST(COALESCE(limit_count, 50), 1), 100);
  safe_offset := GREATEST(COALESCE(offset_count, 0), 0);

  RETURN QUERY
  SELECT
    u.id AS user_id,
    u.email::text,
    COALESCE(u.raw_user_meta_data->>'first_name', '')::text AS first_name,
    COALESCE(u.raw_user_meta_data->>'last_name', '')::text AS last_name,
    u.created_at,
    EXISTS(
      SELECT 1
      FROM public.vehicles v
      WHERE v.user_id = u.id
        AND v.license_plate IS NOT NULL
        AND v.license_plate <> ''
    ) AS has_plate_detection
  FROM auth.users u
  WHERE
    term = '' OR
    u.email ILIKE '%' || term || '%' ESCAPE '\' OR
    u.raw_user_meta_data->>'first_name' ILIKE '%' || term || '%' ESCAPE '\' OR
    u.raw_user_meta_data->>'last_name' ILIKE '%' || term || '%' ESCAPE '\' OR
    u.id::text ILIKE '%' || term || '%' ESCAPE '\'
  ORDER BY u.created_at DESC, u.id DESC
  LIMIT safe_limit
  OFFSET safe_offset;
END;
$function$;

REVOKE ALL ON FUNCTION public.count_admin_users(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.count_admin_users(text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.search_users(text, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_users(text, integer, integer) TO authenticated, service_role;
