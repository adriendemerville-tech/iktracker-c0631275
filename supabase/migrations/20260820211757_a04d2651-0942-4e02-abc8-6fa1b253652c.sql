CREATE TEMP TABLE _pol_uid_rewrite AS
SELECT tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND (
    (qual LIKE '%auth.uid()%')
    OR (with_check LIKE '%auth.uid()%')
  );

DO $$
DECLARE
  p RECORD;
  new_qual text;
  new_check text;
  roles_text text;
BEGIN
  FOR p IN SELECT * FROM _pol_uid_rewrite LOOP
    new_qual := CASE WHEN p.qual IS NOT NULL
      THEN replace(p.qual, 'auth.uid()', '(select auth.uid())') END;
    new_check := CASE WHEN p.with_check IS NOT NULL
      THEN replace(p.with_check, 'auth.uid()', '(select auth.uid())') END;
    SELECT string_agg(r::text, ', ') INTO roles_text FROM unnest(p.roles) AS r;
    EXECUTE format('DROP POLICY %I ON public.%I', p.policyname, p.tablename);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I AS %s FOR %s TO %s%s%s',
      p.policyname, p.tablename, p.permissive, p.cmd, roles_text,
      CASE WHEN new_qual IS NOT NULL THEN ' USING (' || new_qual || ')' ELSE '' END,
      CASE WHEN new_check IS NOT NULL THEN ' WITH CHECK (' || new_check || ')' ELSE '' END
    );
  END LOOP;
END $$;

DROP TABLE _pol_uid_rewrite;