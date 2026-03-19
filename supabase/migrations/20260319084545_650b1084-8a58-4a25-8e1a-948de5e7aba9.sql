
CREATE TABLE public.error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  source text NOT NULL CHECK (source IN ('backend', 'frontend')),
  error_type text NOT NULL,
  message text NOT NULL,
  description text,
  metadata jsonb DEFAULT '{}'::jsonb,
  user_id uuid,
  resolved boolean NOT NULL DEFAULT false,
  resolved_at timestamp with time zone
);

ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage error logs" ON public.error_logs
  FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Backend can insert error logs" ON public.error_logs
  FOR INSERT TO public
  WITH CHECK (true);

CREATE INDEX idx_error_logs_source ON public.error_logs(source);
CREATE INDEX idx_error_logs_created_at ON public.error_logs(created_at DESC);
