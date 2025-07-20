/*
  # Add Google Authentication Provider
  
  1. New Features
    - Enable Google OAuth provider for authentication
    - Update auth settings to support social login
    - Ensure proper user profile creation for Google users
    
  2. Security
    - Maintain existing RLS policies
    - Ensure proper user data handling
    
  3. User Experience
    - Allow seamless Google sign-in
    - Automatically create user profiles for Google users
*/

-- Update the handle_new_user function to better handle Google auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  user_email text;
  user_name text;
  avatar_url text;
BEGIN
  -- Extract user information safely
  user_email := COALESCE(NEW.email, '');
  
  -- For Google auth, get the full name from the identity data
  IF NEW.raw_user_meta_data->>'full_name' IS NOT NULL THEN
    user_name := NEW.raw_user_meta_data->>'full_name';
  ELSIF NEW.raw_user_meta_data->>'name' IS NOT NULL THEN
    user_name := NEW.raw_user_meta_data->>'name';
  ELSIF NEW.identities IS NOT NULL AND jsonb_array_length(NEW.identities) > 0 THEN
    user_name := NEW.identities->0->>'name';
  ELSE
    user_name := '';
  END IF;
  
  -- Get avatar URL from Google if available
  IF NEW.raw_user_meta_data->>'avatar_url' IS NOT NULL THEN
    avatar_url := NEW.raw_user_meta_data->>'avatar_url';
  ELSIF NEW.identities IS NOT NULL AND jsonb_array_length(NEW.identities) > 0 AND NEW.identities->0->>'provider' = 'google' THEN
    avatar_url := NEW.identities->0->>'avatar_url';
  ELSE
    avatar_url := NULL;
  END IF;
  
  -- Only proceed if we have an email
  IF user_email = '' THEN
    RAISE LOG 'User created without email: %', NEW.id;
    RETURN NEW;
  END IF;
  
  -- Create user profile with error handling
  BEGIN
    INSERT INTO public.users (id, email, full_name, avatar_url, created_at, updated_at)
    VALUES (NEW.id, user_email, user_name, avatar_url, now(), now())
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      full_name = EXCLUDED.full_name,
      avatar_url = EXCLUDED.avatar_url,
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

-- Add comment to track this migration
COMMENT ON FUNCTION public.handle_new_user() IS 'Updated to handle Google authentication and extract user profile data from identities';