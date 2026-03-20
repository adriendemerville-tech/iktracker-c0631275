-- Drop the overly permissive public SELECT policy on report_shares
DROP POLICY IF EXISTS "Anyone can view non-expired shares" ON public.report_shares;

-- Replace with owner-only SELECT policy
-- Public access to shared reports goes through the view-report edge function (uses service role)
CREATE POLICY "Users can view their own shares" ON public.report_shares
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);