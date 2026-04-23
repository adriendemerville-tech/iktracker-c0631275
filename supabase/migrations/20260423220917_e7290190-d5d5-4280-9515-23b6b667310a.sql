ALTER TABLE public.trips DROP CONSTRAINT IF EXISTS trips_source_check;
ALTER TABLE public.trips ADD CONSTRAINT trips_source_check CHECK (
  source IN ('manual', 'calendar', 'google_calendar', 'outlook_calendar', 'partner', 'tour', 'recovery')
  OR source LIKE 'partner:%'
);