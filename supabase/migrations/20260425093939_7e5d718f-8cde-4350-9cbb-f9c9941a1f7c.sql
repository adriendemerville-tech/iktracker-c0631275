-- 1. Add quota fields to blog_api_keys
ALTER TABLE public.blog_api_keys
  ADD COLUMN IF NOT EXISTS monthly_quota integer NOT NULL DEFAULT 10000,
  ADD COLUMN IF NOT EXISTS usage_current_month integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS usage_reset_at timestamp with time zone NOT NULL DEFAULT (date_trunc('month'::text, now()) + '1 mon'::interval);

-- 2. Increment usage function (with auto-reset each month)
CREATE OR REPLACE FUNCTION public.increment_blog_api_usage(_api_key_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.blog_api_keys
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
  WHERE name = _api_key_name AND is_active = true;
END;
$$;

-- 3. Anomaly detection trigger function
CREATE OR REPLACE FUNCTION public.detect_autopilot_anomalies()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  recent_deletes int;
  recent_actions int;
  critical_slugs text[] := ARRAY['/', '/tarifs', 'index', 'tarifs', 'home'];
  is_critical_page boolean := false;
BEGIN
  -- Skip if no api_key_name
  IF NEW.api_key_name IS NULL THEN
    RETURN NEW;
  END IF;

  -- Check 1: more than 10 deletes per hour from same key
  IF NEW.action = 'delete' THEN
    SELECT COUNT(*) INTO recent_deletes
    FROM public.api_audit_logs
    WHERE api_key_name = NEW.api_key_name
      AND action = 'delete'
      AND created_at >= now() - interval '1 hour';
    
    IF recent_deletes > 10 THEN
      INSERT INTO public.autopilot_events (
        event_type, severity, message, page_key, audit_log_id, details
      ) VALUES (
        'anomaly_mass_delete',
        'warning',
        format('⚠️ %s suppressions en 1h depuis la clé "%s"', recent_deletes, NEW.api_key_name),
        NEW.resource_id,
        NEW.id,
        jsonb_build_object('count', recent_deletes, 'api_key', NEW.api_key_name, 'window', '1h')
      );
    END IF;
  END IF;

  -- Check 2: more than 50 actions per hour from same key (burst)
  SELECT COUNT(*) INTO recent_actions
  FROM public.api_audit_logs
  WHERE api_key_name = NEW.api_key_name
    AND created_at >= now() - interval '1 hour';
  
  IF recent_actions > 50 AND recent_actions % 50 = 0 THEN
    -- Trigger only every 50 actions to avoid spam
    INSERT INTO public.autopilot_events (
      event_type, severity, message, audit_log_id, details
    ) VALUES (
      'anomaly_burst',
      'warning',
      format('🔥 Burst détecté : %s actions en 1h depuis "%s"', recent_actions, NEW.api_key_name),
      NEW.id,
      jsonb_build_object('count', recent_actions, 'api_key', NEW.api_key_name, 'window', '1h')
    );
  END IF;

  -- Check 3: modification on critical page
  IF NEW.resource_type IN ('post', 'page', 'seo') AND NEW.action IN ('update', 'delete') THEN
    is_critical_page := lower(NEW.resource_id) = ANY(critical_slugs);
    
    IF is_critical_page THEN
      INSERT INTO public.autopilot_events (
        event_type, severity, message, page_key, audit_log_id, details
      ) VALUES (
        'critical_page_modified',
        'critical',
        format('🚨 Page critique "%s" modifiée (%s) par "%s"', NEW.resource_id, NEW.action, NEW.api_key_name),
        NEW.resource_id,
        NEW.id,
        jsonb_build_object('action', NEW.action, 'resource_type', NEW.resource_type, 'api_key', NEW.api_key_name)
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 4. Attach trigger
DROP TRIGGER IF EXISTS trg_detect_autopilot_anomalies ON public.api_audit_logs;
CREATE TRIGGER trg_detect_autopilot_anomalies
  AFTER INSERT ON public.api_audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.detect_autopilot_anomalies();