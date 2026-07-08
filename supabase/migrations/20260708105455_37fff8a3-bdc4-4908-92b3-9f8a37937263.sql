REVOKE EXECUTE ON FUNCTION public.purge_old_deleted_trips() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purge_old_deleted_trips() TO postgres, service_role;