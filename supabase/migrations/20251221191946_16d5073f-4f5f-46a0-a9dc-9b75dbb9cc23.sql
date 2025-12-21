-- Drop existing constraint and add updated one with all allowed sources
ALTER TABLE public.trips DROP CONSTRAINT IF EXISTS trips_source_check;

ALTER TABLE public.trips ADD CONSTRAINT trips_source_check 
CHECK (source = ANY (ARRAY['manual'::text, 'calendar'::text, 'google_calendar'::text, 'outlook_calendar'::text]));