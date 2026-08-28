REVOKE EXECUTE ON FUNCTION public.forum_publish_due_discussions() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.forum_publish_due_discussions() TO service_role;