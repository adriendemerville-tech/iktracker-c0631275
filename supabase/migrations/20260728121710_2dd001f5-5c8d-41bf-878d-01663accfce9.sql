
-- Helper: pick best vehicle for a user (most recent trip's vehicle, else newest vehicle)
CREATE OR REPLACE FUNCTION public.pick_default_vehicle_for_user(_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  vid uuid;
BEGIN
  SELECT vehicle_id INTO vid
  FROM public.trips
  WHERE user_id = _user_id AND vehicle_id IS NOT NULL AND deleted_at IS NULL
  ORDER BY created_at DESC
  LIMIT 1;

  IF vid IS NOT NULL THEN RETURN vid; END IF;

  SELECT id INTO vid
  FROM public.vehicles
  WHERE user_id = _user_id
  ORDER BY created_at DESC
  LIMIT 1;

  RETURN vid;
END;
$$;

-- BEFORE INSERT trigger: auto-assign vehicle when missing
CREATE OR REPLACE FUNCTION public.trips_auto_assign_vehicle()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.vehicle_id IS NULL AND NEW.user_id IS NOT NULL THEN
    NEW.vehicle_id := public.pick_default_vehicle_for_user(NEW.user_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_trips_auto_assign_vehicle ON public.trips;
CREATE TRIGGER trg_trips_auto_assign_vehicle
  BEFORE INSERT ON public.trips
  FOR EACH ROW
  EXECUTE FUNCTION public.trips_auto_assign_vehicle();

-- Backfill existing NULL vehicle_id trips for users that own at least one vehicle
UPDATE public.trips t
SET vehicle_id = public.pick_default_vehicle_for_user(t.user_id)
WHERE t.vehicle_id IS NULL
  AND t.deleted_at IS NULL
  AND EXISTS (SELECT 1 FROM public.vehicles v WHERE v.user_id = t.user_id);
