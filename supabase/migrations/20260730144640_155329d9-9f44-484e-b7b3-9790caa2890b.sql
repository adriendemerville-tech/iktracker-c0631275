CREATE TABLE public.trip_guard_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scanned integer NOT NULL DEFAULT 0,
  fixed integer NOT NULL DEFAULT 0,
  skipped integer NOT NULL DEFAULT 0,
  failed integer NOT NULL DEFAULT 0,
  details jsonb NOT NULL DEFAULT '[]'::jsonb,
  triggered_by text NOT NULL DEFAULT 'cron',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.trip_guard_runs TO authenticated;
GRANT ALL ON public.trip_guard_runs TO service_role;

ALTER TABLE public.trip_guard_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view trip guard runs"
ON public.trip_guard_runs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_trip_guard_runs_created_at ON public.trip_guard_runs (created_at DESC);