CREATE OR REPLACE FUNCTION public.trips_block_own_pending_duplicate()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'pending_location' AND NEW.deleted_at IS NULL
     AND public.normalize_trip_dedupe_text(NEW.end_location) <> ''
     AND EXISTS (
       SELECT 1 FROM public.trips t
       WHERE t.user_id = NEW.user_id
         AND t.date = NEW.date
         AND t.status = 'pending_location'
         AND t.deleted_at IS NULL
         AND public.normalize_trip_dedupe_text(t.end_location) = public.normalize_trip_dedupe_text(NEW.end_location)
         AND public.normalize_trip_dedupe_text(coalesce(t.purpose,'')) = public.normalize_trip_dedupe_text(coalesce(NEW.purpose,''))
     ) THEN
    RETURN NULL;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS a0_trips_block_own_pending_duplicate ON public.trips;
CREATE TRIGGER a0_trips_block_own_pending_duplicate
BEFORE INSERT ON public.trips
FOR EACH ROW EXECUTE FUNCTION public.trips_block_own_pending_duplicate();