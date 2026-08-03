GRANT SELECT ON public.blog_posts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blog_posts TO authenticated;
GRANT ALL ON public.blog_posts TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.blog_slug_blacklist TO authenticated;
GRANT ALL ON public.blog_slug_blacklist TO service_role;

GRANT ALL ON public.blog_api_keys TO service_role;