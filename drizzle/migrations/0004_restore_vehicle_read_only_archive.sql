CREATE OR REPLACE FUNCTION public.restore_deleted_vehicle(p_vehicle_id uuid) RETURNS public.vehicles LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE saved public.deleted_vehicles; restored public.vehicles;
BEGIN
 SELECT * INTO saved FROM public.deleted_vehicles WHERE vehicle_id = p_vehicle_id AND user_id = auth.uid();
 IF NOT FOUND THEN RAISE EXCEPTION 'Véhicule introuvable'; END IF;
 INSERT INTO public.vehicles SELECT (jsonb_populate_record(NULL::public.vehicles, saved.vehicle_data || jsonb_build_object('id', saved.vehicle_id, 'user_id', saved.user_id, 'updated_at', now()))).* RETURNING * INTO restored;
 DELETE FROM public.deleted_vehicles WHERE vehicle_id = saved.vehicle_id AND user_id = auth.uid();
 RETURN restored;
END;
$$;