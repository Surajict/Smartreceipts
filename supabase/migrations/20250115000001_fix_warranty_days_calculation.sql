-- Fix warranty calculation to properly handle days pattern
-- This fixes the issue where "90 days" or "30 days" was defaulting to 1 year

CREATE OR REPLACE FUNCTION public.calculate_warranty_expiry(purchase_date date, warranty_period text)
RETURNS date AS $$
DECLARE
  expiry_date date;
  period_lower text;
  years_match text[];
  months_match text[];
  days_match text[];
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
  
  -- Extract days (THIS WAS MISSING!)
  days_match := regexp_match(period_lower, '(\d+)\s*day');
  IF days_match IS NOT NULL THEN
    expiry_date := purchase_date + (days_match[1]::integer || ' days')::interval;
    RETURN expiry_date;
  END IF;
  
  -- Default to 1 year if no specific period found
  RETURN purchase_date + '1 year'::interval;
END;
$$ LANGUAGE plpgsql;

-- Test the fixed function
SELECT 
  '2025-07-15'::date as purchase_date,
  warranty_period,
  public.calculate_warranty_expiry('2025-07-15'::date, warranty_period) as expiry_date,
  (public.calculate_warranty_expiry('2025-07-15'::date, warranty_period) - CURRENT_DATE)::integer as days_from_today
FROM (VALUES 
  ('90 days'),
  ('30 days'), 
  ('1 year'),
  ('6 months'),
  ('2 years')
) AS test_periods(warranty_period);

-- Add comment to track this fix
COMMENT ON FUNCTION public.calculate_warranty_expiry(date, text) IS 'Fixed to properly handle days pattern in warranty periods (e.g., "90 days", "30 days")'; 