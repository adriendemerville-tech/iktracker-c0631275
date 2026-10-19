DROP POLICY "Anyone can record a click" ON public.partner_clicks;
DROP POLICY "Allow anonymous insert to request_logs" ON public.request_logs;
ALTER POLICY "Users can upload their own feedback images" ON storage.objects WITH CHECK (
  bucket_id = 'feedback-images'
  AND owner_id = (SELECT auth.uid()::text)
  AND name LIKE ((SELECT auth.uid()::text) || '-%')
);
ALTER POLICY "Users can view their own feedback images" ON storage.objects USING (
  bucket_id = 'feedback-images'
  AND (
    owner_id = (SELECT auth.uid()::text)
    OR name LIKE ((SELECT auth.uid()::text) || '-%')
    OR public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  )
);