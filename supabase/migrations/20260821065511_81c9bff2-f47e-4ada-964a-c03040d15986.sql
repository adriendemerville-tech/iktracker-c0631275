-- 1. Index pour les sommes de coûts mensuelles (budget guard)
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_created_at ON public.api_usage_logs(created_at DESC);

-- 2. Plafond budgétaire centralisé, éditable par les admins via site_config
INSERT INTO public.site_config (config_key, config_value)
VALUES ('api_budget', '{"monthly_euros": 100}'::jsonb)
ON CONFLICT (config_key) DO NOTHING;

-- 3. is_slug_blacklisted : réservé au service role (appelé uniquement par blog-api en service role)
REVOKE EXECUTE ON FUNCTION public.is_slug_blacklisted(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_slug_blacklisted(text) TO service_role;

-- 4. Documentation des choix de sécurité confirmés
COMMENT ON FUNCTION public.get_aggregate_rating() IS 'Agregat public (note moyenne + nombre d''avis) volontairement executable en anonyme pour la preuve sociale des pages publiques. Aucune donnee individuelle retournee.';
COMMENT ON TABLE public.vehicle_cache IS 'Cache de plaques d''immatriculation. RLS active sans policy = acces service role uniquement (edge function vehicle-lookup). Choix intentionnel.';