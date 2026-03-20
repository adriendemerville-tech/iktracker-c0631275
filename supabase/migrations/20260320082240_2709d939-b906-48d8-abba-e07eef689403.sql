
-- Table to persist active tour sessions in DB (survives browser/tab closure)
CREATE TABLE public.tour_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  last_activity timestamp with time zone NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true,
  stops jsonb NOT NULL DEFAULT '[]'::jsonb,
  gps_points jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_distance_km double precision NOT NULL DEFAULT 0,
  pending_stop jsonb,
  UNIQUE(user_id, is_active)
);

-- RLS
ALTER TABLE public.tour_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own tour sessions"
  ON public.tour_sessions FOR ALL
  TO public
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
