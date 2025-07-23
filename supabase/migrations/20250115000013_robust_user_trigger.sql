-- MIGRATION: Robust User Trigger
-- This migration creates a bulletproof version of the handle_new_user trigger
-- that will never fail the signup process, even if individual steps fail

-- 1. Create the super-robust handle_new_user function
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
  setup_errors text[] := '{}';
BEGIN
  -- Always return NEW at the end, no matter what happens
  -- This ensures signup never fails due to our custom setup code
  
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
      RAISE LOG 'User created without email: %, skipping setup', NEW.id;
      RETURN NEW;
    END IF;
    
    RAISE LOG 'Starting user setup for: % (%)', NEW.id, user_email;
    
  EXCEPTION
    WHEN OTHERS THEN
      RAISE LOG 'Failed to extract user info for %: %', NEW.id, SQLERRM;
      RETURN NEW; -- Always succeed signup
  END;
  
  -- 1. Create user profile
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
      setup_errors := setup_errors || ('user_profile: ' || SQLERRM);
      RAISE LOG 'Failed to create user profile for %: %', NEW.id, SQLERRM;
  END;
  
  -- 2. Create notification settings
  BEGIN
    INSERT INTO public.user_notification_settings (
      user_id, warranty_alerts, auto_system_update, marketing_notifications, created_at, updated_at
    ) VALUES (
      NEW.id, true, true, false, now(), now()
    ) ON CONFLICT (user_id) DO NOTHING;
    
    RAISE LOG 'Created notification settings for: %', NEW.id;
  EXCEPTION
    WHEN OTHERS THEN
      setup_errors := setup_errors || ('notification_settings: ' || SQLERRM);
      RAISE LOG 'Failed to create notification settings for %: %', NEW.id, SQLERRM;
  END;
  
  -- 3. Create privacy settings
  BEGIN
    INSERT INTO public.user_privacy_settings (
      user_id, data_collection, data_analysis, biometric_login, two_factor_auth, created_at, updated_at
    ) VALUES (
      NEW.id, true, 'allowed', false, false, now(), now()
    ) ON CONFLICT (user_id) DO NOTHING;
    
    RAISE LOG 'Created privacy settings for: %', NEW.id;
  EXCEPTION
    WHEN OTHERS THEN
      setup_errors := setup_errors || ('privacy_settings: ' || SQLERRM);
      RAISE LOG 'Failed to create privacy settings for %: %', NEW.id, SQLERRM;
  END;
  
  -- 4. Initialize subscription
  BEGIN
    -- Simplified subscription initialization - no function calls
    INSERT INTO user_subscriptions (user_id, plan, status)
    VALUES (NEW.id, 'free', 'active')
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Initialize monthly usage directly
    INSERT INTO subscription_usage (user_id, usage_month, receipts_scanned, receipts_limit)
    VALUES (NEW.id, to_char(now(), 'YYYY-MM'), 0, 5)
    ON CONFLICT (user_id, usage_month) DO NOTHING;
    
    RAISE LOG 'Initialized subscription for: %', NEW.id;
  EXCEPTION
    WHEN OTHERS THEN
      setup_errors := setup_errors || ('subscription: ' || SQLERRM);
      RAISE LOG 'Failed to initialize subscription for %: %', NEW.id, SQLERRM;
  END;
  
  -- Log completion status
  IF array_length(setup_errors, 1) > 0 THEN
    RAISE LOG 'User setup completed with errors for %: %', NEW.id, setup_errors;
  ELSE
    RAISE LOG 'User setup completed successfully for: %', NEW.id;
  END IF;
  
  -- ALWAYS RETURN NEW - Never fail the signup!
  RETURN NEW;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Ultimate safety net - log the error but never fail signup
    RAISE LOG 'Critical error in handle_new_user for %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- 2. Re-enable the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 3. Log that we've re-enabled the robust trigger
SELECT 'Robust user trigger enabled successfully' as status; 