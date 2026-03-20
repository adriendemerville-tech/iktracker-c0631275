-- Fix has_role: remove the clause that treats viewer as admin
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Now add viewer SELECT policies for tables that need read access
CREATE POLICY "Viewers can view API keys" ON public.blog_api_keys
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'viewer'));

CREATE POLICY "Viewers can view all posts" ON public.blog_posts
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'viewer'));

CREATE POLICY "Viewers can view all surveys" ON public.surveys
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'viewer'));

CREATE POLICY "Viewers can view all variants" ON public.survey_variants
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'viewer'));

CREATE POLICY "Viewers can view error logs" ON public.error_logs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'viewer'));

CREATE POLICY "Viewers can view excluded IPs" ON public.excluded_ips
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'viewer'));

CREATE POLICY "Viewers can view audit logs" ON public.api_audit_logs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'viewer'));

CREATE POLICY "Viewers can view all roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'viewer'));

CREATE POLICY "Viewers can view all feedback" ON public.feedback
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'viewer'));

CREATE POLICY "Viewers can respond to feedback" ON public.feedback
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'viewer'));

CREATE POLICY "Viewers can view share events" ON public.share_events
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'viewer'));

CREATE POLICY "Viewers can view download clicks" ON public.download_clicks
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'viewer'));

CREATE POLICY "Viewers can view all impressions" ON public.survey_impressions
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'viewer'));

CREATE POLICY "Viewers can view all responses" ON public.survey_responses
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'viewer'));

CREATE POLICY "Viewers can view usage logs" ON public.api_usage_logs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'viewer'));

CREATE POLICY "Viewers can view import attempts" ON public.takeout_import_attempts
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'viewer'));

CREATE POLICY "Viewers can view marketing analytics" ON public.marketing_analytics
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'viewer'));