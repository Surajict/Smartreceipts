-- Add RPC function to get all subscription codes for admin portal
-- This function bypasses RLS for admin access

CREATE OR REPLACE FUNCTION get_admin_subscription_codes()
RETURNS TABLE(
  id uuid,
  code text,
  status text,
  generated_at timestamptz,
  expires_at timestamptz,
  used_at timestamptz,
  used_by_user_id uuid,
  duration_months integer,
  notes text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sc.id,
    sc.code,
    sc.status::text,
    sc.generated_at,
    sc.expires_at,
    sc.used_at,
    sc.used_by_user_id,
    sc.duration_months,
    sc.notes
  FROM subscription_codes sc
  ORDER BY sc.generated_at DESC
  LIMIT 100; -- Limit to recent 100 codes for performance
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users (admin will be authenticated)
GRANT EXECUTE ON FUNCTION get_admin_subscription_codes() TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION get_admin_subscription_codes() IS 'Admin function to retrieve all subscription codes, bypassing RLS restrictions';
