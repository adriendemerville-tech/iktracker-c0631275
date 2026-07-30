-- 1. report_shares: remove anonymous/global read of every non-expired share.
DROP POLICY IF EXISTS "Public can read non-expired shares by id" ON public.report_shares;
REVOKE SELECT ON public.report_shares FROM anon;

-- 2. vehicle_cache: internal cache, service-role only.
DROP POLICY IF EXISTS "Authenticated users can read vehicle cache" ON public.vehicle_cache;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.vehicle_cache FROM anon, authenticated;
GRANT ALL ON public.vehicle_cache TO service_role;

-- 3. Lock down search_path + execution rights on the pgmq helper functions.
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public, pgmq;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public, pgmq;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public, pgmq;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public, pgmq;

REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM anon, authenticated;

-- 4. Admin-only / internal SECURITY DEFINER helpers should not be callable by anon.
REVOKE EXECUTE ON FUNCTION public.get_recent_signups(integer) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_stats(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_admin_stats(date, date) FROM anon;
REVOKE EXECUTE ON FUNCTION public.validate_partner_key(text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_partner_usage(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_blog_api_usage(text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.purge_old_deleted_trips() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_shares() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_old_phone_numbers() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_total_tours_count(timestamptz, timestamptz) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_signup_clicks_by_day(timestamptz, timestamptz) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_bareme_simulations_by_day(integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_monthly_stats(integer) FROM anon;