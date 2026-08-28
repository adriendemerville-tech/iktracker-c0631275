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
       AND parent_author <> d.author_id
       AND EXISTS (SELECT 1 FROM auth.users u WHERE u.id = parent_author) THEN
      INSERT INTO public.forum_notifications (user_id, actor_id, discussion_id, reply_id, kind, title, slug, excerpt)
      VALUES (parent_author, NEW.author_id, d.id, NEW.id, 'mention', d.title, d.slug, left(NEW.body, 200));
    END IF;
  END IF;

  RETURN NEW;
END;
$$;