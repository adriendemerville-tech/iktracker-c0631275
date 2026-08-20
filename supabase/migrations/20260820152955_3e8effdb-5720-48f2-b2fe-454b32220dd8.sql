CREATE TABLE public.content_freshness_findings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL UNIQUE,
  slug text NOT NULL,
  title text NOT NULL,
  reasons jsonb NOT NULL DEFAULT '[]'::jsonb,
  score integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  last_content_update timestamptz,
  detected_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  dismissed_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT content_freshness_status_check CHECK (status IN ('pending','in_progress','dismissed','resolved'))
);

CREATE INDEX idx_content_freshness_status_score ON public.content_freshness_findings (status, score DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.content_freshness_findings TO authenticated;
GRANT ALL ON public.content_freshness_findings TO service_role;

ALTER TABLE public.content_freshness_findings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read freshness findings"
  ON public.content_freshness_findings FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'viewer'));

CREATE POLICY "Admins can update freshness findings"
  ON public.content_freshness_findings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_content_freshness_findings_updated_at
  BEFORE UPDATE ON public.content_freshness_findings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();