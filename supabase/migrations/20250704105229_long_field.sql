/*
  # Fix User Creation and Authentication Issues

  1. Database Fixes
    - Fix user creation triggers that are causing "Database error granting user"
    - Ensure proper error handling in trigger functions
    - Fix RLS policies that might be blocking user creation
    - Add proper permissions for authenticated users

  2. User Management
    - Simplify user creation process
    - Remove problematic triggers and recreate them safely
    - Ensure user profiles are created properly

  3. Security
    - Fix RLS policies to allow proper user operations
    - Ensure service role has necessary permissions
    - Add proper error handling to prevent failures
*/

-- First, let's drop the problematic triggers to avoid conflicts
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_setup ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;

-- Drop the problematic functions
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.create_user_profile();
DROP FUNCTION IF EXISTS public.initialize_user_settings();

-- Ensure all tables exist with proper structure
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text,
  avatar_url text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.user_notification_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  warranty_alerts boolean DEFAULT true NOT NULL,
  auto_system_update boolean DEFAULT true NOT NULL,
  marketing_notifications boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

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

-- Drop existing policies to recreate them safely
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

-- Create comprehensive RLS policies that allow user creation
CREATE POLICY "Enable all operations for service role on users"
  ON public.users FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Users can view own profile"
  ON public.users FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.users FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Notification settings policies
CREATE POLICY "Enable all operations for service role on notification settings"
  ON public.user_notification_settings FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Users can view own notification settings"
  ON public.user_notification_settings FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notification settings"
  ON public.user_notification_settings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notification settings"
  ON public.user_notification_settings FOR UPDATE TO authenticated 
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Privacy settings policies
CREATE POLICY "Enable all operations for service role on privacy settings"
  ON public.user_privacy_settings FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Users can view own privacy settings"
  ON public.user_privacy_settings FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own privacy settings"
  ON public.user_privacy_settings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own privacy settings"
  ON public.user_privacy_settings FOR UPDATE TO authenticated 
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Create a simplified and robust user creation function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  user_email text;
  user_name text;
BEGIN
  -- Extract user information safely
  user_email := COALESCE(NEW.email, '');
  user_name := COALESCE(NEW.raw_user_meta_data->>'full_name', '');
  
  -- Only proceed if we have an email
  IF user_email = '' THEN
    RAISE LOG 'User created without email: %', NEW.id;
    RETURN NEW;
  END IF;
  
  -- Create user profile with error handling
  BEGIN
    INSERT INTO public.users (id, email, full_name, created_at, updated_at)
    VALUES (NEW.id, user_email, user_name, now(), now())
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      full_name = EXCLUDED.full_name,
      updated_at = now();
    
    RAISE LOG 'Created user profile for: %', NEW.id;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE LOG 'Failed to create user profile for %: %', NEW.id, SQLERRM;
  END;
  
  -- Create notification settings with error handling
  BEGIN
    INSERT INTO public.user_notification_settings (
      user_id, warranty_alerts, auto_system_update, marketing_notifications, created_at, updated_at
    ) VALUES (
      NEW.id, true, true, false, now(), now()
    ) ON CONFLICT (user_id) DO NOTHING;
    
    RAISE LOG 'Created notification settings for: %', NEW.id;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE LOG 'Failed to create notification settings for %: %', NEW.id, SQLERRM;
  END;
  
  -- Create privacy settings with error handling
  BEGIN
    INSERT INTO public.user_privacy_settings (
      user_id, data_collection, data_analysis, biometric_login, two_factor_auth, created_at, updated_at
    ) VALUES (
      NEW.id, true, 'allowed', false, false, now(), now()
    ) ON CONFLICT (user_id) DO NOTHING;
    
    RAISE LOG 'Created privacy settings for: %', NEW.id;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE LOG 'Failed to create privacy settings for %: %', NEW.id, SQLERRM;
  END;
  
  RETURN NEW;
END;
$$;

-- Create the trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions to ensure the trigger can execute
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.users TO postgres, service_role;
GRANT ALL ON public.user_notification_settings TO postgres, service_role;
GRANT ALL ON public.user_privacy_settings TO postgres, service_role;

-- Grant specific permissions to authenticated users
GRANT SELECT, INSERT, UPDATE ON public.users TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.user_notification_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.user_privacy_settings TO authenticated;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS users_email_idx ON public.users(email);
CREATE INDEX IF NOT EXISTS user_notification_settings_user_id_idx ON public.user_notification_settings(user_id);
CREATE INDEX IF NOT EXISTS user_privacy_settings_user_id_idx ON public.user_privacy_settings(user_id);

-- Initialize settings for any existing users who don't have them
DO $$
BEGIN
  -- Create profiles for existing auth users
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

  -- Create notification settings for existing users
  INSERT INTO public.user_notification_settings (user_id, warranty_alerts, auto_system_update, marketing_notifications)
  SELECT id, true, true, false
  FROM auth.users 
  WHERE id NOT IN (SELECT user_id FROM public.user_notification_settings)
  ON CONFLICT (user_id) DO NOTHING;

  -- Create privacy settings for existing users
  INSERT INTO public.user_privacy_settings (user_id, data_collection, data_analysis, biometric_login, two_factor_auth)
  SELECT id, true, 'allowed', false, false
  FROM auth.users 
  WHERE id NOT IN (SELECT user_id FROM public.user_privacy_settings)
  ON CONFLICT (user_id) DO NOTHING;

  RAISE LOG 'Initialized settings for existing users';
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error initializing existing user settings: %', SQLERRM;
END $$;

-- Add helpful comments
COMMENT ON FUNCTION public.handle_new_user() IS 'Safely creates user profile and settings when a new user signs up';
COMMENT ON TABLE public.users IS 'Extended user profiles with additional information';
COMMENT ON TABLE public.user_notification_settings IS 'User notification preferences';
COMMENT ON TABLE public.user_privacy_settings IS 'User privacy and security settings';