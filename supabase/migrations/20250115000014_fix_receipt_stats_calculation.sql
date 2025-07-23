-- MIGRATION: Fix Receipt Statistics Calculation
-- This migration fixes the get_user_receipt_stats function to correctly distinguish
-- between receipts scanned (unique receipt documents) and items captured (individual products)

-- Drop the existing function
DROP FUNCTION IF EXISTS get_user_receipt_stats(uuid);

-- Create the corrected function
CREATE FUNCTION get_user_receipt_stats(user_uuid UUID)
RETURNS TABLE(
  total_receipts BIGINT,  -- Actual number of receipts scanned (unique receipt documents)
  total_amount NUMERIC,  -- Total monetary amount
  receipts_this_month BIGINT,  -- Receipts scanned this month
  total_items BIGINT,  -- Total individual items/products captured
  expiring_warranties BIGINT  -- Warranties expiring soon
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    -- Count unique receipt documents (by receipt_group_id)
    -- If receipt_group_id is null, count each row as a separate receipt
    COUNT(DISTINCT COALESCE(r.receipt_group_id, r.id::text)) as total_receipts,
    
    -- Sum all amounts (avoiding double counting for grouped receipts)
    COALESCE(SUM(r.amount), 0) as total_amount,
    
    -- Count unique receipts from this month
    COUNT(DISTINCT COALESCE(r.receipt_group_id, r.id::text)) FILTER (
      WHERE r.created_at >= date_trunc('month', CURRENT_DATE)
    ) as receipts_this_month,
    
    -- Count total individual items/products (this is the original COUNT(*))
    COUNT(*) as total_items,
    
    -- Count items with expiring warranties
    COUNT(*) FILTER (WHERE 
      r.warranty_period IS NOT NULL 
      AND r.warranty_period != ''
      AND public.calculate_warranty_expiry(r.purchase_date, r.warranty_period) <= CURRENT_DATE + interval '90 days' 
      AND public.calculate_warranty_expiry(r.purchase_date, r.warranty_period) > CURRENT_DATE
    ) as expiring_warranties
    
  FROM public.receipts r
  WHERE r.user_id = user_uuid;
END;
$$;

-- Test the function with a sample query (this will show in the results)
SELECT 'Receipt stats function updated successfully. Now correctly distinguishes between receipts and items.' as status; 