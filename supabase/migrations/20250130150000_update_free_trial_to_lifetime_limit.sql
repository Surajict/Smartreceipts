-- Update free trial to lifetime limit of 5 receipts total
-- This migration modifies the subscription system to enforce a lifetime limit for free users

-- Update the get_user_subscription_info function to handle lifetime limits
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
  total_receipts_count integer;
BEGIN
  current_month := to_char(now(), 'YYYY-MM');
  
  -- Get total lifetime receipts count for the user
  SELECT COUNT(*)::integer INTO total_receipts_count
  FROM receipts r
  WHERE r.user_id = user_uuid;
  
  -- Get subscription data with expiry validation
  SELECT 
    CASE 
      -- If subscription has expired, determine plan based on receipt count
      WHEN s.current_period_end IS NOT NULL AND s.current_period_end < now() THEN 
        CASE 
          WHEN total_receipts_count > 5 THEN 'free'::subscription_plan  -- Force upgrade needed
          ELSE 'free'::subscription_plan
        END
      -- Otherwise use the stored plan
      ELSE COALESCE(s.plan, 'free'::subscription_plan)
    END,
    CASE 
      -- If subscription has expired, mark as past_due
      WHEN s.current_period_end IS NOT NULL AND s.current_period_end < now() THEN 'past_due'::subscription_status
      -- Otherwise use the stored status (or default to active)
      ELSE COALESCE(s.status, 'active'::subscription_status)
    END,
    s.stripe_customer_id,
    s.stripe_subscription_id,
    s.current_period_end,
    s.cancel_at_period_end
  INTO effective_plan, effective_status, stripe_customer_id, stripe_subscription_id, current_period_end, cancel_at_period_end
  FROM user_subscriptions s
  WHERE s.user_id = user_uuid;

  -- If no subscription record exists, create default values
  IF effective_plan IS NULL THEN
    effective_plan := 'free'::subscription_plan;
    effective_status := 'active'::subscription_status;
  END IF;

  -- Determine receipts limit based on plan and total usage
  RETURN QUERY SELECT
    effective_plan,
    effective_status,
    get_user_subscription_info.stripe_customer_id,
    get_user_subscription_info.stripe_subscription_id,
    get_user_subscription_info.current_period_end,
    get_user_subscription_info.cancel_at_period_end,
    total_receipts_count, -- Return total lifetime receipts
    CASE 
      WHEN effective_plan = 'premium' AND effective_status = 'active' AND (get_user_subscription_info.current_period_end IS NULL OR get_user_subscription_info.current_period_end > now()) THEN 999999  -- Unlimited for active premium
      ELSE 5  -- Lifetime limit of 5 for free users
    END as receipts_limit,
    current_month;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update subscription usage tracking to use lifetime totals
-- We'll keep the subscription_usage table for compatibility but modify the logic

-- Drop existing function if it exists (to handle return type changes)
DROP FUNCTION IF EXISTS can_user_scan_receipt(uuid);

-- Create a function to check if user can scan more receipts
CREATE OR REPLACE FUNCTION can_user_scan_receipt(user_uuid uuid)
RETURNS TABLE(can_scan boolean, reason text, receipts_used integer, receipts_limit integer) AS $$
DECLARE
  user_info RECORD;
  total_receipts integer;
BEGIN
  -- Get user subscription info
  SELECT * INTO user_info
  FROM get_user_subscription_info(user_uuid) 
  LIMIT 1;
  
  total_receipts := user_info.receipts_used;
  
  -- Check if user can scan based on their plan and usage
  IF user_info.plan = 'premium' AND user_info.status = 'active' AND (user_info.current_period_end IS NULL OR user_info.current_period_end > now()) THEN
    -- Active premium user can scan unlimited
    RETURN QUERY SELECT true, 'Active premium subscription'::text, total_receipts, user_info.receipts_limit;
  ELSIF total_receipts >= 5 THEN
    -- Free user or expired premium user who has reached the 5 receipt limit
    RETURN QUERY SELECT false, 'Free trial limit of 5 receipts reached. Please upgrade to Premium to continue scanning.'::text, total_receipts, user_info.receipts_limit;
  ELSE
    -- Free user under the limit
    RETURN QUERY SELECT true, format('Free trial: %s of 5 receipts remaining', 5 - total_receipts)::text, total_receipts, user_info.receipts_limit;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION can_user_scan_receipt(uuid) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION can_user_scan_receipt(uuid) IS 'Check if user can scan more receipts based on lifetime limit and subscription status';
COMMENT ON FUNCTION get_user_subscription_info(uuid) IS 'Updated to handle lifetime receipt limits instead of monthly limits';
