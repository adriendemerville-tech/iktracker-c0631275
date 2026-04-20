
-- Drop the problematic unique constraint that prevents proper session lifecycle
ALTER TABLE public.tour_sessions DROP CONSTRAINT IF EXISTS tour_sessions_user_id_is_active_key;

-- Clean up zombie active sessions older than 2 hours
UPDATE public.tour_sessions SET is_active = false, updated_at = now() WHERE is_active = true AND last_activity < now() - interval '2 hours';
