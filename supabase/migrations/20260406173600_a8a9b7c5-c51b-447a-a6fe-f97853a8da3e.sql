
CREATE TABLE public.request_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  timestamp TIMESTAMP WITH TIME ZONE,
  method TEXT,
  url TEXT,
  host TEXT,
  path TEXT,
  user_agent TEXT,
  ip_address TEXT,
  status_code INTEGER,
  bot BOOLEAN DEFAULT false,
  country TEXT
);

ALTER TABLE public.request_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view request logs"
ON public.request_logs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_request_logs_created_at ON public.request_logs (created_at DESC);
CREATE INDEX idx_request_logs_bot ON public.request_logs (bot);
CREATE INDEX idx_request_logs_path ON public.request_logs (path);
