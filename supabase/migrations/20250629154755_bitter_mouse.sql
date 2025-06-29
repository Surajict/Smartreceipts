/*
  # Create User Settings Tables

  1. New Tables
    - `user_notification_settings`
      - `user_id` (uuid, foreign key to auth.users)
      - `warranty_alerts` (boolean, default true)
      - `auto_system_update` (boolean, default true)
      - `marketing_notifications` (boolean, default false)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `user_privacy_settings`
      - `user_id` (uuid, foreign key to auth.users)
      - `data_collection` (boolean, default true)
      - `data_analysis` (text, 'allowed'/'not_allowed', default 'allowed')
      - `biometric_login` (boolean, default false)
      - `two_factor_auth` (boolean, default false)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to manage their own settings

  3. Functions
    - Create trigger functions for updated_at timestamps
    - Create function to initialize default settings for new users
*/

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

-- Enable RLS
ALTER TABLE user_notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_privacy_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for notification settings
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

-- Create policies for privacy settings
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

-- Create trigger for notification settings updated_at
CREATE TRIGGER update_user_notification_settings_updated_at
  BEFORE UPDATE ON user_notification_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create trigger for privacy settings updated_at
CREATE TRIGGER update_user_privacy_settings_updated_at
  BEFORE UPDATE ON user_privacy_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

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
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION initialize_user_settings();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS user_notification_settings_user_id_idx ON user_notification_settings(user_id);
CREATE INDEX IF NOT EXISTS user_privacy_settings_user_id_idx ON user_privacy_settings(user_id);