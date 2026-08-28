CREATE TABLE public.forum_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  actor_id uuid,
  discussion_id uuid not null references public.forum_discussions(id) on delete cascade,
  reply_id uuid references public.forum_replies(id) on delete cascade,
  kind text not null default 'reply',
  title text not null,
  slug text not null,
  excerpt text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

CREATE INDEX idx_forum_notifications_user_unread ON public.forum_notifications (user_id, read_at, created_at DESC);

GRANT SELECT, UPDATE, DELETE ON public.forum_notifications TO authenticated;
GRANT ALL ON public.forum_notifications TO service_role;

ALTER TABLE public.forum_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own notifications read" ON public.forum_notifications
  FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
CREATE POLICY "own notifications update" ON public.forum_notifications
  FOR UPDATE TO authenticated USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "own notifications delete" ON public.forum_notifications
  FOR DELETE TO authenticated USING ((select auth.uid()) = user_id);

CREATE OR REPLACE FUNCTION public.forum_notify_on_reply()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  d RECORD;
  parent_author uuid;
BEGIN
  SELECT id, title, slug, author_id INTO d FROM public.forum_discussions WHERE id = NEW.discussion_id;
  IF d IS NULL THEN RETURN NEW; END IF;

  IF NEW.parent_reply_id IS NOT NULL THEN
    SELECT author_id INTO parent_author FROM public.forum_replies WHERE id = NEW.parent_reply_id;
  END IF;

  IF parent_author IS NOT NULL AND parent_author <> NEW.author_id THEN
    INSERT INTO public.forum_notifications (user_id, actor_id, discussion_id, reply_id, kind, title, slug, excerpt)
    VALUES (parent_author, NEW.author_id, d.id, NEW.id, 'reply_to_reply', d.title, d.slug, left(NEW.body, 200));
  END IF;

  IF d.author_id IS NOT NULL AND d.author_id <> NEW.author_id AND (parent_author IS NULL OR parent_author <> d.author_id) THEN
    INSERT INTO public.forum_notifications (user_id, actor_id, discussion_id, reply_id, kind, title, slug, excerpt)
    VALUES (d.author_id, NEW.author_id, d.id, NEW.id, 'reply', d.title, d.slug, left(NEW.body, 200));
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_forum_notify_on_reply
AFTER INSERT ON public.forum_replies
FOR EACH ROW EXECUTE FUNCTION public.forum_notify_on_reply();