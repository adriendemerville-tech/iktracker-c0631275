
-- 1) Soft-delete duplicates: keep oldest per (user, date, normalized start/end, purpose)
WITH ranked AS (
  SELECT id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, date,
        lower(regexp_replace(coalesce(start_location,''), '\s+', ' ', 'g')),
        lower(regexp_replace(coalesce(end_location,''), '\s+', ' ', 'g')),
        lower(coalesce(purpose,''))
      ORDER BY created_at ASC, id ASC
    ) AS rn
  FROM public.trips
  WHERE deleted_at IS NULL
)
UPDATE public.trips t
SET deleted_at = now()
FROM ranked r
WHERE t.id = r.id AND r.rn > 1;

-- 2) Improve trigger: match existing trip regardless of trip_group_id, merge groups
CREATE OR REPLACE FUNCTION public.sync_linked_trip_ins()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE peer uuid; existing_id uuid; existing_group uuid; gid uuid;
BEGIN
  IF current_setting('app.syncing_linked_trip', true) = 'on' THEN RETURN NEW; END IF;
  IF NEW.deleted_at IS NOT NULL THEN RETURN NEW; END IF;
  IF NEW.trip_group_id IS NOT NULL THEN RETURN NEW; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.get_linked_users(NEW.user_id)) THEN RETURN NEW; END IF;

  gid := gen_random_uuid();
  NEW.trip_group_id := gid;
  PERFORM set_config('app.syncing_linked_trip', 'on', true);

  FOR peer IN SELECT u FROM public.get_linked_users(NEW.user_id) u LOOP
    -- Look for an existing trip on same day with same normalized addresses
    SELECT id, trip_group_id INTO existing_id, existing_group
    FROM public.trips
    WHERE user_id = peer
      AND date = NEW.date
      AND lower(regexp_replace(coalesce(start_location,''), '\s+', ' ', 'g'))
          = lower(regexp_replace(coalesce(NEW.start_location,''), '\s+', ' ', 'g'))
      AND lower(regexp_replace(coalesce(end_location,''), '\s+', ' ', 'g'))
          = lower(regexp_replace(coalesce(NEW.end_location,''), '\s+', ' ', 'g'))
      AND deleted_at IS NULL
    ORDER BY created_at ASC
    LIMIT 1;

    IF existing_id IS NOT NULL THEN
      -- Merge: adopt the new group id (rewrite any existing group members)
      IF existing_group IS NOT NULL AND existing_group <> gid THEN
        UPDATE public.trips SET trip_group_id = gid WHERE trip_group_id = existing_group;
      ELSE
        UPDATE public.trips SET trip_group_id = gid WHERE id = existing_id;
      END IF;
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
$function$;
