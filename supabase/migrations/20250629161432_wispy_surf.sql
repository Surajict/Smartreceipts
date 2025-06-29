/*
  # Complete Settings Setup and Profile Pictures

  1. Ensure all tables exist with proper structure
  2. Create profile pictures storage bucket
  3. Set up proper RLS policies
  4. Add missing indexes and constraints
  5. Initialize default settings for existing users
*/

-- Ensure receipts table has all required columns
DO $$
BEGIN
  -- Add store_name column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'receipts' AND column_name = 'store_name'
  ) THEN
    ALTER TABLE receipts ADD COLUMN store_name text;
  END IF;

  -- Add purchase_location column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'receipts' AND column_name = 'purchase_location'
  ) THEN
    ALTER TABLE receipts ADD COLUMN purchase_location text;
  END IF;
END $$;

-- Create user notification settings table
CREATE TABLE IF NOT EXISTS user_notification_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  warranty_alerts boolean DEFAULT true NOT NULL,
  auto_system_update boolean DEFAULT true NOT NULL,
  marketing_notifications boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create user privacy settings table
CREATE TABLE IF NOT EXISTS user_privacy_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  data_collection boolean DEFAULT true NOT NULL,
  data_analysis text DEFAULT 'allowed' CHECK (data_analysis IN ('allowed', 'not_allowed')) NOT NULL,
  biometric_login boolean DEFAULT false NOT NULL,
  two_factor_auth boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS on all tables
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_privacy_settings ENABLE ROW LEVEL SECURITY;

-- Create or update the update_updated_at_column function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
DROP TRIGGER IF EXISTS update_receipts_updated_at ON receipts;
CREATE TRIGGER update_receipts_updated_at
  BEFORE UPDATE ON receipts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_notification_settings_updated_at ON user_notification_settings;
CREATE TRIGGER update_user_notification_settings_updated_at
  BEFORE UPDATE ON user_notification_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_privacy_settings_updated_at ON user_privacy_settings;
CREATE TRIGGER update_user_privacy_settings_updated_at
  BEFORE UPDATE ON user_privacy_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS receipts_user_id_idx ON receipts(user_id);
CREATE INDEX IF NOT EXISTS receipts_purchase_date_idx ON receipts(purchase_date);
CREATE INDEX IF NOT EXISTS receipts_created_at_idx ON receipts(created_at);
CREATE INDEX IF NOT EXISTS receipts_store_name_idx ON receipts(store_name);
CREATE INDEX IF NOT EXISTS receipts_purchase_location_idx ON receipts(purchase_location);
CREATE INDEX IF NOT EXISTS receipts_location_search_idx ON receipts(store_name, purchase_location);

CREATE INDEX IF NOT EXISTS user_notification_settings_user_id_idx ON user_notification_settings(user_id);
CREATE INDEX IF NOT EXISTS user_privacy_settings_user_id_idx ON user_privacy_settings(user_id);

-- Create storage bucket for profile pictures
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-pictures',
  'profile-pictures',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

-- Create storage policies for profile pictures
DO $$
BEGIN
  -- Policy for uploading profile pictures
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND policyname = 'Users can upload own profile pictures'
  ) THEN
    CREATE POLICY "Users can upload own profile pictures"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (
      bucket_id = 'profile-pictures' AND
      auth.uid()::text = (string_to_array(name, '/'))[1]
    );
  END IF;

  -- Policy for viewing profile pictures
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND policyname = 'Anyone can view profile pictures'
  ) THEN
    CREATE POLICY "Anyone can view profile pictures"
    ON storage.objects FOR SELECT TO public
    USING (bucket_id = 'profile-pictures');
  END IF;

  -- Policy for updating profile pictures
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND policyname = 'Users can update own profile pictures'
  ) THEN
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
  END IF;

  -- Policy for deleting profile pictures
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND policyname = 'Users can delete own profile pictures'
  ) THEN
    CREATE POLICY "Users can delete own profile pictures"
    ON storage.objects FOR DELETE TO authenticated
    USING (
      bucket_id = 'profile-pictures' AND
      auth.uid()::text = (string_to_array(name, '/'))[1]
    );
  END IF;
END $$;

-- Create RLS policies for settings tables
DO $$
BEGIN
  -- Notification settings policies
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_notification_settings' 
    AND policyname = 'Users can view own notification settings'
  ) THEN
    CREATE POLICY "Users can view own notification settings"
      ON user_notification_settings
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_notification_settings' 
    AND policyname = 'Users can insert own notification settings'
  ) THEN
    CREATE POLICY "Users can insert own notification settings"
      ON user_notification_settings
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_notification_settings' 
    AND policyname = 'Users can update own notification settings'
  ) THEN
    CREATE POLICY "Users can update own notification settings"
      ON user_notification_settings
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;

  -- Privacy settings policies
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_privacy_settings' 
    AND policyname = 'Users can view own privacy settings'
  ) THEN
    CREATE POLICY "Users can view own privacy settings"
      ON user_privacy_settings
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_privacy_settings' 
    AND policyname = 'Users can insert own privacy settings'
  ) THEN
    CREATE POLICY "Users can insert own privacy settings"
      ON user_privacy_settings
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_privacy_settings' 
    AND policyname = 'Users can update own privacy settings'
  ) THEN
    CREATE POLICY "Users can update own privacy settings"
      ON user_privacy_settings
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Function to initialize default settings for new users
CREATE OR REPLACE FUNCTION initialize_user_settings()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert default notification settings
  INSERT INTO user_notification_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Insert default privacy settings
  INSERT INTO user_privacy_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to initialize settings for new users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION initialize_user_settings();

-- Initialize settings for existing users who don't have them
INSERT INTO user_notification_settings (user_id)
SELECT id FROM auth.users 
WHERE id NOT IN (SELECT user_id FROM user_notification_settings)
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO user_privacy_settings (user_id)
SELECT id FROM auth.users 
WHERE id NOT IN (SELECT user_id FROM user_privacy_settings)
ON CONFLICT (user_id) DO NOTHING;