
CREATE TABLE public.recurring_trips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  start_location JSONB NOT NULL,
  end_location JSONB NOT NULL,
  distance DOUBLE PRECISION NOT NULL DEFAULT 0,
  base_distance DOUBLE PRECISION NOT NULL DEFAULT 0,
  round_trip BOOLEAN NOT NULL DEFAULT false,
  purpose TEXT,
  days_of_week SMALLINT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_generated_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.recurring_trips TO authenticated;
GRANT ALL ON public.recurring_trips TO service_role;

ALTER TABLE public.recurring_trips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own recurring trips"
  ON public.recurring_trips FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_recurring_trips_user ON public.recurring_trips(user_id);
CREATE INDEX idx_recurring_trips_active ON public.recurring_trips(is_active) WHERE is_active = true;

CREATE TRIGGER update_recurring_trips_updated_at
  BEFORE UPDATE ON public.recurring_trips
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.trips DROP CONSTRAINT IF EXISTS trips_source_check;
ALTER TABLE public.trips ADD CONSTRAINT trips_source_check
  CHECK ((source = ANY (ARRAY['manual'::text, 'calendar'::text, 'google_calendar'::text, 'outlook_calendar'::text, 'partner'::text, 'tour'::text, 'recovery'::text, 'recurring'::text])) OR source ~~ 'partner:%'::text);
