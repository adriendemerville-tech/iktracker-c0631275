-- Create table for calendar connections
CREATE TABLE public.calendar_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('google', 'outlook', 'ics')),
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  ics_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.calendar_connections ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own calendar connections" 
ON public.calendar_connections 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own calendar connections" 
ON public.calendar_connections 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own calendar connections" 
ON public.calendar_connections 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own calendar connections" 
ON public.calendar_connections 
FOR DELETE 
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_calendar_connections_updated_at
BEFORE UPDATE ON public.calendar_connections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add source column to trips to track calendar-imported trips
ALTER TABLE public.trips ADD COLUMN source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'calendar'));
ALTER TABLE public.trips ADD COLUMN calendar_event_id TEXT;