/*
  # Add Subscription and Usage Tracking System

  1. New Tables
    - `user_subscriptions`: Track user subscription status and payment info
    - `subscription_usage`: Monthly usage tracking for freemium limits

  2. Freemium Model
    - Free Tier: 5 receipts per month
    - Premium Tier: Unlimited receipts for AU$7/month
    - Usage resets monthly

  3. Security
    - Enable RLS on all new tables
    - Users can only see their own subscription data
    - Proper policies for subscription management

  4. Functions
    - Usage tracking and limit checking
    - Monthly usage reset
    - Subscription status helpers
*/

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create subscription plans enum
CREATE TYPE subscription_plan AS ENUM ('free', 'premium');
CREATE TYPE subscription_status AS ENUM ('active', 'canceled', 'past_due', 'incomplete', 'trialing');

-- Create user_subscriptions table
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Plan information
  plan subscription_plan NOT NULL DEFAULT 'free',
  status subscription_status NOT NULL DEFAULT 'active',
  
  -- Stripe integration
  stripe_customer_id text UNIQUE,
  stripe_subscription_id text UNIQUE,
  stripe_price_id text,
  
  -- Subscription timing
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean DEFAULT false,
  canceled_at timestamptz,
  
  -- Metadata
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create subscription_usage table for monthly tracking
CREATE TABLE IF NOT EXISTS subscription_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Usage period (year-month format: 2025-01)
  usage_month text NOT NULL,
  
  -- Usage counters
  receipts_scanned integer DEFAULT 0 NOT NULL,
  receipts_limit integer DEFAULT 5 NOT NULL, -- Free tier limit
  
  -- Metadata
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  
  -- Ensure one record per user per month
  UNIQUE(user_id, usage_month)
);

-- Enable RLS on new tables
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_usage ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_subscriptions
CREATE POLICY "Users can view own subscription"
  ON user_subscriptions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscription"
  ON user_subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscription"
  ON user_subscriptions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage subscriptions"
  ON user_subscriptions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create RLS policies for subscription_usage
CREATE POLICY "Users can view own usage"
  ON subscription_usage
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own usage"
  ON subscription_usage
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own usage"
  ON subscription_usage
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage usage"
  ON subscription_usage
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS user_subscriptions_user_id_idx ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS user_subscriptions_stripe_customer_id_idx ON user_subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS user_subscriptions_stripe_subscription_id_idx ON user_subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS user_subscriptions_status_idx ON user_subscriptions(status);

CREATE INDEX IF NOT EXISTS subscription_usage_user_id_idx ON subscription_usage(user_id);
CREATE INDEX IF NOT EXISTS subscription_usage_month_idx ON subscription_usage(usage_month);
CREATE INDEX IF NOT EXISTS subscription_usage_user_month_idx ON subscription_usage(user_id, usage_month);

-- Create triggers for updated_at
CREATE TRIGGER update_user_subscriptions_updated_at
  BEFORE UPDATE ON user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscription_usage_updated_at
  BEFORE UPDATE ON subscription_usage
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to get or create monthly usage record
CREATE OR REPLACE FUNCTION get_or_create_monthly_usage(user_uuid uuid)
RETURNS subscription_usage AS $$
DECLARE
  current_month text;
  usage_record subscription_usage;
  user_plan subscription_plan;
  monthly_limit integer;
BEGIN
  -- Get current month in YYYY-MM format
  current_month := to_char(now(), 'YYYY-MM');
  
  -- Get user's current plan
  SELECT plan INTO user_plan 
  FROM user_subscriptions 
  WHERE user_id = user_uuid
  LIMIT 1;
  
  -- Set limit based on plan (unlimited for premium = very high number)
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can scan more receipts
CREATE OR REPLACE FUNCTION can_user_scan_receipt(user_uuid uuid)
RETURNS boolean AS $$
DECLARE
  usage_record subscription_usage;
BEGIN
  -- Get or create current month usage
  usage_record := get_or_create_monthly_usage(user_uuid);
  
  -- Check if under limit
  RETURN usage_record.receipts_scanned < usage_record.receipts_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment receipt usage count
CREATE OR REPLACE FUNCTION increment_receipt_usage(user_uuid uuid)
RETURNS subscription_usage AS $$
DECLARE
  current_month text;
  usage_record subscription_usage;
BEGIN
  -- Get current month in YYYY-MM format
  current_month := to_char(now(), 'YYYY-MM');
  
  -- Increment usage count
  UPDATE subscription_usage
  SET receipts_scanned = receipts_scanned + 1,
      updated_at = now()
  WHERE user_id = user_uuid AND usage_month = current_month
  RETURNING * INTO usage_record;
  
  -- Create record if it doesn't exist (edge case)
  IF usage_record IS NULL THEN
    usage_record := get_or_create_monthly_usage(user_uuid);
    
    UPDATE subscription_usage
    SET receipts_scanned = 1,
        updated_at = now()
    WHERE user_id = user_uuid AND usage_month = current_month
    RETURNING * INTO usage_record;
  END IF;
  
  RETURN usage_record;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's subscription info with current usage
CREATE OR REPLACE FUNCTION get_user_subscription_info(user_uuid uuid)
RETURNS TABLE(
  plan subscription_plan,
  status subscription_status,
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_end timestamptz,
  cancel_at_period_end boolean,
  receipts_used integer,
  receipts_limit integer,
  usage_month text
) AS $$
DECLARE
  current_month text;
BEGIN
  current_month := to_char(now(), 'YYYY-MM');
  
  RETURN QUERY
  SELECT 
    COALESCE(s.plan, 'free'::subscription_plan) as plan,
    COALESCE(s.status, 'active'::subscription_status) as status,
    s.stripe_customer_id,
    s.stripe_subscription_id,
    s.current_period_end,
    COALESCE(s.cancel_at_period_end, false) as cancel_at_period_end,
    COALESCE(u.receipts_scanned, 0) as receipts_used,
    CASE 
      WHEN COALESCE(s.plan, 'free') = 'premium' THEN 999999
      ELSE 5
    END as receipts_limit,
    current_month as usage_month
  FROM auth.users au
  LEFT JOIN user_subscriptions s ON au.id = s.user_id
  LEFT JOIN subscription_usage u ON au.id = u.user_id AND u.usage_month = current_month
  WHERE au.id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to initialize subscription for new users
CREATE OR REPLACE FUNCTION initialize_user_subscription(user_uuid uuid)
RETURNS user_subscriptions AS $$
DECLARE
  subscription_record user_subscriptions;
BEGIN
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
  
  -- Initialize monthly usage
  PERFORM get_or_create_monthly_usage(user_uuid);
  
  RETURN subscription_record;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the existing handle_new_user function to include subscription initialization
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
  
  -- Initialize subscription (NEW: Freemium feature)
  BEGIN
    PERFORM initialize_user_subscription(NEW.id);
    
    RAISE LOG 'Initialized subscription for: %', NEW.id;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE LOG 'Failed to initialize subscription for %: %', NEW.id, SQLERRM;
  END;
  
  RETURN NEW;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_or_create_monthly_usage(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION can_user_scan_receipt(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_receipt_usage(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_subscription_info(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION initialize_user_subscription(uuid) TO authenticated;

-- Grant table permissions
GRANT SELECT, INSERT, UPDATE ON user_subscriptions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON subscription_usage TO authenticated;

-- Initialize subscriptions for existing users
DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN SELECT id FROM auth.users LOOP
    BEGIN
      PERFORM initialize_user_subscription(user_record.id);
      RAISE LOG 'Initialized subscription for existing user: %', user_record.id;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE LOG 'Failed to initialize subscription for existing user %: %', user_record.id, SQLERRM;
    END;
  END LOOP;
END $$; 