-- 1. Remove viewer SELECT on sensitive tables
DROP POLICY IF EXISTS "Viewers can view all feedback" ON public.feedback;
DROP POLICY IF EXISTS "Viewers can respond to feedback" ON public.feedback;
DROP POLICY IF EXISTS "Viewers can view API keys" ON public.blog_api_keys;
DROP POLICY IF EXISTS "Viewers read webhooks" ON public.partner_webhooks;

-- 2. Allow users to delete their own preferences (data deletion right)
CREATE POLICY "Users can delete their own preferences"
  ON public.user_preferences
  FOR DELETE
  USING (auth.uid() = user_id);

-- 3. Allow users to read their own takeout import attempts
CREATE POLICY "Users can view their own import attempts"
  ON public.takeout_import_attempts
  FOR SELECT
  USING (auth.uid() = user_id);

-- 4. Fix realtime default-allow → default-deny
DROP POLICY IF EXISTS "Admins/viewers can read sensitive realtime topics" ON realtime.messages;
DROP POLICY IF EXISTS "Admins/viewers can write to sensitive realtime topics" ON realtime.messages;

CREATE POLICY "Admins/viewers can read sensitive realtime topics"
  ON realtime.messages
  FOR SELECT
  TO authenticated
  USING (
    CASE
      WHEN (realtime.topic() LIKE '%api_audit_logs%' OR realtime.topic() LIKE '%autopilot_events%')
        THEN public.has_admin_or_viewer_role(auth.uid())
      ELSE false
    END
  );

CREATE POLICY "Admins/viewers can write to sensitive realtime topics"
  ON realtime.messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    CASE
      WHEN (realtime.topic() LIKE '%api_audit_logs%' OR realtime.topic() LIKE '%autopilot_events%')
        THEN public.has_admin_or_viewer_role(auth.uid())
      ELSE false
    END
  );

-- 5. Tighten feedback-images SELECT: only owner (files are named `${user_id}-...`)
DROP POLICY IF EXISTS "Authenticated users can view feedback images" ON storage.objects;

CREATE POLICY "Users can view their own feedback images"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'feedback-images'
    AND (name LIKE auth.uid()::text || '-%' OR has_role(auth.uid(), 'admin'::app_role))
  );
