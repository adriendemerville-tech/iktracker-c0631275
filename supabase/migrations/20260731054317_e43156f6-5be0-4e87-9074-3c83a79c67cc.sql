CREATE OR REPLACE FUNCTION public.get_referral_sources_stats(days_back integer DEFAULT 30)
RETURNS TABLE(source text, count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT rs.source, count(*)::bigint
  FROM public.referral_sources rs
  WHERE (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'viewer'))
    AND (days_back IS NULL OR rs.created_at >= now() - make_interval(days => days_back))
    AND NOT public.has_role(rs.user_id, 'admin')
  GROUP BY rs.source
  ORDER BY 2 DESC
$$;

REVOKE ALL ON FUNCTION public.get_referral_sources_stats(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_referral_sources_stats(integer) TO authenticated;