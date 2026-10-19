DROP POLICY "Public can read site config" ON public.site_config;
DROP POLICY "Viewers can view site config" ON public.site_config;
REVOKE SELECT ON public.site_config FROM anon;
ALTER POLICY "forum_categories_public_read" ON public.forum_categories TO authenticated USING ((SELECT auth.uid()) IS NOT NULL);
REVOKE SELECT ON public.forum_categories FROM anon;
DROP POLICY "forum_profiles_public_read" ON public.forum_profiles;
CREATE POLICY "forum_profiles_owner_admin_read" ON public.forum_profiles FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()) OR public.has_role((SELECT auth.uid()), 'admin'::public.app_role));
REVOKE SELECT ON public.forum_profiles FROM anon;
CREATE VIEW public.forum_public_profiles WITH (security_barrier = true) AS
SELECT user_id,
  CASE WHEN pseudo_enabled IS TRUE THEN pseudo ELSE 'Membre anonyme'::text END AS pseudo,
  CASE WHEN pseudo_enabled IS TRUE THEN avatar_url ELSE NULL::text END AS avatar_url,
  NULL::text AS bio, NULL::text AS persona, NULL::text AS city, NULL::text AS vehicle,
  level, points, discussions_count, replies_count, upvotes_received, member_since, pseudo_enabled, is_moderator
FROM public.forum_profiles;
REVOKE ALL ON public.forum_public_profiles FROM PUBLIC;
GRANT SELECT ON public.forum_public_profiles TO anon, authenticated, service_role;
COMMENT ON VIEW public.forum_public_profiles IS 'Read-only public projection, intentionally owner-executed: masks disabled pseudonyms and excludes private profile values; base table remains owner/admin protected.';
DROP POLICY "Anyone can read page contents" ON public.page_contents;
REVOKE SELECT ON public.page_contents FROM anon;
CREATE VIEW public.public_page_contents WITH (security_barrier = true) AS
SELECT id, page_key, title, meta_title, meta_description, content, updated_at, schema_org, canonical_url
FROM public.page_contents;
REVOKE ALL ON public.public_page_contents FROM PUBLIC;
GRANT SELECT ON public.public_page_contents TO anon, authenticated, service_role;
COMMENT ON VIEW public.public_page_contents IS 'Read-only owner-executed public text and SEO projection; updated_by is never exposed; base table remains admin protected.';