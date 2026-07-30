ALTER TABLE public.linkedin_post_log
  ADD COLUMN IF NOT EXISTS audit_status text,
  ADD COLUMN IF NOT EXISTS audit_score integer,
  ADD COLUMN IF NOT EXISTS audit_hook_score integer,
  ADD COLUMN IF NOT EXISTS audit_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS audited_at timestamptz,
  ADD COLUMN IF NOT EXISTS audit_report jsonb;

CREATE INDEX IF NOT EXISTS linkedin_post_log_audit_pending_idx
  ON public.linkedin_post_log (posted_at DESC)
  WHERE status = 'success' AND audit_status IS NULL;

SELECT cron.schedule(
  'linkedin-post-audit-5min',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://yarjaudctshlxkatqgeb.supabase.co/functions/v1/linkedin-post-audit',
    headers := '{"Content-Type": "application/json", "x-cron-secret": "2e450a8478d1005d8d2861bfe671a0ec9357d0a8f0aba12a901412947a9101d4"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);