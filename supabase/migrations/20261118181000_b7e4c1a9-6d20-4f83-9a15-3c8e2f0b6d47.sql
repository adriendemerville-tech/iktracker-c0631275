-- Reprogramme les tâches pg_cron qui appellent net.http_post.
-- Les en-têtes lisent Vault au moment de l'exécution. Cette migration
-- ne crée aucun secret et n'écrit aucune valeur.
--
-- Avant de l'appliquer, créer (SQL editor, rôle postgres) :
--   vault.create_secret(<secret cron>, 'iktracker_cron_secret', '...');
--   vault.create_secret(<clé service_role>, 'service_role_key', '...');
-- La clé service_role doit être la même chaîne que le secret d'Edge
-- Function SUPABASE_SERVICE_ROLE_KEY. iktracker_cron_secret doit être
-- la même chaîne que la variable CRON_SECRET.
--
-- Les tâches SQL pures ne sont pas touchées. Les deux envois de relevés
-- lisaient déjà Vault (email_queue_service_role_key) : on les
-- reprogramme seulement pour poser le timeout.

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

DO $guard$
DECLARE
  missing text;
BEGIN
  SELECT string_agg(needed.name, ', ' ORDER BY needed.name)
    INTO missing
  FROM (
    VALUES
      ('iktracker_cron_secret'),
      ('service_role_key'),
      ('email_queue_service_role_key')
  ) AS needed(name)
  WHERE NOT EXISTS (
    SELECT 1
    FROM vault.decrypted_secrets AS stored
    WHERE stored.name = needed.name
      AND stored.decrypted_secret IS NOT NULL
      AND length(stored.decrypted_secret) > 0
  );

  IF missing IS NOT NULL THEN
    RAISE EXCEPTION
      'Secrets Vault manquants (%). Créez-les avec vault.create_secret avant cette migration. Elle n''écrit aucune valeur et ne modifie aucune tâche tant que ce contrôle échoue.',
      missing;
  END IF;
END
$guard$;

SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'sync-calendar-trips-hourly';
SELECT cron.schedule(
  'sync-calendar-trips-hourly',
  '0 * * * *',
  $cmd$
  SELECT net.http_post(
    url := 'https://yarjaudctshlxkatqgeb.supabase.co/functions/v1/sync-calendar-trips',
    body := '{"trigger": "cron-hourly"}'::jsonb,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'iktracker_cron_secret' limit 1)
    ),
    timeout_milliseconds := 120000
  );
  $cmd$
);

SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'linkedin-post-audit-5min';
SELECT cron.schedule(
  'linkedin-post-audit-5min',
  '0 * * * *',
  $cmd$
  SELECT net.http_post(
    url := 'https://yarjaudctshlxkatqgeb.supabase.co/functions/v1/linkedin-post-audit',
    body := '{}'::jsonb,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'iktracker_cron_secret' limit 1)
    ),
    timeout_milliseconds := 120000
  ) AS request_id;
  $cmd$
);

SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'linkedin-monthly-post';
SELECT cron.schedule(
  'linkedin-monthly-post',
  '0 7 1-7 * *',
  $cmd$
  SELECT CASE WHEN extract(dow from now() at time zone 'utc') = 3 THEN
    net.http_post(
      url := 'https://yarjaudctshlxkatqgeb.supabase.co/functions/v1/linkedin-weekly-post',
      body := '{}'::jsonb,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'iktracker_cron_secret' limit 1)
      ),
      timeout_milliseconds := 120000
    )::text
  END;
  $cmd$
);

SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'trips-guard-daily';
SELECT cron.schedule(
  'trips-guard-daily',
  '45 3 * * *',
  $cmd$
  SELECT net.http_post(
    url := 'https://yarjaudctshlxkatqgeb.supabase.co/functions/v1/trips-guard',
    body := '{"since_days": 400}'::jsonb,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'iktracker_cron_secret' limit 1)
    ),
    timeout_milliseconds := 120000
  ) AS request_id;
  $cmd$
);

-- generate-recurring-trips a verify_jwt = true : la passerelle exige un JWT.
-- Le Bearer historique est un JWT legacy de rôle anon. On le remplace par la
-- clé service_role lue dans Vault. x-cron-secret reste le secret cron.
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'generate-recurring-trips-daily';
SELECT cron.schedule(
  'generate-recurring-trips-daily',
  '0 5 * * *',
  $cmd$
  SELECT net.http_post(
    url := 'https://yarjaudctshlxkatqgeb.supabase.co/functions/v1/generate-recurring-trips',
    body := '{}'::jsonb,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key' limit 1),
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'iktracker_cron_secret' limit 1)
    ),
    timeout_milliseconds := 120000
  );
  $cmd$
);

-- purge-duplicate-trips compare x-cron-secret à SUPABASE_SERVICE_ROLE_KEY,
-- pas à CRON_SECRET. verify_jwt = true : apikey doit être un JWT legacy valide.
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'purge-duplicate-trips-daily';
SELECT cron.schedule(
  'purge-duplicate-trips-daily',
  '15 3 * * *',
  $cmd$
  SELECT net.http_post(
    url := 'https://yarjaudctshlxkatqgeb.supabase.co/functions/v1/purge-duplicate-trips',
    body := '{"dry_run": false, "days_back": 90}'::jsonb,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key' limit 1),
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key' limit 1)
    ),
    timeout_milliseconds := 120000
  );
  $cmd$
);

SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'submit-indexing-daily';
SELECT cron.schedule(
  'submit-indexing-daily',
  '5 6 * * *',
  $cmd$
  SELECT net.http_post(
    url := 'https://iktracker.fr/api/public/submit-indexing',
    body := '{"sinceHours":26}'::jsonb,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'iktracker_cron_secret' limit 1)
    ),
    timeout_milliseconds := 120000
  );
  $cmd$
);

SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'content-freshness-audit-daily';
SELECT cron.schedule(
  'content-freshness-audit-daily',
  '0 6 * * *',
  $cmd$
  SELECT net.http_post(
    url := 'https://project--5bbd6f17-49e4-4066-9f35-29e062baefea.lovable.app/api/public/content-freshness-audit',
    body := '{"checkLinks": true}'::jsonb,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'iktracker_cron_secret' limit 1)
    ),
    timeout_milliseconds := 120000
  );
  $cmd$
);

SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'forum-bot-tick-hourly';
SELECT cron.schedule(
  'forum-bot-tick-hourly',
  '17 * * * *',
  $cmd$
  SELECT net.http_post(
    url := 'https://project--5bbd6f17-49e4-4066-9f35-29e062baefea.lovable.app/api/public/forum-bot-tick',
    body := '{}'::jsonb,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'iktracker_cron_secret' limit 1)
    ),
    timeout_milliseconds := 120000
  );
  $cmd$
);

SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'send-accountant-report-daily';
SELECT cron.schedule(
  'send-accountant-report-daily',
  '0 7 * * *',
  $cmd$
  SELECT net.http_post(
    url := 'https://yarjaudctshlxkatqgeb.supabase.co/functions/v1/send-accountant-report',
    body := '{}'::jsonb,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'email_queue_service_role_key' limit 1)
    ),
    timeout_milliseconds := 120000
  );
  $cmd$
);

SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'send-user-monthly-report';
SELECT cron.schedule(
  'send-user-monthly-report',
  '0 7 15 * *',
  $cmd$
  SELECT net.http_post(
    url := 'https://yarjaudctshlxkatqgeb.supabase.co/functions/v1/send-user-monthly-report',
    body := '{}'::jsonb,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'email_queue_service_role_key' limit 1)
    ),
    timeout_milliseconds := 120000
  );
  $cmd$
);
