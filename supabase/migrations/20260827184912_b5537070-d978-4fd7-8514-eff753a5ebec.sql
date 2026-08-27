REVOKE EXECUTE ON FUNCTION public.forum_recalc_profile(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.forum_discussions_after_change() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.forum_replies_after_change() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.forum_votes_after_change() FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.get_forum_stats() TO anon, authenticated;