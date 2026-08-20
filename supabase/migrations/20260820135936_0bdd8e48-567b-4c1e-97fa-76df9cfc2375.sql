CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA extensions;

ALTER TABLE public.blog_posts
  ADD COLUMN IF NOT EXISTS seo_indexable boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.blog_posts.seo_indexable IS 'When false, the article is excluded from sitemap.xml and rendered with robots noindex (near-duplicate / thin content control).';