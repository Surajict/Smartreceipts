-- Fix receipt counting for usage limits to properly handle multi-product receipts
-- A single receipt (even with multiple products) should count as 1 scan toward the limit

-- Drop and recreate the get_user_subscription_info function with proper receipt counting
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
  total_receipt_scans integer;
BEGIN
  current_month := to_char(now(), 'YYYY-MM');
  
  -- Count receipt scans properly: 
  -- - Each unique receipt_group_id counts as 1 scan (multi-product receipts)
  -- - Each individual receipt without a group counts as 1 scan (single-product receipts)
  SELECT COUNT(DISTINCT COALESCE(r.receipt_group_id, r.id))::integer 
  INTO total_receipt_scans
  FROM receipts r
  WHERE r.user_id = user_uuid;
  
  -- Get subscription data with expiry validation
  SELECT 
    CASE 
      -- If subscription has expired, determine plan based on receipt count
      WHEN s.current_period_end IS NOT NULL AND s.current_period_end < now() THEN 
        CASE 
          WHEN total_receipt_scans > 5 THEN 'free'::subscription_plan  -- Force upgrade needed
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
    total_receipt_scans, -- Return total receipt scans (not individual products)
    CASE 
      WHEN effective_plan = 'premium' AND effective_status = 'active' AND (get_user_subscription_info.current_period_end IS NULL OR get_user_subscription_info.current_period_end > now()) THEN 999999  -- Unlimited for active premium
      ELSE 5  -- Lifetime limit of 5 for free users
    END as receipts_limit,
    current_month;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate the can_user_scan_receipt function with proper receipt counting
DROP FUNCTION IF EXISTS can_user_scan_receipt(uuid);

CREATE OR REPLACE FUNCTION can_user_scan_receipt(user_uuid uuid)
RETURNS TABLE(can_scan boolean, reason text, receipts_used integer, receipts_limit integer) AS $$
DECLARE
  user_info RECORD;
  total_receipt_scans integer;
BEGIN
  -- Get user subscription info
  SELECT * INTO user_info
  FROM get_user_subscription_info(user_uuid) 
  LIMIT 1;
  
  total_receipt_scans := user_info.receipts_used;
  
  -- Check if user can scan based on their plan and usage
  IF user_info.plan = 'premium' AND user_info.status = 'active' AND (user_info.current_period_end IS NULL OR user_info.current_period_end > now()) THEN
    -- Active premium user can scan unlimited
    RETURN QUERY SELECT true, 'Active premium subscription'::text, total_receipt_scans, user_info.receipts_limit;
  ELSIF total_receipt_scans >= 5 THEN
    -- Free user or expired premium user who has reached the 5 receipt limit
    RETURN QUERY SELECT false, 'Free trial limit of 5 receipts reached. Please upgrade to Premium to continue scanning.'::text, total_receipt_scans, user_info.receipts_limit;
  ELSE
    -- Free user under the limit
    RETURN QUERY SELECT true, format('Free trial: %s of 5 receipts remaining', 5 - total_receipt_scans)::text, total_receipt_scans, user_info.receipts_limit;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_user_subscription_info(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION can_user_scan_receipt(uuid) TO authenticated;

-- Add comments for documentation
COMMENT ON FUNCTION get_user_subscription_info(uuid) IS 'Retrieves user subscription information with proper receipt scan counting (multi-product receipts count as 1 scan)';
COMMENT ON FUNCTION can_user_scan_receipt(uuid) IS 'Checks if a user can scan more receipts with proper counting (multi-product receipts count as 1 scan)';
