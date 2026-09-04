CREATE POLICY "Signed-in users can read product images"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'product-images');

CREATE POLICY "Signed-in users can upload product images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'product-images');

CREATE POLICY "Signed-in users can update product images"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'product-images')
WITH CHECK (bucket_id = 'product-images');

CREATE POLICY "Signed-in users can delete product images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'product-images');