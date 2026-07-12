CREATE TABLE IF NOT EXISTS public.linkedin_post_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  posted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  topic_slug TEXT NOT NULL,
  topic_title TEXT NOT NULL,
  post_text TEXT,
  linkedin_post_id TEXT,
  linkedin_asset_urn TEXT,
  video_bytes INTEGER,
  status TEXT NOT NULL DEFAULT 'success',
  error_message TEXT,
  duration_ms INTEGER,
  triggered_by TEXT NOT NULL DEFAULT 'cron'
);

CREATE INDEX IF NOT EXISTS linkedin_post_log_posted_at_idx
  ON public.linkedin_post_log (posted_at DESC);

GRANT SELECT ON public.linkedin_post_log TO authenticated;
GRANT ALL ON public.linkedin_post_log TO service_role;

ALTER TABLE public.linkedin_post_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and viewers can read LinkedIn post log"
  ON public.linkedin_post_log FOR SELECT
  TO authenticated
  USING (public.has_admin_or_viewer_role(auth.uid()));