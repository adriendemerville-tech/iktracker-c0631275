CREATE OR REPLACE FUNCTION public.forum_notify_mentions(
  p_body text,
  p_discussion_id uuid,
  p_reply_id uuid,
  p_actor uuid,
  p_title text,
  p_slug text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  m text;
  target uuid;
BEGIN
  IF p_body IS NULL THEN RETURN; END IF;

  FOR m IN
    SELECT DISTINCT lower(x[1])
    FROM regexp_matches(p_body, '@([A-Za-z0-9_\-\.]{2,40})', 'g') AS x
  LOOP
    SELECT user_id INTO target
    FROM public.forum_profiles
    WHERE lower(pseudo) = m
    LIMIT 1;

    IF target IS NOT NULL
       AND target <> p_actor
       AND EXISTS (SELECT 1 FROM auth.users u WHERE u.id = target)
       AND NOT EXISTS (
         SELECT 1 FROM public.forum_notifications n
         WHERE n.user_id = target
           AND n.discussion_id = p_discussion_id
           AND n.reply_id IS NOT DISTINCT FROM p_reply_id
       ) THEN
      INSERT INTO public.forum_notifications (user_id, actor_id, discussion_id, reply_id, kind, title, slug, excerpt)
      VALUES (target, p_actor, p_discussion_id, p_reply_id, 'mention', p_title, p_slug, left(p_body, 200));
    END IF;
  END LOOP;
END;
$$;

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
  IF NEW.status <> 'published' THEN
    RETURN NEW;
  END IF;

  SELECT id, title, slug, author_id INTO d
  FROM public.forum_discussions WHERE id = NEW.discussion_id;

  IF d.author_id IS NOT NULL
     AND d.author_id <> NEW.author_id
     AND EXISTS (SELECT 1 FROM auth.users u WHERE u.id = d.author_id) THEN
    INSERT INTO public.forum_notifications (user_id, actor_id, discussion_id, reply_id, kind, title, slug, excerpt)
    VALUES (d.author_id, NEW.author_id, d.id, NEW.id, 'reply', d.title, d.slug, left(NEW.body, 200));
  END IF;

  IF NEW.parent_reply_id IS NOT NULL THEN
    SELECT author_id INTO parent_author FROM public.forum_replies WHERE id = NEW.parent_reply_id;
    IF parent_author IS NOT NULL
       AND parent_author <> NEW.author_id
       AND parent_author IS DISTINCT FROM d.author_id
       AND EXISTS (SELECT 1 FROM auth.users u WHERE u.id = parent_author) THEN
      INSERT INTO public.forum_notifications (user_id, actor_id, discussion_id, reply_id, kind, title, slug, excerpt)
      VALUES (parent_author, NEW.author_id, d.id, NEW.id, 'reply_to_reply', d.title, d.slug, left(NEW.body, 200));
    END IF;
  END IF;

  PERFORM public.forum_notify_mentions(NEW.body, d.id, NEW.id, NEW.author_id, d.title, d.slug);

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.forum_notify_on_discussion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status <> 'published' THEN
    RETURN NEW;
  END IF;
  PERFORM public.forum_notify_mentions(
    coalesce(NEW.title, '') || ' ' || coalesce(NEW.body, ''),
    NEW.id, NULL, NEW.author_id, NEW.title, NEW.slug
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_forum_notify_on_discussion ON public.forum_discussions;
CREATE TRIGGER trg_forum_notify_on_discussion
AFTER INSERT ON public.forum_discussions
FOR EACH ROW EXECUTE FUNCTION public.forum_notify_on_discussion();