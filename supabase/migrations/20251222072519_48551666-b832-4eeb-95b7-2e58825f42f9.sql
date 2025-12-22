-- Add soft delete support to trips table
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Create index for efficient filtering of non-deleted trips
CREATE INDEX IF NOT EXISTS idx_trips_deleted_at ON public.trips(deleted_at);

-- Create index for checking deleted calendar events
CREATE INDEX IF NOT EXISTS idx_trips_calendar_event_deleted ON public.trips(calendar_event_id, deleted_at) WHERE calendar_event_id IS NOT NULL;