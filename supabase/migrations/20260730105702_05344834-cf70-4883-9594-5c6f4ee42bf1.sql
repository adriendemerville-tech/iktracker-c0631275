CREATE TABLE public.report_archives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('monthly','annual')),
  period_label text NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  storage_path text NOT NULL,
  trip_count integer NOT NULL DEFAULT 0,
  total_km numeric NOT NULL DEFAULT 0,
  total_ik numeric NOT NULL DEFAULT 0,
  file_size integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, kind, period_start, period_end)
);

CREATE INDEX idx_report_archives_user_period ON public.report_archives (user_id, period_start DESC);

GRANT SELECT, DELETE ON public.report_archives TO authenticated;
GRANT ALL ON public.report_archives TO service_role;

ALTER TABLE public.report_archives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own archived reports"
  ON public.report_archives FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own archived reports"
  ON public.report_archives FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER update_report_archives_updated_at
  BEFORE UPDATE ON public.report_archives
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();