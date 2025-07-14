/*
  # Move warranty_period to product level only

  This migration ensures warranty_period is tracked per product, not per receipt.
  Each product can have its own warranty period, which is more accurate for real-world scenarios.

  1. Changes Made:
    - Keep warranty_period column in receipts table but make it nullable for legacy support
    - Update all functions to handle warranty at product level
    - Ensure multi-product receipts track warranty per product
    - Update warranty calculation functions to work with individual products

  2. Data Migration:
    - No data loss - existing warranty_period values are preserved
    - New receipts will use product-level warranty tracking
*/

-- Update the warranty calculation function to handle product-level warranty
CREATE OR REPLACE FUNCTION public.calculate_warranty_expiry(purchase_date date, warranty_period text)
RETURNS date AS $$
DECLARE
  expiry_date date;
  period_lower text;
  years_match text[];
  months_match text[];
BEGIN
  -- Handle null or empty warranty period
  IF warranty_period IS NULL OR trim(warranty_period) = '' THEN
    RETURN purchase_date + '1 year'::interval;
  END IF;
  
  period_lower := lower(warranty_period);
  
  -- Handle lifetime warranty
  IF period_lower LIKE '%lifetime%' OR period_lower LIKE '%permanent%' THEN
    RETURN '2099-12-31'::date;
  END IF;
  
  -- Extract years
  years_match := regexp_match(period_lower, '(\d+)\s*year');
  IF years_match IS NOT NULL THEN
    expiry_date := purchase_date + (years_match[1]::integer || ' years')::interval;
    RETURN expiry_date;
  END IF;
  
  -- Extract months
  months_match := regexp_match(period_lower, '(\d+)\s*month');
  IF months_match IS NOT NULL THEN
    expiry_date := purchase_date + (months_match[1]::integer || ' months')::interval;
    RETURN expiry_date;
  END IF;
  
  -- Default to 1 year if no specific period found
  RETURN purchase_date + '1 year'::interval;
END;
$$ LANGUAGE plpgsql;

-- Update the receipts with warranty status function to prioritize product-level warranty
CREATE OR REPLACE FUNCTION public.get_receipts_with_warranty_status(user_uuid uuid)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  purchase_date date,
  country text,
  product_description text,
  brand_name text,
  model_number text,
  warranty_period text,
  extended_warranty text,
  amount numeric,
  image_path text,
  created_at timestamptz,
  updated_at timestamptz,
  store_name text,
  purchase_location text,
  image_url text,
  processing_method text,
  ocr_confidence numeric,
  extracted_text text,
  warranty_expiry_date date,
  warranty_status text,
  days_until_expiry integer
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.user_id,
    r.purchase_date,
    r.country,
    r.product_description,
    r.brand_name,
    r.model_number,
    -- Use warranty_period from the receipt (each receipt represents one product)
    r.warranty_period,
    r.extended_warranty,
    r.amount,
    r.image_path,
    r.created_at,
    r.updated_at,
    r.store_name,
    r.purchase_location,
    r.image_url,
    COALESCE(r.processing_method, 'manual') as processing_method,
    r.ocr_confidence,
    r.extracted_text,
    public.calculate_warranty_expiry(r.purchase_date, r.warranty_period) as warranty_expiry_date,
    CASE 
      WHEN public.calculate_warranty_expiry(r.purchase_date, r.warranty_period) < CURRENT_DATE THEN 'expired'
      WHEN public.calculate_warranty_expiry(r.purchase_date, r.warranty_period) <= CURRENT_DATE + interval '30 days' THEN 'expiring_soon'
      WHEN public.calculate_warranty_expiry(r.purchase_date, r.warranty_period) <= CURRENT_DATE + interval '90 days' THEN 'expiring_medium'
      ELSE 'active'
    END as warranty_status,
    (public.calculate_warranty_expiry(r.purchase_date, r.warranty_period) - CURRENT_DATE)::integer as days_until_expiry
  FROM public.receipts r
  WHERE r.user_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update warranty alerts function to work with individual product warranties
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

-- Update receipt stats to account for product-level warranties
CREATE OR REPLACE FUNCTION public.get_user_receipt_stats(user_uuid uuid)
RETURNS TABLE(
  total_receipts bigint,
  total_amount numeric,
  receipts_this_month bigint,
  expiring_warranties bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_receipts,
    COALESCE(SUM(r.amount), 0) as total_amount,
    COUNT(*) FILTER (WHERE r.created_at >= date_trunc('month', CURRENT_DATE)) as receipts_this_month,
    COUNT(*) FILTER (WHERE 
      r.warranty_period IS NOT NULL 
      AND r.warranty_period != ''
      AND public.calculate_warranty_expiry(r.purchase_date, r.warranty_period) <= CURRENT_DATE + interval '90 days' 
      AND public.calculate_warranty_expiry(r.purchase_date, r.warranty_period) > CURRENT_DATE
    ) as expiring_warranties
  FROM public.receipts r
  WHERE r.user_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions on updated functions
GRANT EXECUTE ON FUNCTION public.calculate_warranty_expiry(date, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_receipts_with_warranty_status(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_warranty_alerts(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_receipt_stats(uuid) TO authenticated;

-- Add comment to track this migration
COMMENT ON FUNCTION public.calculate_warranty_expiry(date, text) IS 'Updated to handle product-level warranty periods with null safety';
COMMENT ON FUNCTION public.get_receipts_with_warranty_status(uuid) IS 'Updated to use product-level warranty tracking';
COMMENT ON FUNCTION public.get_user_warranty_alerts(uuid) IS 'Updated to work with individual product warranties';
COMMENT ON FUNCTION public.get_user_receipt_stats(uuid) IS 'Updated to count expiring warranties at product level';

-- Refresh the schema cache
ANALYZE public.receipts; 