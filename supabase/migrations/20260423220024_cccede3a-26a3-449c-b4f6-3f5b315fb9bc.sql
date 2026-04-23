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