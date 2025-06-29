/*
  # Secure File Upload Setup

  1. Storage Configuration
    - Create receipt-images bucket with proper settings
    - Configure file size limits and allowed MIME types
    - Set up user-specific folder structure

  2. Storage Policies
    - Users can only upload to their own folder
    - Users can only access their own files
    - Proper file type and size validation

  3. Database Updates
    - Update receipts table to use image_url column
    - Ensure proper indexing for file paths
*/

-- Create receipt-images bucket with proper configuration
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'receipt-images',
  'receipt-images',
  false, -- Private bucket for security
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'application/pdf'];

-- Create storage policies for receipt-images bucket
DO $$
BEGIN
  -- Policy for uploading receipt files to user's own folder
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND policyname = 'Users can upload receipt files to own folder'
  ) THEN
    CREATE POLICY "Users can upload receipt files to own folder"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (
      bucket_id = 'receipt-images' AND
      auth.uid()::text = (string_to_array(name, '/'))[1]
    );
  END IF;

  -- Policy for viewing own receipt files
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND policyname = 'Users can view own receipt files'
  ) THEN
    CREATE POLICY "Users can view own receipt files"
    ON storage.objects FOR SELECT TO authenticated
    USING (
      bucket_id = 'receipt-images' AND
      auth.uid()::text = (string_to_array(name, '/'))[1]
    );
  END IF;

  -- Policy for updating own receipt files
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND policyname = 'Users can update own receipt files'
  ) THEN
    CREATE POLICY "Users can update own receipt files"
    ON storage.objects FOR UPDATE TO authenticated
    USING (
      bucket_id = 'receipt-images' AND
      auth.uid()::text = (string_to_array(name, '/'))[1]
    )
    WITH CHECK (
      bucket_id = 'receipt-images' AND
      auth.uid()::text = (string_to_array(name, '/'))[1]
    );
  END IF;

  -- Policy for deleting own receipt files
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND policyname = 'Users can delete own receipt files'
  ) THEN
    CREATE POLICY "Users can delete own receipt files"
    ON storage.objects FOR DELETE TO authenticated
    USING (
      bucket_id = 'receipt-images' AND
      auth.uid()::text = (string_to_array(name, '/'))[1]
    );
  END IF;
END $$;

-- Add image_url column to receipts table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'receipts' AND column_name = 'image_url'
  ) THEN
    ALTER TABLE receipts ADD COLUMN image_url text;
  END IF;
END $$;

-- Create index for image_url column for better performance
CREATE INDEX IF NOT EXISTS receipts_image_url_idx ON receipts(image_url);

-- Update existing records to use image_url instead of image_path
UPDATE receipts 
SET image_url = image_path 
WHERE image_url IS NULL AND image_path IS NOT NULL;