
DROP POLICY IF EXISTS "Authenticated users can upload feedback images" ON storage.objects;
CREATE POLICY "Users can upload their own feedback images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'feedback-images'
  AND name LIKE (auth.uid()::text || '-%')
);

DROP POLICY IF EXISTS "Admins can view all report shares" ON public.report_shares;
CREATE POLICY "Admins can view all report shares"
ON public.report_shares
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

DO $$
DECLARE
  v_jobid bigint;
BEGIN
  SELECT jobid INTO v_jobid FROM cron.job WHERE jobname = 'generate-recurring-trips-daily';
  IF v_jobid IS NOT NULL THEN
    PERFORM cron.unschedule(v_jobid);
  END IF;
END $$;
