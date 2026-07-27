CREATE TABLE IF NOT EXISTS public.account_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a uuid NOT NULL,
  user_b uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT account_links_canonical CHECK (user_a < user_b),
  CONSTRAINT account_links_unique UNIQUE (user_a, user_b)
);

GRANT SELECT ON public.account_links TO authenticated;
GRANT ALL ON public.account_links TO service_role;

ALTER TABLE public.account_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own account links"
ON public.account_links FOR SELECT TO authenticated
USING (auth.uid() = user_a OR auth.uid() = user_b);

ALTER TABLE public.trips
  ADD COLUMN IF NOT EXISTS linked_trip_id uuid REFERENCES public.trips(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS trips_linked_trip_id_idx ON public.trips(linked_trip_id);

CREATE OR REPLACE FUNCTION public.get_linked_user(_uid uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN al.user_a = _uid THEN al.user_b ELSE al.user_a END
  FROM public.account_links al
  WHERE _uid IN (al.user_a, al.user_b)
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.sync_linked_trip_ins()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  partner uuid;
  existing_id uuid;
  new_paired_id uuid;
BEGIN
  IF current_setting('app.syncing_linked_trip', true) = 'on' THEN RETURN NEW; END IF;
  IF NEW.linked_trip_id IS NOT NULL THEN RETURN NEW; END IF;
  IF NEW.deleted_at IS NOT NULL THEN RETURN NEW; END IF;
  partner := public.get_linked_user(NEW.user_id);
  IF partner IS NULL THEN RETURN NEW; END IF;

  SELECT id INTO existing_id FROM public.trips
  WHERE user_id = partner
    AND date = NEW.date
    AND start_location = NEW.start_location
    AND end_location = NEW.end_location
    AND deleted_at IS NULL
    AND linked_trip_id IS NULL
  LIMIT 1;

  PERFORM set_config('app.syncing_linked_trip', 'on', true);

  IF existing_id IS NOT NULL THEN
    UPDATE public.trips SET linked_trip_id = NEW.id WHERE id = existing_id;
    NEW.linked_trip_id := existing_id;
  ELSE
    INSERT INTO public.trips (
      user_id, vehicle_id, date, start_location, end_location,
      distance, purpose, round_trip, ik_amount, source,
      calendar_event_id, tour_stops, status, linked_trip_id
    ) VALUES (
      partner, NULL, NEW.date, NEW.start_location, NEW.end_location,
      NEW.distance, NEW.purpose, NEW.round_trip, NEW.ik_amount,
      NEW.source, NULL, NEW.tour_stops, NEW.status, NEW.id
    ) RETURNING id INTO new_paired_id;
    NEW.linked_trip_id := new_paired_id;
  END IF;

  PERFORM set_config('app.syncing_linked_trip', 'off', true);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_linked_trip_upd()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF current_setting('app.syncing_linked_trip', true) = 'on' THEN RETURN NEW; END IF;
  IF NEW.linked_trip_id IS NULL THEN RETURN NEW; END IF;
  IF NEW.date IS NOT DISTINCT FROM OLD.date
    AND NEW.start_location IS NOT DISTINCT FROM OLD.start_location
    AND NEW.end_location IS NOT DISTINCT FROM OLD.end_location
    AND NEW.distance IS NOT DISTINCT FROM OLD.distance
    AND NEW.purpose IS NOT DISTINCT FROM OLD.purpose
    AND NEW.round_trip IS NOT DISTINCT FROM OLD.round_trip
    AND NEW.ik_amount IS NOT DISTINCT FROM OLD.ik_amount
    AND NEW.tour_stops IS NOT DISTINCT FROM OLD.tour_stops
    AND NEW.status IS NOT DISTINCT FROM OLD.status
    AND NEW.deleted_at IS NOT DISTINCT FROM OLD.deleted_at
  THEN RETURN NEW; END IF;

  PERFORM set_config('app.syncing_linked_trip', 'on', true);
  UPDATE public.trips SET
    date = NEW.date,
    start_location = NEW.start_location,
    end_location = NEW.end_location,
    distance = NEW.distance,
    purpose = NEW.purpose,
    round_trip = NEW.round_trip,
    ik_amount = NEW.ik_amount,
    tour_stops = NEW.tour_stops,
    status = NEW.status,
    deleted_at = NEW.deleted_at
  WHERE id = NEW.linked_trip_id;
  PERFORM set_config('app.syncing_linked_trip', 'off', true);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_linked_trip_del()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF current_setting('app.syncing_linked_trip', true) = 'on' THEN RETURN OLD; END IF;
  IF OLD.linked_trip_id IS NULL THEN RETURN OLD; END IF;
  PERFORM set_config('app.syncing_linked_trip', 'on', true);
  DELETE FROM public.trips WHERE id = OLD.linked_trip_id;
  PERFORM set_config('app.syncing_linked_trip', 'off', true);
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trips_sync_linked_ins ON public.trips;
CREATE TRIGGER trips_sync_linked_ins
  BEFORE INSERT ON public.trips
  FOR EACH ROW EXECUTE FUNCTION public.sync_linked_trip_ins();

DROP TRIGGER IF EXISTS trips_sync_linked_upd ON public.trips;
CREATE TRIGGER trips_sync_linked_upd
  AFTER UPDATE ON public.trips
  FOR EACH ROW EXECUTE FUNCTION public.sync_linked_trip_upd();

DROP TRIGGER IF EXISTS trips_sync_linked_del ON public.trips;
CREATE TRIGGER trips_sync_linked_del
  AFTER DELETE ON public.trips
  FOR EACH ROW EXECUTE FUNCTION public.sync_linked_trip_del();

INSERT INTO public.account_links (user_a, user_b)
SELECT
  LEAST('7858d450-74c5-4403-ada5-05739c465591'::uuid, 'f41dd20f-acc0-4736-a764-3c0309743e99'::uuid),
  GREATEST('7858d450-74c5-4403-ada5-05739c465591'::uuid, 'f41dd20f-acc0-4736-a764-3c0309743e99'::uuid)
ON CONFLICT (user_a, user_b) DO NOTHING;

DO $backfill$
DECLARE
  ua uuid := '7858d450-74c5-4403-ada5-05739c465591';
  ub uuid := 'f41dd20f-acc0-4736-a764-3c0309743e99';
BEGIN
  PERFORM set_config('app.syncing_linked_trip', 'on', true);

  WITH pairs AS (
    SELECT DISTINCT ON (a.id) a.id AS a_id, b.id AS b_id
    FROM public.trips a
    JOIN public.trips b
      ON b.user_id = ub
     AND b.date = a.date
     AND b.start_location = a.start_location
     AND b.end_location = a.end_location
     AND b.deleted_at IS NULL
     AND b.linked_trip_id IS NULL
    WHERE a.user_id = ua
      AND a.deleted_at IS NULL
      AND a.linked_trip_id IS NULL
  )
  UPDATE public.trips t SET linked_trip_id = p.b_id
  FROM pairs p WHERE t.id = p.a_id;

  UPDATE public.trips b SET linked_trip_id = a.id
  FROM public.trips a
  WHERE a.user_id = ua AND b.user_id = ub
    AND a.linked_trip_id = b.id
    AND b.linked_trip_id IS NULL;

  WITH inserted AS (
    INSERT INTO public.trips (
      user_id, vehicle_id, date, start_location, end_location,
      distance, purpose, round_trip, ik_amount, source,
      calendar_event_id, tour_stops, status, linked_trip_id
    )
    SELECT ub, NULL, t.date, t.start_location, t.end_location,
      t.distance, t.purpose, t.round_trip, t.ik_amount,
      t.source, NULL, t.tour_stops, t.status, t.id
    FROM public.trips t
    WHERE t.user_id = ua
      AND t.deleted_at IS NULL
      AND t.linked_trip_id IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.trips t2
        WHERE t2.user_id = ub AND t2.date = t.date
          AND t2.start_location = t.start_location
          AND t2.end_location = t.end_location
          AND t2.deleted_at IS NULL
      )
    RETURNING id, linked_trip_id
  )
  UPDATE public.trips t SET linked_trip_id = i.id
  FROM inserted i WHERE t.id = i.linked_trip_id;

  WITH inserted AS (
    INSERT INTO public.trips (
      user_id, vehicle_id, date, start_location, end_location,
      distance, purpose, round_trip, ik_amount, source,
      calendar_event_id, tour_stops, status, linked_trip_id
    )
    SELECT ua, NULL, t.date, t.start_location, t.end_location,
      t.distance, t.purpose, t.round_trip, t.ik_amount,
      t.source, NULL, t.tour_stops, t.status, t.id
    FROM public.trips t
    WHERE t.user_id = ub
      AND t.deleted_at IS NULL
      AND t.linked_trip_id IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.trips t2
        WHERE t2.user_id = ua AND t2.date = t.date
          AND t2.start_location = t.start_location
          AND t2.end_location = t.end_location
          AND t2.deleted_at IS NULL
      )
    RETURNING id, linked_trip_id
  )
  UPDATE public.trips t SET linked_trip_id = i.id
  FROM inserted i WHERE t.id = i.linked_trip_id;

  PERFORM set_config('app.syncing_linked_trip', 'off', true);
END;
$backfill$;