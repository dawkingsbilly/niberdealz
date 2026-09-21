-- Product gallery storage: public image delivery, authenticated owner-scoped writes.
-- Object paths must begin with auth.uid(), enforced below.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Public read product images'
  ) THEN
    CREATE POLICY "Public read product images"
      ON storage.objects FOR SELECT TO anon, authenticated
      USING (bucket_id = 'product-images');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Vendor upload product images'
  ) THEN
    CREATE POLICY "Vendor upload product images"
      ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (
        bucket_id = 'product-images'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Vendor update own product images'
  ) THEN
    CREATE POLICY "Vendor update own product images"
      ON storage.objects FOR UPDATE TO authenticated
      USING (
        bucket_id = 'product-images'
        AND (storage.foldername(name))[1] = auth.uid()::text
      )
      WITH CHECK (
        bucket_id = 'product-images'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Vendor delete own product images'
  ) THEN
    CREATE POLICY "Vendor delete own product images"
      ON storage.objects FOR DELETE TO authenticated
      USING (
        bucket_id = 'product-images'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;
END $$;
