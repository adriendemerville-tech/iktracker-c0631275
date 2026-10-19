ALTER TABLE public.trips ADD COLUMN vehicle_snapshot jsonb;
COMMENT ON COLUMN public.trips.vehicle_snapshot IS 'Historical vehicle identity and fiscal power/electric rate inputs retained when the vehicle is deleted; ik_amount remains authoritative.';
CREATE OR REPLACE FUNCTION public.archive_deleted_vehicle() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 INSERT INTO public.deleted_vehicles(vehicle_id, user_id, vehicle_data) VALUES (OLD.id, OLD.user_id, to_jsonb(OLD)) ON CONFLICT (vehicle_id) DO UPDATE SET vehicle_data = EXCLUDED.vehicle_data, deleted_at = now();
 UPDATE public.trips SET vehicle_snapshot = to_jsonb(OLD) WHERE vehicle_id = OLD.id AND user_id = OLD.user_id;
 RETURN OLD;
END;
$$;
CREATE OR REPLACE FUNCTION public.clear_reassigned_trip_vehicle_snapshot() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
 IF NEW.vehicle_id IS NOT NULL AND NEW.vehicle_id IS DISTINCT FROM OLD.vehicle_id THEN NEW.vehicle_snapshot := NULL; END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER trips_clear_reassigned_vehicle_snapshot BEFORE UPDATE OF vehicle_id ON public.trips FOR EACH ROW EXECUTE FUNCTION public.clear_reassigned_trip_vehicle_snapshot();