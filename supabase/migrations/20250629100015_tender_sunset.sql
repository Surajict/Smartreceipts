/*
  # Fix Storage Policy Conflicts

  1. Storage Configuration
    - Ensure receipts bucket exists with proper settings
    - Configure file size limits and allowed MIME types

  2. Storage Policies
    - Conditionally create policies only if they don't exist
    - Use proper path checking for user folder isolation
    - Handle all CRUD operations for receipt images

  3. Security
    - Ensure users can only access their own receipt images
    - Maintain proper folder structure: receipts/{user_id}/{filename}
*/

-- First, ensure the receipts bucket exists and is configured properly
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'receipts',
  'receipts',
  false,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'];

-- Conditionally create storage policies to avoid conflicts
DO $$
BEGIN
  -- Policy for uploading receipt images
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Users can upload receipt images to own folder' 
    AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Users can upload receipt images to own folder"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (
      bucket_id = 'receipts' AND
      auth.uid()::text = (string_to_array(name, '/'))[1]
    );
  END IF;

  -- Policy for viewing receipt images
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Users can view own receipt images' 
    AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Users can view own receipt images"
    ON storage.objects FOR SELECT TO authenticated
    USING (
      bucket_id = 'receipts' AND
      auth.uid()::text = (string_to_array(name, '/'))[1]
    );
  END IF;

  -- Policy for updating receipt images
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Users can update own receipt images' 
    AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Users can update own receipt images"
    ON storage.objects FOR UPDATE TO authenticated
    USING (
      bucket_id = 'receipts' AND
      auth.uid()::text = (string_to_array(name, '/'))[1]
    )
    WITH CHECK (
      bucket_id = 'receipts' AND
      auth.uid()::text = (string_to_array(name, '/'))[1]
    );
  END IF;

  -- Policy for deleting receipt images
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Users can delete own receipt images' 
    AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Users can delete own receipt images"
    ON storage.objects FOR DELETE TO authenticated
    USING (
      bucket_id = 'receipts' AND
      auth.uid()::text = (string_to_array(name, '/'))[1]
    );
  END IF;
END $$;