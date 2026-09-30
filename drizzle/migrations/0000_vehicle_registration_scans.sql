CREATE TABLE public.vehicle_registration_scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  license_plate text,
  extracted jsonb NOT NULL DEFAULT '{}'::jsonb,
  image_path text,
  scanned_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.vehicle_registration_scans TO authenticated;
GRANT ALL ON public.vehicle_registration_scans TO service_role;
ALTER TABLE public.vehicle_registration_scans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own scans select" ON public.vehicle_registration_scans FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own scans insert" ON public.vehicle_registration_scans FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own scans delete" ON public.vehicle_registration_scans FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX ON public.vehicle_registration_scans (user_id, scanned_at DESC);

CREATE POLICY "vehicle docs own read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'vehicle-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "vehicle docs own insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'vehicle-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "vehicle docs own delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'vehicle-documents' AND (storage.foldername(name))[1] = auth.uid()::text);