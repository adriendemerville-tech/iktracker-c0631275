DO $$
DECLARE
  r record;
  internal_only text[] := ARRAY[
    'enqueue_email','read_email_batch','delete_email','move_to_dlq',
    'validate_partner_key','increment_partner_usage','increment_blog_api_usage',
    'purge_old_deleted_trips','purge_old_marketing_analytics',
    'cleanup_expired_shares','cleanup_old_phone_numbers',
    'email_queue_dispatch','email_queue_wake','detect_autopilot_anomalies',
    'pick_default_vehicle_for_user','get_recent_signups'
  ];
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig, p.proname, t.typname
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    JOIN pg_type t ON t.oid = p.prorettype
    WHERE n.nspname = 'public' AND p.prosecdef
  LOOP
    IF r.typname = 'trigger' THEN
      CONTINUE;
    END IF;
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC', r.sig);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon', r.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', r.sig);
    IF NOT (r.proname = ANY(internal_only)) THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', r.sig);
    ELSE
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM authenticated', r.sig);
    END IF;
  END LOOP;
END $$;

-- Genuinely public endpoints (public marketing pages / blog rendering).
GRANT EXECUTE ON FUNCTION public.get_aggregate_rating() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_slug_blacklisted(text) TO anon, authenticated;