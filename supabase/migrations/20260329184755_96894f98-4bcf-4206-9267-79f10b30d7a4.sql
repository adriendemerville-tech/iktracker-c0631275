
CREATE TABLE public.referral_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  source text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.referral_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own referral source"
  ON public.referral_sources FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read their own referral source"
  ON public.referral_sources FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all referral sources"
  ON public.referral_sources FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Viewers can read all referral sources"
  ON public.referral_sources FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'viewer'));
