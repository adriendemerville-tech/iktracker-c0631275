REVOKE ALL ON FUNCTION public.forum_notify_mentions(text, uuid, uuid, uuid, text, text) FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.forum_notify_on_discussion() FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.forum_notify_on_reply() FROM anon, authenticated, public;