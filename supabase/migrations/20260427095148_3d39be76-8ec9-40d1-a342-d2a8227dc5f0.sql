-- Enable RLS on realtime.messages and restrict subscriptions to sensitive topics

-- 1) Ensure RLS is enabled (it is by default on Supabase, but make it explicit)
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

-- 2) Drop any pre-existing custom policies we manage, to keep this migration idempotent
DROP POLICY IF EXISTS "Authenticated can read non-sensitive realtime topics" ON realtime.messages;
DROP POLICY IF EXISTS "Admins/viewers can read sensitive realtime topics" ON realtime.messages;
DROP POLICY IF EXISTS "Authenticated can write to non-sensitive realtime topics" ON realtime.messages;
DROP POLICY IF EXISTS "Admins/viewers can write to sensitive realtime topics" ON realtime.messages;

-- 3) Sensitive topics: admin OR viewer role required
--    Topic naming convention used by Supabase Realtime postgres_changes:
--    "realtime:public:<table_name>" or simply the channel name passed by the client.
--    We block access whenever the topic mentions one of the sensitive tables.
CREATE POLICY "Admins/viewers can read sensitive realtime topics"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  CASE
    WHEN realtime.topic() LIKE '%api_audit_logs%'
      OR realtime.topic() LIKE '%autopilot_events%'
    THEN public.has_admin_or_viewer_role(auth.uid())
    ELSE true
  END
);

CREATE POLICY "Admins/viewers can write to sensitive realtime topics"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  CASE
    WHEN realtime.topic() LIKE '%api_audit_logs%'
      OR realtime.topic() LIKE '%autopilot_events%'
    THEN public.has_admin_or_viewer_role(auth.uid())
    ELSE true
  END
);

COMMENT ON POLICY "Admins/viewers can read sensitive realtime topics" ON realtime.messages IS
  'Restrict subscriptions to api_audit_logs and autopilot_events topics to admins/viewers only. Other topics remain open to authenticated users.';