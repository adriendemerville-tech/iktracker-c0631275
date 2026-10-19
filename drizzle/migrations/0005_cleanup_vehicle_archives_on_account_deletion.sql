CREATE FUNCTION public.cleanup_deleted_vehicle_archives() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 DELETE FROM public.deleted_vehicles WHERE user_id = OLD.id;
 RETURN OLD;
END;
$$;
REVOKE ALL ON FUNCTION public.cleanup_deleted_vehicle_archives() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_deleted_vehicle_archives() TO service_role;
CREATE TRIGGER cleanup_deleted_vehicle_archives_after_user_delete AFTER DELETE ON auth.users FOR EACH ROW EXECUTE FUNCTION public.cleanup_deleted_vehicle_archives();