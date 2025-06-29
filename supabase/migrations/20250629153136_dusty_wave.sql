/*
  # Create profile pictures storage bucket

  1. Storage Bucket
    - Create `profile-pictures` bucket for storing user profile images
    - Configure bucket settings for profile pictures

  2. Storage Policies
    - Users can upload their own profile pictures
    - Users can view their own profile pictures
    - Users can update their own profile pictures
    - Users can delete their own profile pictures

  3. Security
    - Ensure users can only access their own profile pictures
    - Maintain proper folder structure: profile-pictures/{user_id}/avatar.{ext}
*/

-- Create profile-pictures bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-pictures',
  'profile-pictures',
  true, -- Public bucket for easier access to profile pictures
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

-- Create storage policies for profile pictures
CREATE POLICY "Users can upload own profile pictures"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'profile-pictures' AND
  auth.uid()::text = (string_to_array(name, '/'))[1]
);

CREATE POLICY "Anyone can view profile pictures"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'profile-pictures');

CREATE POLICY "Users can update own profile pictures"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'profile-pictures' AND
  auth.uid()::text = (string_to_array(name, '/'))[1]
)
WITH CHECK (
  bucket_id = 'profile-pictures' AND
  auth.uid()::text = (string_to_array(name, '/'))[1]
);

CREATE POLICY "Users can delete own profile pictures"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'profile-pictures' AND
  auth.uid()::text = (string_to_array(name, '/'))[1]
);