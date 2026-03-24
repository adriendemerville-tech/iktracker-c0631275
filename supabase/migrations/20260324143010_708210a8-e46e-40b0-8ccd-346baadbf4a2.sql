
ALTER TABLE public.page_contents
  ADD COLUMN IF NOT EXISTS schema_org jsonb DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS canonical_url text DEFAULT NULL;

CREATE TABLE public.site_seo_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key text UNIQUE NOT NULL,
  content text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text
);
ALTER TABLE public.site_seo_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage SEO config" ON public.site_seo_config FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Viewers can view SEO config" ON public.site_seo_config FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'viewer'));

CREATE TABLE public.seo_redirects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_path text NOT NULL,
  target_url text NOT NULL,
  status_code integer NOT NULL DEFAULT 301,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.seo_redirects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage redirects" ON public.seo_redirects FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Viewers can view redirects" ON public.seo_redirects FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'viewer'));

CREATE TABLE public.code_injections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location text NOT NULL,
  page_key text,
  content text NOT NULL DEFAULT '',
  label text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.code_injections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage injections" ON public.code_injections FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Viewers can view injections" ON public.code_injections FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'viewer'));
CREATE POLICY "Public can read active injections" ON public.code_injections FOR SELECT USING (is_active = true);

CREATE TABLE public.site_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key text UNIQUE NOT NULL,
  config_value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.site_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage site config" ON public.site_config FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Viewers can view site config" ON public.site_config FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'viewer'));
CREATE POLICY "Public can read site config" ON public.site_config FOR SELECT USING (true);

CREATE TABLE public.api_access_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  method text NOT NULL,
  path text NOT NULL,
  api_key_name text,
  status_code integer,
  response_time_ms integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.api_access_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage access logs" ON public.api_access_logs FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Viewers can view access logs" ON public.api_access_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'viewer'));

INSERT INTO public.site_config (config_key, config_value) VALUES
  ('site_info', '{"name": "IKtracker", "domain": "iktracker.fr", "language": "fr", "description": "Outil gratuit de calcul des indemnités kilométriques"}'::jsonb),
  ('navigation_header', '{"items": []}'::jsonb),
  ('navigation_footer', '{"items": []}'::jsonb)
ON CONFLICT (config_key) DO NOTHING;

INSERT INTO public.site_seo_config (config_key, content) VALUES
  ('robots_txt', ''),
  ('sitemap_config', '{"auto_generate": true}')
ON CONFLICT (config_key) DO NOTHING;
