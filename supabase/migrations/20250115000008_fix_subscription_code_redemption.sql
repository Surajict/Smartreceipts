-- MIGRATION: Fix Subscription Code Redemption Function
-- This migration fixes the redeem_subscription_code function to resolve:
-- 1. Column ambiguity errors
-- 2. Foreign key constraint issues
-- 3. Proper table structure matching

-- Drop existing redemption function
DROP FUNCTION IF EXISTS redeem_subscription_code(text, uuid);

-- Create the corrected redemption function
CREATE FUNCTION redeem_subscription_code(
  code_to_redeem TEXT,
  target_user_id UUID  -- Using different parameter name to avoid ambiguity with table column
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  code_record subscription_codes%ROWTYPE;
  result JSON;
  subscription_end_date TIMESTAMPTZ;
BEGIN
  -- Find the code
  SELECT * INTO code_record
  FROM subscription_codes
  WHERE code = code_to_redeem
    AND status = 'generated'
    AND expires_at > NOW();
  
  -- Check if code exists and is valid
  IF NOT FOUND THEN
    result := json_build_object(
      'success', false,
      'error', 'Invalid or expired code'
    );
    RETURN result;
  END IF;
  
  -- Calculate subscription end date
  subscription_end_date := NOW() + (code_record.duration_months || ' months')::INTERVAL;
  
  -- Update the code as used
  UPDATE subscription_codes
  SET status = 'used',
      used_at = NOW(),
      used_by_user_id = target_user_id
  WHERE id = code_record.id;
  
  -- Insert or update user subscription (using correct column names and types)
  INSERT INTO user_subscriptions (
    user_id,
    plan,                    -- Using 'plan' column (not 'plan_id')
    status,
    current_period_start,
    current_period_end,
    subscription_type,
    created_at,
    updated_at
  ) VALUES (
    target_user_id,
    'premium'::subscription_plan,  -- Cast to correct enum type
    'active'::subscription_status, -- Cast to correct enum type
    NOW(),
    subscription_end_date,
    'code_based',
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    plan = 'premium'::subscription_plan,
    status = 'active'::subscription_status,
    current_period_start = NOW(),
    current_period_end = GREATEST(user_subscriptions.current_period_end, subscription_end_date),
    subscription_type = 'code_based',
    updated_at = NOW();
  
  -- Return success response
  result := json_build_object(
    'success', true,
    'message', 'Subscription activated successfully',
    'subscription_end_date', subscription_end_date::TEXT
  );
  
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    -- Return error response
    result := json_build_object(
      'success', false,
      'error', SQLERRM
    );
    RETURN result;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION redeem_subscription_code TO authenticated; 