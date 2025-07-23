-- Add CRITICAL urgency level for warranty alerts expiring in 7 days or less
-- This ensures that items like the iPad Pro M4 (2 days remaining) get proper critical notifications

-- Update the warranty alerts function to include CRITICAL urgency level
CREATE OR REPLACE FUNCTION public.get_user_warranty_alerts(user_uuid uuid)
RETURNS TABLE(
  id uuid,
  product_description text,
  brand_name text,
  purchase_date date,
  warranty_expiry_date date,
  days_until_expiry integer,
  urgency text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.product_description,
    r.brand_name,
    r.purchase_date,
    public.calculate_warranty_expiry(r.purchase_date, r.warranty_period) as warranty_expiry_date,
    (public.calculate_warranty_expiry(r.purchase_date, r.warranty_period) - CURRENT_DATE)::integer as days_until_expiry,
    CASE 
      WHEN public.calculate_warranty_expiry(r.purchase_date, r.warranty_period) <= CURRENT_DATE + interval '7 days' THEN 'critical'
      WHEN public.calculate_warranty_expiry(r.purchase_date, r.warranty_period) <= CURRENT_DATE + interval '30 days' THEN 'high'
      WHEN public.calculate_warranty_expiry(r.purchase_date, r.warranty_period) <= CURRENT_DATE + interval '90 days' THEN 'medium'
      ELSE 'low'
    END as urgency
  FROM public.receipts r
  WHERE r.user_id = user_uuid
    AND r.warranty_period IS NOT NULL
    AND r.warranty_period != ''
    AND public.calculate_warranty_expiry(r.purchase_date, r.warranty_period) > CURRENT_DATE
    AND public.calculate_warranty_expiry(r.purchase_date, r.warranty_period) <= CURRENT_DATE + interval '180 days'
  ORDER BY public.calculate_warranty_expiry(r.purchase_date, r.warranty_period) ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the updated function
GRANT EXECUTE ON FUNCTION public.get_user_warranty_alerts(uuid) TO authenticated;

-- Add comment to track this update
COMMENT ON FUNCTION public.get_user_warranty_alerts(uuid) IS 'Updated to include CRITICAL urgency level for warranties expiring in 7 days or less';

-- Refresh the schema cache
ANALYZE public.receipts; 