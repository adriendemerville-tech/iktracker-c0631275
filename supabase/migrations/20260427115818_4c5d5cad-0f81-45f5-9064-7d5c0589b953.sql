-- Retirer l'accès SELECT de la table brute partner_api_keys aux viewers
-- (jwt_secret + key_hash en clair). Les viewers doivent utiliser la vue
-- partner_api_keys_safe qui n'expose pas ces colonnes sensibles.
DROP POLICY IF EXISTS "Viewers read partner keys (safe columns)" ON public.partner_api_keys;

-- Note : la policy "Admins manage partner keys" (ALL) reste en place,
-- ce qui permet aux admins de continuer à créer/modifier/supprimer des clés
-- via l'UI AdminPartners. Les viewers conservent l'accès en lecture via la
-- vue publique partner_api_keys_safe.