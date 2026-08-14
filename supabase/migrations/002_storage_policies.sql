-- Storage policies for item-images bucket
-- Create bucket "item-images" in Supabase Dashboard (private)

CREATE POLICY "Users can upload own images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'item-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can view own images"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'item-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete own images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'item-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
