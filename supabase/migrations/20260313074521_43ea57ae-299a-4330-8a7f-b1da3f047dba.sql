
-- Fix: restrict insert to authenticated users inserting their own logs
DROP POLICY "Authenticated users can insert usage logs" ON public.api_usage_logs;

CREATE POLICY "Users can insert own usage logs"
ON public.api_usage_logs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Also allow inserts with null user_id (from edge functions via service role - this policy won't apply to service role anyway)
-- Add admin insert policy for manual entries
CREATE POLICY "Admins can insert usage logs"
ON public.api_usage_logs
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));
