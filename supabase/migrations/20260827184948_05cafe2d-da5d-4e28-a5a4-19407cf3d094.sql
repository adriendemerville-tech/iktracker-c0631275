CREATE POLICY "forum_attachments_upload_own"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'forum-attachments'
  AND (storage.foldername(name))[1] = (select auth.uid())::text
);

CREATE POLICY "forum_attachments_read_own"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'forum-attachments'
  AND (
    (storage.foldername(name))[1] = (select auth.uid())::text
    OR public.has_admin_or_viewer_role((select auth.uid()))
  )
);

CREATE POLICY "forum_attachments_delete_own"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'forum-attachments'
  AND (
    (storage.foldername(name))[1] = (select auth.uid())::text
    OR public.has_role((select auth.uid()), 'admin')
  )
);