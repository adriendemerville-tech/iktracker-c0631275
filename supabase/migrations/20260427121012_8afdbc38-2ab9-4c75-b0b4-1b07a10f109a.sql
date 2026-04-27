-- Enable RLS on realtime.messages (channel-level authorization)
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if present (idempotent)
DROP POLICY IF EXISTS "Authenticated can subscribe to non-sensitive topics" ON realtime.messages;
DROP POLICY IF EXISTS "Admins can subscribe to sensitive topics" ON realtime.messages;

-- Policy 1: Admins have full access to all realtime topics
CREATE POLICY "Admins can subscribe to sensitive topics"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- Policy 2: Non-admin authenticated users can subscribe to any topic
-- EXCEPT sensitive ones (api_audit_logs, autopilot_events)
CREATE POLICY "Authenticated can subscribe to non-sensitive topics"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() NOT IN ('api_audit_logs', 'autopilot_events')
  AND realtime.topic() NOT LIKE 'api_audit_logs:%'
  AND realtime.topic() NOT LIKE 'autopilot_events:%'
);