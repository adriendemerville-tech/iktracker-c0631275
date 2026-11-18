-- Vérification du filtre ILIKE échappé (recherche admin des comptes).
-- Ce script n'est pas une migration : il ne remplace aucune fonction du
-- schéma public et n'écrit dans aucune table durable.
-- Il ouvre une transaction, joue les cas sur une table temporaire, puis
-- l'annule avec ROLLBACK.
--
-- Cas : « _ », « % », « a_b », « 100% », un terme ordinaire (« ada »),
-- un terme vide (toutes les lignes). Le comptage et la liste utilisent
-- le même prédicat.

BEGIN;

CREATE TEMP TABLE admin_search_escape_samples (
  id uuid PRIMARY KEY,
  email text NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  created_at timestamptz NOT NULL
) ON COMMIT DROP;

INSERT INTO admin_search_escape_samples (id, email, first_name, last_name, created_at)
VALUES
  ('11111111-1111-4111-8111-111111111111', 'ada.lovelace@example.com', 'Ada', 'Lovelace', '2026-01-06 00:00:00+00'),
  ('22222222-2222-4222-8222-222222222222', 'a_b@example.com', 'Ann', 'Bee', '2026-01-05 00:00:00+00'),
  ('33333333-3333-4333-8333-333333333333', 'axb@example.com', 'Ax', 'Bee', '2026-01-04 00:00:00+00'),
  ('44444444-4444-4444-8444-444444444444', 'promo100%@example.com', 'Promo', 'Sold', '2026-01-03 00:00:00+00'),
  ('55555555-5555-4555-8555-555555555555', 'promo1000@example.com', 'Promo', 'Mille', '2026-01-02 00:00:00+00'),
  ('66666666-6666-4666-8666-666666666666', 'plain@example.com', 'Plain', 'User', '2026-01-01 00:00:00+00'),
  ('77777777-7777-4777-8777-777777777777', 'under_score@example.com', 'Zoe', 'Quux', '2025-12-31 00:00:00+00'),
  ('88888888-8888-4888-8888-888888888888', 'cent@example.com', 'No', '100%', '2025-12-30 00:00:00+00'),
  ('99999999-9999-4999-8999-999999999999', 'a' || chr(92) || 'b@example.com', 'Slash', 'User', '2025-12-29 00:00:00+00');

-- Même échappement que count_admin_users et search_users :
-- \ puis % puis _, avec ILIKE ... ESCAPE '\'.
CREATE FUNCTION pg_temp.admin_user_matches(
  search_term text,
  email text,
  first_name text,
  last_name text,
  user_id text
)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $function$
DECLARE
  term text;
BEGIN
  term := replace(replace(replace(COALESCE(search_term, ''), '\', '\\'), '%', '\%'), '_', '\_');
  RETURN
    term = '' OR
    email ILIKE '%' || term || '%' ESCAPE '\' OR
    first_name ILIKE '%' || term || '%' ESCAPE '\' OR
    last_name ILIKE '%' || term || '%' ESCAPE '\' OR
    user_id ILIKE '%' || term || '%' ESCAPE '\';
END;
$function$;

CREATE FUNCTION pg_temp.assert_search(search_term text, expected text[])
RETURNS void
LANGUAGE plpgsql
AS $function$
DECLARE
  counted bigint;
  listed text[];
BEGIN
  SELECT count(*)
  INTO counted
  FROM admin_search_escape_samples AS s
  WHERE pg_temp.admin_user_matches(search_term, s.email, s.first_name, s.last_name, s.id::text);

  SELECT COALESCE(array_agg(s.email ORDER BY s.created_at DESC, s.id DESC), '{}'::text[])
  INTO listed
  FROM admin_search_escape_samples AS s
  WHERE pg_temp.admin_user_matches(search_term, s.email, s.first_name, s.last_name, s.id::text);

  IF counted IS DISTINCT FROM cardinality(expected)
     OR counted IS DISTINCT FROM cardinality(listed) THEN
    RAISE EXCEPTION
      'comptage et liste divergent pour « % » : count=%, liste=%, attendu=%',
      search_term, counted, cardinality(listed), cardinality(expected);
  END IF;

  IF listed IS DISTINCT FROM expected THEN
    RAISE EXCEPTION
      'filtre « % » : obtenu %, attendu %',
      search_term, listed, expected;
  END IF;
END;
$function$;

DO $check$
DECLARE
  escaped text;
BEGIN
  escaped := replace(replace(replace(COALESCE('_', ''), '\', '\\'), '%', '\%'), '_', '\_');
  IF escaped IS DISTINCT FROM chr(92) || '_' THEN
    RAISE EXCEPTION 'échappement de _ : %', escaped;
  END IF;

  escaped := replace(replace(replace(COALESCE('%', ''), '\', '\\'), '%', '\%'), '_', '\_');
  IF escaped IS DISTINCT FROM chr(92) || '%' THEN
    RAISE EXCEPTION 'échappement de %% : %', escaped;
  END IF;

  escaped := replace(replace(replace(COALESCE('a_b', ''), '\', '\\'), '%', '\%'), '_', '\_');
  IF escaped IS DISTINCT FROM 'a' || chr(92) || '_b' THEN
    RAISE EXCEPTION 'échappement de a_b : %', escaped;
  END IF;

  escaped := replace(replace(replace(COALESCE('100%', ''), '\', '\\'), '%', '\%'), '_', '\_');
  IF escaped IS DISTINCT FROM '100' || chr(92) || '%' THEN
    RAISE EXCEPTION 'échappement de 100%% : %', escaped;
  END IF;

  escaped := replace(replace(replace(COALESCE('ada', ''), '\', '\\'), '%', '\%'), '_', '\_');
  IF escaped IS DISTINCT FROM 'ada' THEN
    RAISE EXCEPTION 'échappement de ada : %', escaped;
  END IF;

  escaped := replace(replace(replace(COALESCE('', ''), '\', '\\'), '%', '\%'), '_', '\_');
  IF escaped IS DISTINCT FROM '' THEN
    RAISE EXCEPTION 'échappement du terme vide : %', escaped;
  END IF;

  escaped := replace(replace(replace(COALESCE(chr(92), ''), '\', '\\'), '%', '\%'), '_', '\_');
  IF escaped IS DISTINCT FROM chr(92) || chr(92) THEN
    RAISE EXCEPTION 'échappement de \ : %', escaped;
  END IF;

  -- « _ » : le souligné littéral, pas toutes les lignes.
  -- Ordre de la liste : created_at DESC, id DESC.
  PERFORM pg_temp.assert_search(
    '_',
    ARRAY['a_b@example.com', 'under_score@example.com']
  );

  -- « % » : le pourcent littéral, pas toutes les lignes.
  PERFORM pg_temp.assert_search(
    '%',
    ARRAY['promo100%@example.com', 'cent@example.com']
  );

  -- « a_b » n'accepte pas n'importe quel caractère entre a et b.
  PERFORM pg_temp.assert_search(
    'a_b',
    ARRAY['a_b@example.com']
  );

  -- « 100% » ne correspond ni à 1000 ni à un caractère quelconque après 100.
  PERFORM pg_temp.assert_search(
    '100%',
    ARRAY['promo100%@example.com', 'cent@example.com']
  );

  -- Terme ordinaire, insensible à la casse.
  PERFORM pg_temp.assert_search(
    'ada',
    ARRAY['ada.lovelace@example.com']
  );
  PERFORM pg_temp.assert_search(
    'ADA',
    ARRAY['ada.lovelace@example.com']
  );

  -- Terme vide : toutes les lignes, du plus récent au plus ancien.
  PERFORM pg_temp.assert_search(
    '',
    ARRAY[
      'ada.lovelace@example.com',
      'a_b@example.com',
      'axb@example.com',
      'promo100%@example.com',
      'promo1000@example.com',
      'plain@example.com',
      'under_score@example.com',
      'cent@example.com',
      'a' || chr(92) || 'b@example.com'
    ]
  );

  -- Un antislash saisi reste un antislash, il ne réactive pas les jokers.
  PERFORM pg_temp.assert_search(
    'a' || chr(92) || 'b',
    ARRAY['a' || chr(92) || 'b@example.com']
  );

  RAISE NOTICE 'verification des jokers ILIKE ok';
END;
$check$;

ROLLBACK;
