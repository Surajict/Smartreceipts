-- Fix subscription expiry validation
-- This migration updates the get_user_subscription_info function to properly handle expired subscriptions

-- Drop and recreate the function with expiry validation
DROP FUNCTION IF EXISTS get_user_subscription_info(uuid);

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
  effective_plan subscription_plan;
  effective_status subscription_status;
BEGIN
  current_month := to_char(now(), 'YYYY-MM');
  
  -- Get subscription data with expiry validation
  SELECT 
    CASE 
      -- If subscription has expired (current_period_end is in the past), revert to free
      WHEN s.current_period_end IS NOT NULL AND s.current_period_end < now() THEN 'free'::subscription_plan
      -- Otherwise use the stored plan (or default to free)
      ELSE COALESCE(s.plan, 'free'::subscription_plan)
    END,
    CASE 
      -- If subscription has expired, mark as past_due
      WHEN s.current_period_end IS NOT NULL AND s.current_period_end < now() THEN 'past_due'::subscription_status
      -- Otherwise use the stored status (or default to active)
      ELSE COALESCE(s.status, 'active'::subscription_status)
    END
  INTO effective_plan, effective_status
  FROM auth.users au
  LEFT JOIN user_subscriptions s ON au.id = s.user_id
  WHERE au.id = user_uuid;
  
  -- Return the query with validated plan and status
  RETURN QUERY
  SELECT 
    effective_plan as plan,
    effective_status as status,
    s.stripe_customer_id,
    s.stripe_subscription_id,
    s.current_period_end,
    COALESCE(s.cancel_at_period_end, false) as cancel_at_period_end,
    COALESCE(u.receipts_scanned, 0) as receipts_used,
    CASE 
      -- Use effective_plan for determining limits
      WHEN effective_plan = 'premium' THEN 999999
      ELSE 5
    END as receipts_limit,
    current_month as usage_month
  FROM auth.users au
  LEFT JOIN user_subscriptions s ON au.id = s.user_id
  LEFT JOIN subscription_usage u ON au.id = u.user_id AND u.usage_month = current_month
  WHERE au.id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_user_subscription_info(uuid) TO authenticated;

-- Also create a helper function to check if a subscription is expired
CREATE OR REPLACE FUNCTION is_subscription_expired(user_uuid uuid)
RETURNS boolean AS $$
DECLARE
  expiry_date timestamptz;
BEGIN
  SELECT current_period_end INTO expiry_date
  FROM user_subscriptions
  WHERE user_id = user_uuid;
  
  -- If no expiry date is set, subscription is not expired
  IF expiry_date IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check if current time is past expiry date
  RETURN now() > expiry_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION is_subscription_expired(uuid) TO authenticated;

-- Update any expired premium subscriptions to free plan
-- This is a one-time cleanup for existing data
UPDATE user_subscriptions 
SET 
  plan = 'free',
  status = 'past_due',
  updated_at = now()
WHERE 
  plan = 'premium' 
  AND current_period_end IS NOT NULL 
  AND current_period_end < now();

-- Add a comment explaining the fix
COMMENT ON FUNCTION get_user_subscription_info(uuid) IS 'Returns user subscription info with proper expiry validation. Automatically downgrades expired premium subscriptions to free plan.';
COMMENT ON FUNCTION is_subscription_expired(uuid) IS 'Helper function to check if a users subscription has expired based on current_period_end date.';
