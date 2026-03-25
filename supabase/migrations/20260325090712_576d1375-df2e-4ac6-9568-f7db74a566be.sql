
-- Table to track autopilot events/bugs linked to API changes
CREATE TABLE public.autopilot_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  audit_log_id UUID REFERENCES public.api_audit_logs(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  event_type TEXT NOT NULL DEFAULT 'info',
  severity TEXT NOT NULL DEFAULT 'info',
  page_key TEXT,
  message TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.autopilot_events ENABLE ROW LEVEL SECURITY;

-- Admins can manage all
CREATE POLICY "Admins can manage autopilot events"
  ON public.autopilot_events FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Viewers can read
CREATE POLICY "Viewers can view autopilot events"
  ON public.autopilot_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'viewer'));

-- Service role (edge functions) can insert
CREATE POLICY "Service can insert autopilot events"
  ON public.autopilot_events FOR INSERT
  WITH CHECK (true);

-- Enable realtime for live polling
ALTER PUBLICATION supabase_realtime ADD TABLE public.autopilot_events;

-- Index for fast lookups
CREATE INDEX idx_autopilot_events_page_key ON public.autopilot_events(page_key);
CREATE INDEX idx_autopilot_events_audit_log_id ON public.autopilot_events(audit_log_id);
CREATE INDEX idx_autopilot_events_created_at ON public.autopilot_events(created_at DESC);
