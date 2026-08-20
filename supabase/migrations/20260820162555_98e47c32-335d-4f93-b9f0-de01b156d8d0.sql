CREATE TABLE IF NOT EXISTS public.link_status_cache (
  url text PRIMARY KEY,
  status integer,
  checked_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.link_status_cache TO service_role;
ALTER TABLE public.link_status_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view link status cache"
  ON public.link_status_cache FOR SELECT TO authenticated
  USING (public.has_admin_or_viewer_role(auth.uid()));
GRANT SELECT ON public.link_status_cache TO authenticated;

CREATE INDEX IF NOT EXISTS link_status_cache_checked_at_idx ON public.link_status_cache (checked_at);

-- Cron LinkedIn audit : toutes les heures au lieu de toutes les 5 minutes
SELECT cron.alter_job(80, schedule => '0 * * * *');

-- Liens internes morts dans les articles publiés
UPDATE public.blog_posts SET content = replace(content, '/simulateur/calcul-des-indemnites-kilometriques/', '/bareme-ik-2026') WHERE content LIKE '%/simulateur/calcul-des-indemnites-kilometriques/%';
UPDATE public.blog_posts SET content = replace(content, '/simulateur-bareme-kilometrique', '/bareme-ik-2026') WHERE content LIKE '%/simulateur-bareme-kilometrique%';
UPDATE public.blog_posts SET content = replace(content, '/deduction-frais-reels', '/frais-reels') WHERE content LIKE '%/deduction-frais-reels%';
UPDATE public.blog_posts SET content = replace(content, '/auto-entrepreneur-ik', '/independants') WHERE content LIKE '%/auto-entrepreneur-ik%';
UPDATE public.blog_posts SET content = replace(content, '/vehicules-electriques', '/bareme-ik-2026') WHERE content LIKE '%/vehicules-electriques%';
UPDATE public.blog_posts SET content = replace(content, '/journal-trajet', '/mes-trajets') WHERE content LIKE '%/journal-trajet%';
UPDATE public.blog_posts SET content = replace(content, '](/simulateur)', '](/bareme-ik-2026)') WHERE content LIKE '%](/simulateur)%';
UPDATE public.blog_posts SET content = replace(content, 'href="/simulateur"', 'href="/bareme-ik-2026"') WHERE content LIKE '%href="/simulateur"%';