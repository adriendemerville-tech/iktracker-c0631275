DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    JOIN pg_type t ON t.oid = p.prorettype
    WHERE n.nspname = 'public' AND p.prosecdef AND t.typname = 'trigger'
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC', r.sig);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon, authenticated', r.sig);
  END LOOP;
END $$;