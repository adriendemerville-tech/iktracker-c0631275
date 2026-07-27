
CREATE OR REPLACE FUNCTION public.notify_preferences_changed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  changed_cols text[] := ARRAY[]::text[];
  fn_url text;
  svc text;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.calendar_import_mode IS DISTINCT FROM OLD.calendar_import_mode THEN
      changed_cols := array_append(changed_cols, 'calendar_import_mode');
    END IF;
    IF NEW.ik_rate_override IS DISTINCT FROM OLD.ik_rate_override THEN
      changed_cols := array_append(changed_cols, 'ik_rate_override');
    END IF;
    IF array_length(changed_cols, 1) IS NULL THEN
      RETURN NEW;
    END IF;
  END IF;

  -- Only fire if user is linked to a partner
  IF NOT EXISTS (SELECT 1 FROM public.partner_users WHERE iktracker_user_id = NEW.user_id) THEN
    RETURN NEW;
  END IF;

  fn_url := 'https://yarjaudctshlxkatqgeb.supabase.co/functions/v1/partner-api/internal/preferences-changed';
  svc := current_setting('app.settings.service_role_key', true);
  IF svc IS NULL OR svc = '' THEN
    RETURN NEW; -- silently skip if secret not configured on this environment
  END IF;

  PERFORM net.http_post(
    url := fn_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-internal-secret', svc
    ),
    body := jsonb_build_object(
      'iktracker_user_id', NEW.user_id,
      'calendar_import_mode', NEW.calendar_import_mode,
      'ik_rate_override', NEW.ik_rate_override,
      'changed', to_jsonb(changed_cols)
    )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_preferences_changed ON public.user_preferences;
CREATE TRIGGER trg_notify_preferences_changed
AFTER INSERT OR UPDATE OF calendar_import_mode, ik_rate_override
ON public.user_preferences
FOR EACH ROW EXECUTE FUNCTION public.notify_preferences_changed();
