ALTER TABLE public.forum_discussions
  ADD COLUMN IF NOT EXISTS publish_at timestamptz;

CREATE INDEX IF NOT EXISTS forum_discussions_publish_at_idx
  ON public.forum_discussions (publish_at)
  WHERE status = 'pending';

CREATE OR REPLACE FUNCTION public.forum_publish_due_discussions()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n integer;
BEGIN
  WITH due AS (
    UPDATE public.forum_discussions
    SET status = 'published',
        created_at = COALESCE(publish_at, now()),
        last_activity_at = COALESCE(publish_at, now()),
        publish_at = NULL
    WHERE status = 'pending'
      AND publish_at IS NOT NULL
      AND publish_at <= now()
    RETURNING 1
  )
  SELECT count(*) INTO n FROM due;
  RETURN n;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.forum_publish_due_discussions() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.forum_publish_due_discussions() TO service_role;