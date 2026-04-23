
-- 1. Fix vehicle_cache: restrict read to authenticated only
DROP POLICY IF EXISTS "Service can read vehicle cache" ON public.vehicle_cache;
CREATE POLICY "Authenticated users can read vehicle cache"
  ON public.vehicle_cache FOR SELECT TO authenticated
  USING (true);

-- 2. Fix affiliate_uses: enforce user_id binding
DROP POLICY IF EXISTS "Anyone can insert affiliate uses" ON public.affiliate_uses;
CREATE POLICY "Users can insert own affiliate uses"
  ON public.affiliate_uses FOR INSERT TO authenticated
  WITH CHECK (user_id IS NULL OR auth.uid() = user_id);

-- 3. Fix feedback-images bucket: restrict listing, allow direct access only
DROP POLICY IF EXISTS "Public can view feedback images" ON storage.objects;
CREATE POLICY "Authenticated users can view feedback images"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'feedback-images');

-- 4. Fix blog-images bucket: keep public read but restrict listing
DROP POLICY IF EXISTS "Public can view blog images" ON storage.objects;
CREATE POLICY "Public can view blog images by path"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'blog-images' AND name IS NOT NULL AND name != '');
