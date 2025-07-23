-- MIGRATION: Fix User Signup Process
-- This migration fixes the database functions that are causing signup failures
-- by resolving the timing issues in the subscription initialization

-- 1. Fix the initialize_user_subscription function to not depend on querying just-inserted data
DROP FUNCTION IF EXISTS initialize_user_subscription(uuid);

CREATE FUNCTION initialize_user_subscription(user_uuid UUID)
RETURNS user_subscriptions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  subscription_record user_subscriptions;
  current_month text;
BEGIN
  -- Get current month in YYYY-MM format
  current_month := to_char(now(), 'YYYY-MM');
  
  -- Create free subscription if it doesn't exist
  INSERT INTO user_subscriptions (user_id, plan, status)
  VALUES (user_uuid, 'free', 'active')
  ON CONFLICT (user_id) DO NOTHING
  RETURNING * INTO subscription_record;
  
  -- Get existing record if insert was skipped
  IF subscription_record IS NULL THEN
    SELECT * INTO subscription_record
    FROM user_subscriptions
    WHERE user_id = user_uuid;
  END IF;
  
  -- Initialize monthly usage with known free plan (5 receipts limit)
  -- Don't call get_or_create_monthly_usage to avoid circular dependency
  INSERT INTO subscription_usage (user_id, usage_month, receipts_scanned, receipts_limit)
  VALUES (user_uuid, current_month, 0, 5)
  ON CONFLICT (user_id, usage_month) DO NOTHING;
  
  RETURN subscription_record;
END;
$$;

-- 2. Update the get_or_create_monthly_usage function to handle edge cases better
DROP FUNCTION IF EXISTS get_or_create_monthly_usage(uuid);

CREATE FUNCTION get_or_create_monthly_usage(user_uuid UUID)
RETURNS subscription_usage
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_month text;
  usage_record subscription_usage;
  user_plan subscription_plan;
  monthly_limit integer;
BEGIN
  -- Get current month in YYYY-MM format
  current_month := to_char(now(), 'YYYY-MM');
  
  -- Get user's current plan (with fallback to free)
  SELECT COALESCE(plan, 'free') INTO user_plan 
  FROM user_subscriptions 
  WHERE user_id = user_uuid
  LIMIT 1;
  
  -- If no subscription found, assume free (this handles edge cases during signup)
  IF user_plan IS NULL THEN
    user_plan := 'free';
  END IF;
  
  -- Set limit based on plan
  IF user_plan = 'premium' THEN
    monthly_limit := 999999;
  ELSE
    monthly_limit := 5; -- Free tier limit
  END IF;
  
  -- Try to get existing usage record
  SELECT * INTO usage_record
  FROM subscription_usage
  WHERE user_id = user_uuid AND usage_month = current_month;
  
  -- Create record if it doesn't exist
  IF usage_record IS NULL THEN
    INSERT INTO subscription_usage (user_id, usage_month, receipts_scanned, receipts_limit)
    VALUES (user_uuid, current_month, 0, monthly_limit)
    RETURNING * INTO usage_record;
  ELSE
    -- Update limit in case plan changed
    UPDATE subscription_usage
    SET receipts_limit = monthly_limit, updated_at = now()
    WHERE user_id = user_uuid AND usage_month = current_month
    RETURNING * INTO usage_record;
  END IF;
  
  RETURN usage_record;
END;
$$;

-- 3. Drop the trigger first, then the function, then recreate both
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- 4. Create the improved handle_new_user function
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
      -- Don't fail the signup if user profile creation fails
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
      -- Don't fail the signup if notification settings creation fails
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
      -- Don't fail the signup if privacy settings creation fails
  END;
  
  -- Initialize subscription (with improved error handling)
  BEGIN
    PERFORM initialize_user_subscription(NEW.id);
    
    RAISE LOG 'Initialized subscription for: %', NEW.id;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE LOG 'Failed to initialize subscription for %: %', NEW.id, SQLERRM;
      -- Don't fail the signup if subscription initialization fails
      -- User can still sign up and subscription can be initialized later
  END;
  
  RETURN NEW;
END;
$$;

-- 5. Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user(); 