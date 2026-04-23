-- Partner API keys (one row per partner, can have multiple keys for rotation)
CREATE TABLE public.partner_api_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_name TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,
  jwt_secret TEXT NOT NULL,
  scopes TEXT[] NOT NULL DEFAULT ARRAY['read','write','sso']::TEXT[],
  monthly_quota INTEGER NOT NULL DEFAULT 100000,
  usage_current_month INTEGER NOT NULL DEFAULT 0,
  usage_reset_at TIMESTAMPTZ NOT NULL DEFAULT date_trunc('month', now()) + interval '1 month',
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_used_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.partner_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage partner keys"
ON public.partner_api_keys FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Viewers read partner keys"
ON public.partner_api_keys FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'viewer'::app_role));

CREATE INDEX idx_partner_api_keys_hash ON public.partner_api_keys(key_hash) WHERE is_active = true;

-- Partner user mapping (links external partner user_id to IKtracker user_id)
CREATE TABLE public.partner_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_id UUID NOT NULL REFERENCES public.partner_api_keys(id) ON DELETE CASCADE,
  external_user_id TEXT NOT NULL,
  external_email TEXT NOT NULL,
  iktracker_user_id UUID NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_sso_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(partner_id, external_user_id)
);

ALTER TABLE public.partner_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage partner users"
ON public.partner_users FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Viewers read partner users"
ON public.partner_users FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'viewer'::app_role));

CREATE POLICY "Users read own partner mappings"
ON public.partner_users FOR SELECT
TO authenticated
USING (auth.uid() = iktracker_user_id);

CREATE INDEX idx_partner_users_iktracker ON public.partner_users(iktracker_user_id);
CREATE INDEX idx_partner_users_external ON public.partner_users(partner_id, external_user_id);

-- Partner webhooks
CREATE TABLE public.partner_webhooks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_id UUID NOT NULL REFERENCES public.partner_api_keys(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  events TEXT[] NOT NULL DEFAULT ARRAY['trip.created','trip.updated','vehicle.updated','user.linked']::TEXT[],
  hmac_secret TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_called_at TIMESTAMPTZ,
  failure_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.partner_webhooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage webhooks"
ON public.partner_webhooks FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Viewers read webhooks"
ON public.partner_webhooks FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'viewer'::app_role));

-- Partner API request logs
CREATE TABLE public.partner_request_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_id UUID REFERENCES public.partner_api_keys(id) ON DELETE SET NULL,
  method TEXT NOT NULL,
  path TEXT NOT NULL,
  status_code INTEGER NOT NULL,
  response_time_ms INTEGER,
  iktracker_user_id UUID,
  external_user_id TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.partner_request_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage request logs"
ON public.partner_request_logs FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Viewers read request logs"
ON public.partner_request_logs FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'viewer'::app_role));

CREATE INDEX idx_partner_logs_created ON public.partner_request_logs(created_at DESC);
CREATE INDEX idx_partner_logs_partner ON public.partner_request_logs(partner_id, created_at DESC);

-- Trigger updated_at
CREATE TRIGGER trg_partner_api_keys_updated
BEFORE UPDATE ON public.partner_api_keys
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_partner_users_updated
BEFORE UPDATE ON public.partner_users
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_partner_webhooks_updated
BEFORE UPDATE ON public.partner_webhooks
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Helper function: validate partner API key (called from edge function via service role)
CREATE OR REPLACE FUNCTION public.validate_partner_key(_key_hash TEXT)
RETURNS TABLE(
  partner_id UUID,
  partner_name TEXT,
  jwt_secret TEXT,
  scopes TEXT[],
  is_active BOOLEAN,
  quota_remaining INTEGER
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    id,
    partner_name,
    jwt_secret,
    scopes,
    is_active,
    GREATEST(monthly_quota - usage_current_month, 0) as quota_remaining
  FROM public.partner_api_keys
  WHERE key_hash = _key_hash
    AND is_active = true
  LIMIT 1;
$$;

-- Helper function: increment usage counter
CREATE OR REPLACE FUNCTION public.increment_partner_usage(_partner_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.partner_api_keys
  SET 
    usage_current_month = CASE 
      WHEN usage_reset_at <= now() THEN 1
      ELSE usage_current_month + 1
    END,
    usage_reset_at = CASE
      WHEN usage_reset_at <= now() THEN date_trunc('month', now()) + interval '1 month'
      ELSE usage_reset_at
    END,
    last_used_at = now()
  WHERE id = _partner_id;
END;
$$;