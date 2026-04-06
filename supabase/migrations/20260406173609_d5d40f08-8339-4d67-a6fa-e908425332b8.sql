
CREATE POLICY "Allow anonymous insert to request_logs"
ON public.request_logs
FOR INSERT
TO anon
WITH CHECK (true);
