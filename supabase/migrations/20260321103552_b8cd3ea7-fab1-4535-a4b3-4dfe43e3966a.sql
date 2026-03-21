
-- Table des codes d'affiliation
CREATE TABLE public.affiliate_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  label text,
  commission_pct numeric NOT NULL DEFAULT 10,
  is_active boolean NOT NULL DEFAULT true,
  uses_count integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Table de suivi des utilisations
CREATE TABLE public.affiliate_uses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_code_id uuid NOT NULL REFERENCES public.affiliate_codes(id) ON DELETE CASCADE,
  user_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

-- RLS
ALTER TABLE public.affiliate_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_uses ENABLE ROW LEVEL SECURITY;

-- Admins can manage affiliate codes
CREATE POLICY "Admins can manage affiliate codes"
  ON public.affiliate_codes FOR ALL
  TO public
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Viewers can view affiliate codes
CREATE POLICY "Viewers can view affiliate codes"
  ON public.affiliate_codes FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'viewer'::app_role));

-- Admins can manage affiliate uses
CREATE POLICY "Admins can manage affiliate uses"
  ON public.affiliate_uses FOR ALL
  TO public
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Viewers can view affiliate uses
CREATE POLICY "Viewers can view affiliate uses"
  ON public.affiliate_uses FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'viewer'::app_role));

-- Anyone can insert affiliate uses (for tracking signups via code)
CREATE POLICY "Anyone can insert affiliate uses"
  ON public.affiliate_uses FOR INSERT
  TO public
  WITH CHECK (true);
