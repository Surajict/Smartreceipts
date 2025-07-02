/*
  # Fix User Settings Tables

  1. Tables
    - Ensure user_notification_settings table exists with proper structure
    - Ensure user_privacy_settings table exists with proper structure
    - Add proper foreign key constraints
    - Enable RLS on both tables

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to manage their own settings
*/

-- Create user_notification_settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_notification_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  warranty_alerts boolean DEFAULT true NOT NULL,
  auto_system_update boolean DEFAULT true NOT NULL,
  marketing_notifications boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create user_privacy_settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_privacy_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  data_collection boolean DEFAULT true NOT NULL,
  data_analysis text DEFAULT 'allowed' NOT NULL CHECK (data_analysis IN ('allowed', 'not_allowed')),
  biometric_login boolean DEFAULT false NOT NULL,
  two_factor_auth boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE user_notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_privacy_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own notification settings" ON user_notification_settings;
DROP POLICY IF EXISTS "Users can insert own notification settings" ON user_notification_settings;
DROP POLICY IF EXISTS "Users can update own notification settings" ON user_notification_settings;

DROP POLICY IF EXISTS "Users can view own privacy settings" ON user_privacy_settings;
DROP POLICY IF EXISTS "Users can insert own privacy settings" ON user_privacy_settings;
DROP POLICY IF EXISTS "Users can update own privacy settings" ON user_privacy_settings;

-- Create policies for user_notification_settings
CREATE POLICY "Users can view own notification settings"
  ON user_notification_settings
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notification settings"
  ON user_notification_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notification settings"
  ON user_notification_settings
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create policies for user_privacy_settings
CREATE POLICY "Users can view own privacy settings"
  ON user_privacy_settings
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own privacy settings"
  ON user_privacy_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own privacy settings"
  ON user_privacy_settings
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
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
CREATE INDEX IF NOT EXISTS user_notification_settings_user_id_idx ON user_notification_settings(user_id);
CREATE INDEX IF NOT EXISTS user_privacy_settings_user_id_idx ON user_privacy_settings(user_id);