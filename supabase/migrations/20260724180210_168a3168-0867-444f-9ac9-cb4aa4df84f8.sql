CREATE POLICY "Public can read non-expired shares by id" ON public.report_shares FOR SELECT TO anon, authenticated USING (expires_at > now());
GRANT SELECT ON public.report_shares TO anon;