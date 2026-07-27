
-- 1. Colonne de groupe
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS trip_group_id uuid;
CREATE INDEX IF NOT EXISTS idx_trips_trip_group_id ON public.trips(trip_group_id) WHERE trip_group_id IS NOT NULL;

-- 2. Backfill depuis linked_trip_id existant
DO $$
DECLARE r RECORD; gid uuid;
BEGIN
  FOR r IN SELECT id, linked_trip_id FROM public.trips WHERE linked_trip_id IS NOT NULL AND trip_group_id IS NULL
  LOOP
    SELECT COALESCE(t1.trip_group_id, t2.trip_group_id) INTO gid
      FROM public.trips t1, public.trips t2
     WHERE t1.id = r.id AND t2.id = r.linked_trip_id;
    IF gid IS NULL THEN gid := gen_random_uuid(); END IF;
    UPDATE public.trips SET trip_group_id = gid WHERE id IN (r.id, r.linked_trip_id) AND trip_group_id IS NULL;
  END LOOP;
END $$;

-- 3. Nouveaux liens (triangle)
INSERT INTO public.account_links (user_a, user_b)
SELECT LEAST(a,b), GREATEST(a,b) FROM (VALUES
  ('7858d450-74c5-4403-ada5-05739c465591'::uuid,'d410a56e-0946-4de2-a47f-72f34b92b3e4'::uuid),
  ('f41dd20f-acc0-4736-a764-3c0309743e99'::uuid,'d410a56e-0946-4de2-a47f-72f34b92b3e4'::uuid)
) v(a,b)
ON CONFLICT DO NOTHING;

-- 4. Fermeture transitive des comptes liés
CREATE OR REPLACE FUNCTION public.get_linked_users(_uid uuid)
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH RECURSIVE peers AS (
    SELECT _uid AS uid
    UNION
    SELECT CASE WHEN al.user_a = p.uid THEN al.user_b ELSE al.user_a END
      FROM peers p JOIN public.account_links al ON p.uid IN (al.user_a, al.user_b)
  )
  SELECT uid FROM peers WHERE uid <> _uid;
$$;

-- 5. Trigger INSERT : fan-out sur tous les peers
CREATE OR REPLACE FUNCTION public.sync_linked_trip_ins()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE peer uuid; existing_id uuid; gid uuid;
BEGIN
  IF current_setting('app.syncing_linked_trip', true) = 'on' THEN RETURN NEW; END IF;
  IF NEW.deleted_at IS NOT NULL THEN RETURN NEW; END IF;
  IF NEW.trip_group_id IS NOT NULL THEN RETURN NEW; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.get_linked_users(NEW.user_id)) THEN RETURN NEW; END IF;

  gid := gen_random_uuid();
  NEW.trip_group_id := gid;
  PERFORM set_config('app.syncing_linked_trip', 'on', true);

  FOR peer IN SELECT u FROM public.get_linked_users(NEW.user_id) u LOOP
    SELECT id INTO existing_id FROM public.trips
      WHERE user_id = peer AND date = NEW.date
        AND start_location = NEW.start_location AND end_location = NEW.end_location
        AND deleted_at IS NULL AND trip_group_id IS NULL LIMIT 1;
    IF existing_id IS NOT NULL THEN
      UPDATE public.trips SET trip_group_id = gid WHERE id = existing_id;
    ELSE
      INSERT INTO public.trips (user_id, date, start_location, end_location, distance, purpose,
        round_trip, ik_amount, source, tour_stops, status, trip_group_id)
      VALUES (peer, NEW.date, NEW.start_location, NEW.end_location, NEW.distance, NEW.purpose,
        NEW.round_trip, NEW.ik_amount, NEW.source, NEW.tour_stops, NEW.status, gid);
    END IF;
  END LOOP;

  PERFORM set_config('app.syncing_linked_trip', 'off', true);
  RETURN NEW;
END;
$$;

-- 6. Trigger UPDATE : propage à tous les membres du groupe
CREATE OR REPLACE FUNCTION public.sync_linked_trip_upd()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF current_setting('app.syncing_linked_trip', true) = 'on' THEN RETURN NEW; END IF;
  IF NEW.trip_group_id IS NULL THEN RETURN NEW; END IF;
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
    date = NEW.date, start_location = NEW.start_location, end_location = NEW.end_location,
    distance = NEW.distance, purpose = NEW.purpose, round_trip = NEW.round_trip,
    ik_amount = NEW.ik_amount, tour_stops = NEW.tour_stops, status = NEW.status,
    deleted_at = NEW.deleted_at
   WHERE trip_group_id = NEW.trip_group_id AND id <> NEW.id;
  PERFORM set_config('app.syncing_linked_trip', 'off', true);
  RETURN NEW;
END;
$$;

-- 7. Trigger DELETE : purge tout le groupe
CREATE OR REPLACE FUNCTION public.sync_linked_trip_del()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF current_setting('app.syncing_linked_trip', true) = 'on' THEN RETURN OLD; END IF;
  IF OLD.trip_group_id IS NULL THEN RETURN OLD; END IF;
  PERFORM set_config('app.syncing_linked_trip', 'on', true);
  DELETE FROM public.trips WHERE trip_group_id = OLD.trip_group_id AND id <> OLD.id;
  PERFORM set_config('app.syncing_linked_trip', 'off', true);
  RETURN OLD;
END;
$$;

-- 8. Backfill : ajouter le 3ème compte aux groupes existants
DO $$
DECLARE r RECORD; existing_id uuid;
  new_uid uuid := 'd410a56e-0946-4de2-a47f-72f34b92b3e4';
BEGIN
  PERFORM set_config('app.syncing_linked_trip', 'on', true);
  FOR r IN
    SELECT DISTINCT ON (trip_group_id) trip_group_id, date, start_location, end_location,
      distance, purpose, round_trip, ik_amount, source, tour_stops, status
    FROM public.trips t
    WHERE trip_group_id IS NOT NULL AND deleted_at IS NULL
      AND NOT EXISTS (SELECT 1 FROM public.trips t2 WHERE t2.trip_group_id = t.trip_group_id AND t2.user_id = new_uid)
  LOOP
    SELECT id INTO existing_id FROM public.trips
      WHERE user_id = new_uid AND date = r.date AND start_location = r.start_location
        AND end_location = r.end_location AND deleted_at IS NULL AND trip_group_id IS NULL LIMIT 1;
    IF existing_id IS NOT NULL THEN
      UPDATE public.trips SET trip_group_id = r.trip_group_id WHERE id = existing_id;
    ELSE
      INSERT INTO public.trips (user_id, date, start_location, end_location, distance, purpose,
        round_trip, ik_amount, source, tour_stops, status, trip_group_id)
      VALUES (new_uid, r.date, r.start_location, r.end_location, r.distance, r.purpose,
        r.round_trip, r.ik_amount, r.source, r.tour_stops, r.status, r.trip_group_id);
    END IF;
  END LOOP;
  PERFORM set_config('app.syncing_linked_trip', 'off', true);
END $$;

-- 9. Backfill : propager les trajets propres au 3ème compte vers les 2 autres
DO $$
DECLARE r RECORD; peer uuid; existing_id uuid; gid uuid;
  peers uuid[] := ARRAY['7858d450-74c5-4403-ada5-05739c465591','f41dd20f-acc0-4736-a764-3c0309743e99'];
  new_uid uuid := 'd410a56e-0946-4de2-a47f-72f34b92b3e4';
BEGIN
  PERFORM set_config('app.syncing_linked_trip', 'on', true);
  FOR r IN SELECT * FROM public.trips WHERE user_id = new_uid AND trip_group_id IS NULL AND deleted_at IS NULL
  LOOP
    gid := gen_random_uuid();
    UPDATE public.trips SET trip_group_id = gid WHERE id = r.id;
    FOREACH peer IN ARRAY peers LOOP
      SELECT id INTO existing_id FROM public.trips
        WHERE user_id = peer AND date = r.date AND start_location = r.start_location
          AND end_location = r.end_location AND deleted_at IS NULL AND trip_group_id IS NULL LIMIT 1;
      IF existing_id IS NOT NULL THEN
        UPDATE public.trips SET trip_group_id = gid WHERE id = existing_id;
      ELSE
        INSERT INTO public.trips (user_id, date, start_location, end_location, distance, purpose,
          round_trip, ik_amount, source, tour_stops, status, trip_group_id)
        VALUES (peer, r.date, r.start_location, r.end_location, r.distance, r.purpose,
          r.round_trip, r.ik_amount, r.source, r.tour_stops, r.status, gid);
      END IF;
    END LOOP;
  END LOOP;
  PERFORM set_config('app.syncing_linked_trip', 'off', true);
END $$;
