
-- Allow admins to delete feedback
CREATE POLICY "Admins can delete feedback"
ON public.feedback
FOR DELETE
TO public
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to insert feedback (for sending proactive messages)
CREATE POLICY "Admins can insert feedback"
ON public.feedback
FOR INSERT
TO public
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
