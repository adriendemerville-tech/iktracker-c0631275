
-- Table for storing editable page content (static pages)
CREATE TABLE public.page_contents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_key text NOT NULL UNIQUE,
  title text,
  meta_title text,
  meta_description text,
  content jsonb NOT NULL DEFAULT '{}',
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by text
);

-- Enable RLS
ALTER TABLE public.page_contents ENABLE ROW LEVEL SECURITY;

-- Anyone can read page contents (public pages)
CREATE POLICY "Anyone can read page contents"
  ON public.page_contents FOR SELECT
  TO public
  USING (true);

-- Admins can manage page contents
CREATE POLICY "Admins can manage page contents"
  ON public.page_contents FOR ALL
  TO public
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert default pages
INSERT INTO public.page_contents (page_key, title, meta_title, meta_description, content) VALUES
  ('landing', 'IKtracker', 'IKtracker - Suivi des frais kilométriques', 'Calculez et suivez vos indemnités kilométriques facilement', '{}'),
  ('mode-tournee', 'Mode Tournée', 'Mode Tournée - IKtracker', 'Optimisez vos tournées avec le mode tournée IKtracker', '{}'),
  ('calendrier', 'Calendrier', 'Synchronisation Calendrier - IKtracker', 'Synchronisez vos trajets avec votre calendrier', '{}'),
  ('expert-comptable', 'Expert-Comptable', 'Espace Expert-Comptable - IKtracker', 'Partagez vos rapports avec votre expert-comptable', '{}'),
  ('bareme-ik-2026', 'Barème IK 2026', 'Barème Indemnités Kilométriques 2026', 'Barème officiel des indemnités kilométriques 2026', '{}'),
  ('frais-reels', 'Frais Réels', 'Frais Réels - Guide complet', 'Tout savoir sur la déduction des frais réels', '{}'),
  ('lexique', 'Lexique', 'Lexique des frais kilométriques', 'Définitions et termes liés aux frais kilométriques', '{}'),
  ('comparatif-izika', 'Comparatif Izika', 'IKtracker vs Izika', 'Comparatif entre IKtracker et Izika', '{}'),
  ('comparatif-drivers-note', 'Comparatif Drivers Note', 'IKtracker vs Drivers Note', 'Comparatif entre IKtracker et Drivers Note', '{}'),
  ('install', 'Installer', 'Installer IKtracker', 'Installez IKtracker sur votre appareil', '{}'),
  ('privacy', 'Politique de confidentialité', 'Politique de confidentialité - IKtracker', 'Politique de confidentialité de IKtracker', '{}'),
  ('terms', 'Conditions d''utilisation', 'CGU - IKtracker', 'Conditions générales d''utilisation de IKtracker', '{}');
