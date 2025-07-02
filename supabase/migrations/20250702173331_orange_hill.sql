/*
  # Fix Supabase Authentication Integration

  1. Database Structure
    - Ensure all required tables exist with proper structure
    - Fix foreign key constraints and triggers
    - Add proper RLS policies for authentication flow

  2. Authentication Flow
    - Fix user creation triggers to handle auth.users properly
    - Ensure profile creation doesn't block authentication
    - Add proper error handling in triggers

  3. Security
    - Update RLS policies to work with authentication flow
    - Ensure service role can perform necessary operations
    - Add policies for user profile management
*/

-- First, ensure the users table exists with proper structure
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text,
  avatar_url text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Ensure notification settings table exists
CREATE TABLE IF NOT EXISTS public.user_notification_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  warranty_alerts boolean DEFAULT true NOT NULL,
  auto_system_update boolean DEFAULT true NOT NULL,
  marketing_notifications boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Ensure privacy settings table exists
CREATE TABLE IF NOT EXISTS public.user_privacy_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  data_collection boolean DEFAULT true NOT NULL,
  data_analysis text DEFAULT 'allowed' CHECK (data_analysis IN ('allowed', 'not_allowed')) NOT NULL,
  biometric_login boolean DEFAULT false NOT NULL,
  two_factor_auth boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_privacy_settings ENABLE ROW LEVEL SECURITY;

-- Create or replace the update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop all existing triggers to avoid conflicts
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_settings_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
DROP TRIGGER IF EXISTS update_user_notification_settings_updated_at ON public.user_notification_settings;
DROP TRIGGER IF EXISTS update_user_privacy_settings_updated_at ON public.user_privacy_settings;

-- Create updated_at triggers for all tables
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_notification_settings_updated_at
  BEFORE UPDATE ON public.user_notification_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_privacy_settings_updated_at
  BEFORE UPDATE ON public.user_privacy_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create a single comprehensive function to handle user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_email text;
  user_name text;
BEGIN
  -- Extract email and name safely
  user_email := COALESCE(NEW.email, '');
  user_name := COALESCE(NEW.raw_user_meta_data->>'full_name', '');
  
  -- Only proceed if we have an email
  IF user_email = '' THEN
    RAISE WARNING 'User created without email: %', NEW.id;
    RETURN NEW;
  END IF;
  
  -- Insert user profile
  BEGIN
    INSERT INTO public.users (id, email, full_name, created_at, updated_at)
    VALUES (NEW.id, user_email, user_name, now(), now())
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      full_name = EXCLUDED.full_name,
      updated_at = now();
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Failed to create user profile for %: %', NEW.id, SQLERRM;
  END;
  
  -- Insert notification settings
  BEGIN
    INSERT INTO public.user_notification_settings (
      user_id, warranty_alerts, auto_system_update, marketing_notifications, created_at, updated_at
    ) VALUES (
      NEW.id, true, true, false, now(), now()
    ) ON CONFLICT (user_id) DO NOTHING;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Failed to create notification settings for %: %', NEW.id, SQLERRM;
  END;
  
  -- Insert privacy settings
  BEGIN
    INSERT INTO public.user_privacy_settings (
      user_id, data_collection, data_analysis, biometric_login, two_factor_auth, created_at, updated_at
    ) VALUES (
      NEW.id, true, 'allowed', false, false, now(), now()
    ) ON CONFLICT (user_id) DO NOTHING;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Failed to create privacy settings for %: %', NEW.id, SQLERRM;
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Drop existing policies to recreate them properly
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Service role can manage users" ON public.users;

DROP POLICY IF EXISTS "Users can view own notification settings" ON public.user_notification_settings;
DROP POLICY IF EXISTS "Users can insert own notification settings" ON public.user_notification_settings;
DROP POLICY IF EXISTS "Users can update own notification settings" ON public.user_notification_settings;
DROP POLICY IF EXISTS "Service role can manage notification settings" ON public.user_notification_settings;

DROP POLICY IF EXISTS "Users can view own privacy settings" ON public.user_privacy_settings;
DROP POLICY IF EXISTS "Users can insert own privacy settings" ON public.user_privacy_settings;
DROP POLICY IF EXISTS "Users can update own privacy settings" ON public.user_privacy_settings;
DROP POLICY IF EXISTS "Service role can manage privacy settings" ON public.user_privacy_settings;

-- Create comprehensive RLS policies for users table
CREATE POLICY "Users can view own profile"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Service role can manage users"
  ON public.users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create RLS policies for notification settings
CREATE POLICY "Users can view own notification settings"
  ON public.user_notification_settings
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notification settings"
  ON public.user_notification_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notification settings"
  ON public.user_notification_settings
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage notification settings"
  ON public.user_notification_settings
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create RLS policies for privacy settings
CREATE POLICY "Users can view own privacy settings"
  ON public.user_privacy_settings
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own privacy settings"
  ON public.user_privacy_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own privacy settings"
  ON public.user_privacy_settings
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage privacy settings"
  ON public.user_privacy_settings
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated, anon, service_role;
GRANT ALL ON public.users TO service_role;
GRANT ALL ON public.user_notification_settings TO service_role;
GRANT ALL ON public.user_privacy_settings TO service_role;

GRANT SELECT, INSERT, UPDATE ON public.users TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.user_notification_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.user_privacy_settings TO authenticated;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS users_email_idx ON public.users(email);
CREATE INDEX IF NOT EXISTS user_notification_settings_user_id_idx ON public.user_notification_settings(user_id);
CREATE INDEX IF NOT EXISTS user_privacy_settings_user_id_idx ON public.user_privacy_settings(user_id);

-- Initialize settings for any existing users who don't have them
INSERT INTO public.user_notification_settings (user_id, warranty_alerts, auto_system_update, marketing_notifications)
SELECT id, true, true, false
FROM auth.users 
WHERE id NOT IN (SELECT user_id FROM public.user_notification_settings)
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO public.user_privacy_settings (user_id, data_collection, data_analysis, biometric_login, two_factor_auth)
SELECT id, true, 'allowed', false, false
FROM auth.users 
WHERE id NOT IN (SELECT user_id FROM public.user_privacy_settings)
ON CONFLICT (user_id) DO NOTHING;

-- Ensure any existing auth users have profiles
INSERT INTO public.users (id, email, full_name)
SELECT 
  au.id, 
  COALESCE(au.email, ''), 
  COALESCE(au.raw_user_meta_data->>'full_name', '')
FROM auth.users au
WHERE au.id NOT IN (SELECT id FROM public.users)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  updated_at = now();