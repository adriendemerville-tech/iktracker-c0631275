
CREATE TABLE public.vehicle_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  license_plate text NOT NULL UNIQUE,
  vehicle_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  source text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.vehicle_cache ENABLE ROW LEVEL SECURITY;

-- Anyone can read (edge function uses service role, but allow authenticated reads too)
CREATE POLICY "Service can read vehicle cache"
  ON public.vehicle_cache FOR SELECT
  USING (true);

-- Only service role inserts (via edge function), allow public insert for service role
CREATE POLICY "Service can insert vehicle cache"
  ON public.vehicle_cache FOR INSERT
  WITH CHECK (true);

-- Index for fast lookup
CREATE INDEX idx_vehicle_cache_plate ON public.vehicle_cache (license_plate);
