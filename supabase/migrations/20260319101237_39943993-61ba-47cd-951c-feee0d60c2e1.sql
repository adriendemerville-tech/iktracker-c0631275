
-- Main surveys table
CREATE TABLE public.surveys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'draft',
  published_at timestamptz,
  target_page text NOT NULL DEFAULT '/app',
  duration_days integer NOT NULL DEFAULT 7,
  max_impressions_per_user integer NOT NULL DEFAULT 3,
  delay_between_impressions_hours integer NOT NULL DEFAULT 24,
  target_personas text[] DEFAULT '{}',
  target_user_count integer,
  created_by uuid
);

ALTER TABLE public.surveys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage surveys" ON public.surveys
  FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can read published surveys" ON public.surveys
  FOR SELECT TO authenticated
  USING (status = 'published');

-- Survey variants for A/B testing
CREATE TABLE public.survey_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id uuid NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Variante A',
  distribution_pct integer NOT NULL DEFAULT 100,
  content_blocks jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.survey_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage variants" ON public.survey_variants
  FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can read variants of published surveys" ON public.survey_variants
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.surveys s 
    WHERE s.id = survey_id AND s.status = 'published'
  ));

-- Survey impressions tracking
CREATE TABLE public.survey_impressions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id uuid NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES public.survey_variants(id) ON DELETE SET NULL,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  action text NOT NULL DEFAULT 'shown'
);

ALTER TABLE public.survey_impressions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all impressions" ON public.survey_impressions
  FOR SELECT TO public
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can insert own impressions" ON public.survey_impressions
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own impressions" ON public.survey_impressions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Survey responses
CREATE TABLE public.survey_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id uuid NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES public.survey_variants(id) ON DELETE SET NULL,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  responses jsonb NOT NULL DEFAULT '[]'::jsonb,
  screenshot_url text,
  completed boolean NOT NULL DEFAULT false
);

ALTER TABLE public.survey_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all responses" ON public.survey_responses
  FOR SELECT TO public
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can insert own responses" ON public.survey_responses
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own responses" ON public.survey_responses
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can read own responses" ON public.survey_responses
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Storage bucket for survey screenshots
INSERT INTO storage.buckets (id, name, public) VALUES ('survey-screenshots', 'survey-screenshots', false);

CREATE POLICY "Users can upload survey screenshots" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'survey-screenshots' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can view own survey screenshots" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'survey-screenshots' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Admins can view all survey screenshots" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'survey-screenshots' AND has_role(auth.uid(), 'admin'::app_role));
