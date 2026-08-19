-- 1. Sauvegarde du contenu des articles (filet de sécurité avant toute purge de texte)
CREATE TABLE IF NOT EXISTS public.blog_posts_content_backup (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id uuid NOT NULL,
  content text,
  reason text NOT NULL DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_blog_posts_content_backup_post
  ON public.blog_posts_content_backup (post_id, created_at DESC);

GRANT ALL ON public.blog_posts_content_backup TO service_role;
GRANT SELECT ON public.blog_posts_content_backup TO authenticated;

ALTER TABLE public.blog_posts_content_backup ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read blog content backups" ON public.blog_posts_content_backup;
CREATE POLICY "Admins can read blog content backups"
ON public.blog_posts_content_backup
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Snapshot initial idempotent : une seule sauvegarde 'baseline' par article
INSERT INTO public.blog_posts_content_backup (post_id, content, reason)
SELECT p.id, p.content, 'baseline_2026_08_19'
FROM public.blog_posts p
WHERE NOT EXISTS (
  SELECT 1 FROM public.blog_posts_content_backup b
  WHERE b.post_id = p.id AND b.reason = 'baseline_2026_08_19'
);

-- 2. RPC A/B : suppression du ORDER BY inutile dans le sous-select agrégé en jsonb
CREATE OR REPLACE FUNCTION public.get_ab_test_results(days_back integer DEFAULT 30)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb)
  FROM (
    SELECT
      variant,
      COUNT(DISTINCT session_id) FILTER (WHERE event_type = 'page_view')      AS visitors,
      COUNT(DISTINCT session_id) FILTER (WHERE event_type = 'signup_click')   AS cta_clicks,
      COUNT(DISTINCT session_id) FILTER (WHERE event_type = 'signup_view')    AS signup_views,
      COUNT(DISTINCT session_id) FILTER (WHERE event_type IN ('signup_oauth_start','signup_form_submit')) AS signup_starts,
      COUNT(DISTINCT session_id) FILTER (WHERE event_type = 'signup_success') AS signups
    FROM public.marketing_analytics
    WHERE variant IS NOT NULL
      AND created_at >= now() - (days_back || ' days')::interval
    GROUP BY variant
  ) t;
$$;

REVOKE ALL ON FUNCTION public.get_ab_test_results(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_ab_test_results(integer) TO authenticated;