-- Déduplication SEO des articles quasi-identiques : on garde le meilleur article
-- de chaque famille de titres, les autres passent en noindex (exclus du sitemap).
DO $$
DECLARE
  r record;
  kept text[] := ARRAY[]::text[];
  k text;
  is_dupe boolean;
BEGIN
  FOR r IN
    SELECT id, lower(extensions.unaccent(title)) AS t
    FROM public.blog_posts
    WHERE status = 'published' AND deleted_at IS NULL
    ORDER BY char_length(content) DESC, published_at DESC
  LOOP
    is_dupe := false;
    FOREACH k IN ARRAY kept LOOP
      IF extensions.similarity(k, r.t) > 0.55 THEN
        is_dupe := true;
        EXIT;
      END IF;
    END LOOP;

    IF is_dupe THEN
      UPDATE public.blog_posts SET seo_indexable = false WHERE id = r.id;
    ELSE
      kept := kept || r.t;
      UPDATE public.blog_posts SET seo_indexable = true WHERE id = r.id;
    END IF;
  END LOOP;
END $$;