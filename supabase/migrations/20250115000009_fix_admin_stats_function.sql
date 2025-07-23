-- MIGRATION: Fix Admin Statistics Function
-- This migration ensures the get_admin_subscription_stats function works properly
-- with SECURITY DEFINER privileges

-- Drop existing function
DROP FUNCTION IF EXISTS get_admin_subscription_stats();

-- Create the admin stats function with SECURITY DEFINER
CREATE FUNCTION get_admin_subscription_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER  -- This runs with the privileges of the function owner
SET search_path = public
AS $$
DECLARE
  total_codes INTEGER;
  used_codes INTEGER;
  expired_codes INTEGER;
  active_codes INTEGER;
  result JSON;
BEGIN
  -- Get statistics
  SELECT COUNT(*) INTO total_codes FROM subscription_codes;
  SELECT COUNT(*) INTO used_codes FROM subscription_codes WHERE status = 'used';
  SELECT COUNT(*) INTO expired_codes FROM subscription_codes WHERE status = 'expired' OR expires_at < NOW();
  SELECT COUNT(*) INTO active_codes FROM subscription_codes WHERE status = 'generated' AND expires_at > NOW();
  
  -- Build result
  result := json_build_object(
    'total_codes', total_codes,
    'used_codes', used_codes, 
    'expired_codes', expired_codes,
    'active_codes', active_codes
  );
  
  RETURN result;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_admin_subscription_stats TO authenticated; 