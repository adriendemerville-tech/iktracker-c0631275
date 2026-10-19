CREATE TABLE public.deleted_vehicles (
 vehicle_id uuid PRIMARY KEY,
 user_id uuid NOT NULL,
 vehicle_data jsonb NOT NULL,
 deleted_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, DELETE ON public.deleted_vehicles TO authenticated;
GRANT ALL ON public.deleted_vehicles TO service_role;
ALTER TABLE public.deleted_vehicles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners read deleted vehicles" ON public.deleted_vehicles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Owners remove restored archives" ON public.deleted_vehicles FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX deleted_vehicles_owner_date ON public.deleted_vehicles(user_id, deleted_at DESC);
CREATE FUNCTION public.archive_deleted_vehicle() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 INSERT INTO public.deleted_vehicles(vehicle_id, user_id, vehicle_data) VALUES (OLD.id, OLD.user_id, to_jsonb(OLD))
 ON CONFLICT (vehicle_id) DO UPDATE SET vehicle_data = EXCLUDED.vehicle_data, deleted_at = now();
 RETURN OLD;
END;
$$;
REVOKE ALL ON FUNCTION public.archive_deleted_vehicle() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.archive_deleted_vehicle() TO service_role;
CREATE TRIGGER vehicles_archive_before_delete BEFORE DELETE ON public.vehicles FOR EACH ROW EXECUTE FUNCTION public.archive_deleted_vehicle();
CREATE FUNCTION public.restore_deleted_vehicle(p_vehicle_id uuid) RETURNS public.vehicles LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE saved public.deleted_vehicles; restored public.vehicles;
BEGIN
 SELECT * INTO saved FROM public.deleted_vehicles WHERE vehicle_id = p_vehicle_id AND user_id = auth.uid() FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Véhicule introuvable'; END IF;
 INSERT INTO public.vehicles SELECT (jsonb_populate_record(NULL::public.vehicles, saved.vehicle_data || jsonb_build_object('id', saved.vehicle_id, 'user_id', saved.user_id, 'updated_at', now()))).* RETURNING * INTO restored;
 DELETE FROM public.deleted_vehicles WHERE vehicle_id = saved.vehicle_id AND user_id = auth.uid();
 RETURN restored;
END;
$$;
REVOKE ALL ON FUNCTION public.restore_deleted_vehicle(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.restore_deleted_vehicle(uuid) TO authenticated, service_role;