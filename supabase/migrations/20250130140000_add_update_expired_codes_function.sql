-- Add RPC function to update expired subscription codes
-- This function finds codes that are past their expiration date and updates their status

CREATE OR REPLACE FUNCTION update_expired_subscription_codes()
RETURNS TABLE(updated_count integer) AS $$
DECLARE
  updated_rows integer;
BEGIN
  -- Update subscription codes that have expired (past their expires_at date)
  -- but still have status 'generated'
  UPDATE subscription_codes 
  SET 
    status = 'expired',
    updated_at = now()
  WHERE 
    status = 'generated' 
    AND expires_at < now();
  
  -- Get the number of rows that were updated
  GET DIAGNOSTICS updated_rows = ROW_COUNT;
  
  -- Return the count
  RETURN QUERY SELECT updated_rows;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users (admin will be authenticated)
GRANT EXECUTE ON FUNCTION update_expired_subscription_codes() TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION update_expired_subscription_codes() IS 'Admin function to update expired subscription codes status in the database';
