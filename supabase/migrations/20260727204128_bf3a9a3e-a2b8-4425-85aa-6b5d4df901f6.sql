CREATE OR REPLACE FUNCTION public.normalize_trip_dedupe_text(_value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT regexp_replace(
    replace(
      replace(
        replace(
          replace(
            lower(translate(coalesce(_value, ''), 'ÀÁÂÃÄÅàáâãäåÇçÈÉÊËèéêëÌÍÎÏìíîïÑñÒÓÔÕÖØòóôõöøÙÚÛÜùúûüÝýÿ''’`.-,;', 'AAAAAAaaaaaaCcEEEEeeeeIIIIiiiiNnOOOOOOooooooUUUUuuuuYyy      ')),
            'chemin', 'chem'
          ),
          'route', 'rte'
        ),
        'avenue', 'av'
      ),
      'france', ''
    ),
    '[^a-z0-9]+', '', 'g'
  )
$$;

-- Retroactive cleanup for pending calendar/location-completion duplicates.
-- Calendar imports for linked accounts may produce the same appointment with different
-- textual forms of the departure address (e.g. "Chemin" vs "Chem."), so the
-- pending dedupe key intentionally relies on user + day + destination + purpose.
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY
        user_id,
        date,
        public.normalize_trip_dedupe_text(end_location),
        public.normalize_trip_dedupe_text(purpose)
      ORDER BY created_at ASC, id ASC
    ) AS rn
  FROM public.trips
  WHERE deleted_at IS NULL
    AND status = 'pending_location'
    AND public.normalize_trip_dedupe_text(end_location) <> ''
    AND public.normalize_trip_dedupe_text(purpose) <> ''
)
UPDATE public.trips t
SET deleted_at = now()
FROM ranked r
WHERE t.id = r.id
  AND r.rn > 1;

CREATE OR REPLACE FUNCTION public.sync_linked_trip_ins()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  peer uuid;
  existing_id uuid;
  existing_group uuid;
  gid uuid;
BEGIN
  IF current_setting('app.syncing_linked_trip', true) = 'on' THEN RETURN NEW; END IF;
  IF NEW.deleted_at IS NOT NULL THEN RETURN NEW; END IF;
  IF NEW.trip_group_id IS NOT NULL THEN RETURN NEW; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.get_linked_users(NEW.user_id)) THEN RETURN NEW; END IF;

  gid := gen_random_uuid();
  NEW.trip_group_id := gid;
  PERFORM set_config('app.syncing_linked_trip', 'on', true);

  FOR peer IN SELECT u FROM public.get_linked_users(NEW.user_id) u LOOP
    existing_id := NULL;
    existing_group := NULL;

    -- Pending calendar/location-completion rows: match by same day + destination + event title,
    -- because the departure address can vary between accounts/providers.
    IF NEW.status = 'pending_location'
      AND public.normalize_trip_dedupe_text(NEW.end_location) <> ''
      AND public.normalize_trip_dedupe_text(NEW.purpose) <> '' THEN
      SELECT id, trip_group_id INTO existing_id, existing_group
      FROM public.trips
      WHERE user_id = peer
        AND date = NEW.date
        AND status = 'pending_location'
        AND deleted_at IS NULL
        AND public.normalize_trip_dedupe_text(end_location) = public.normalize_trip_dedupe_text(NEW.end_location)
        AND public.normalize_trip_dedupe_text(purpose) = public.normalize_trip_dedupe_text(NEW.purpose)
      ORDER BY created_at ASC, id ASC
      LIMIT 1;
    END IF;

    -- General fallback: exact normalized start/end on the same day.
    IF existing_id IS NULL THEN
      SELECT id, trip_group_id INTO existing_id, existing_group
      FROM public.trips
      WHERE user_id = peer
        AND date = NEW.date
        AND deleted_at IS NULL
        AND public.normalize_trip_dedupe_text(start_location) = public.normalize_trip_dedupe_text(NEW.start_location)
        AND public.normalize_trip_dedupe_text(end_location) = public.normalize_trip_dedupe_text(NEW.end_location)
      ORDER BY created_at ASC, id ASC
      LIMIT 1;
    END IF;

    IF existing_id IS NOT NULL THEN
      -- Merge: adopt the new group id (rewrite any existing group members).
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