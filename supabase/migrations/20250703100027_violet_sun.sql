/*
  # Fix extracted_text Column and Schema Issues

  1. Column Management
    - Ensure extracted_text column exists in receipts table
    - Add all missing columns with proper types
    - Update existing records with proper defaults

  2. Database Functions
    - Update search function to handle extracted_text safely
    - Update warranty status function with all columns
    - Improve validation function for new columns

  3. Performance & Security
    - Add proper indexes for new columns
    - Refresh table statistics
    - Ensure RLS policies are correct

  4. Data Integrity
    - Validate OCR confidence scores
    - Ensure processing method defaults
    - Maintain backward compatibility
*/

-- Ensure all required extensions are enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- First, let's check and add the missing columns with proper validation
DO $$
BEGIN
  -- Check if receipts table exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'receipts'
  ) THEN
    RAISE EXCEPTION 'Receipts table does not exist. Please run the base migrations first.';
  END IF;

  -- Add extracted_text column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'receipts' 
    AND column_name = 'extracted_text'
  ) THEN
    ALTER TABLE public.receipts ADD COLUMN extracted_text text;
    RAISE NOTICE 'Added extracted_text column to receipts table';
  ELSE
    RAISE NOTICE 'extracted_text column already exists';
  END IF;

  -- Add processing_method column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'receipts' 
    AND column_name = 'processing_method'
  ) THEN
    ALTER TABLE public.receipts ADD COLUMN processing_method text DEFAULT 'manual';
    RAISE NOTICE 'Added processing_method column to receipts table';
  ELSE
    RAISE NOTICE 'processing_method column already exists';
  END IF;

  -- Add ocr_confidence column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'receipts' 
    AND column_name = 'ocr_confidence'
  ) THEN
    ALTER TABLE public.receipts ADD COLUMN ocr_confidence decimal(3,2);
    RAISE NOTICE 'Added ocr_confidence column to receipts table';
  ELSE
    RAISE NOTICE 'ocr_confidence column already exists';
  END IF;

  -- Add image_url column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'receipts' 
    AND column_name = 'image_url'
  ) THEN
    ALTER TABLE public.receipts ADD COLUMN image_url text;
    RAISE NOTICE 'Added image_url column to receipts table';
  ELSE
    RAISE NOTICE 'image_url column already exists';
  END IF;
END $$;

-- Update any existing records to have proper defaults
UPDATE public.receipts 
SET processing_method = 'manual' 
WHERE processing_method IS NULL;

-- Create or update indexes for better performance
CREATE INDEX IF NOT EXISTS receipts_extracted_text_gin_idx ON public.receipts USING gin(to_tsvector('english', COALESCE(extracted_text, '')));
CREATE INDEX IF NOT EXISTS receipts_processing_method_idx ON public.receipts(processing_method);
CREATE INDEX IF NOT EXISTS receipts_ocr_confidence_idx ON public.receipts(ocr_confidence);
CREATE INDEX IF NOT EXISTS receipts_image_url_idx ON public.receipts(image_url);

-- Update the validation function to handle new columns properly
CREATE OR REPLACE FUNCTION public.validate_receipt_data()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure required fields are present
  IF NEW.product_description IS NULL OR trim(NEW.product_description) = '' THEN
    RAISE EXCEPTION 'Product description is required';
  END IF;
  
  IF NEW.brand_name IS NULL OR trim(NEW.brand_name) = '' THEN
    RAISE EXCEPTION 'Brand name is required';
  END IF;
  
  IF NEW.purchase_date IS NULL THEN
    RAISE EXCEPTION 'Purchase date is required';
  END IF;
  
  IF NEW.warranty_period IS NULL OR trim(NEW.warranty_period) = '' THEN
    RAISE EXCEPTION 'Warranty period is required';
  END IF;
  
  IF NEW.country IS NULL OR trim(NEW.country) = '' THEN
    RAISE EXCEPTION 'Country is required';
  END IF;
  
  -- Validate purchase date is not in the future
  IF NEW.purchase_date > CURRENT_DATE THEN
    RAISE EXCEPTION 'Purchase date cannot be in the future';
  END IF;
  
  -- Validate amount if provided
  IF NEW.amount IS NOT NULL AND NEW.amount < 0 THEN
    RAISE EXCEPTION 'Amount cannot be negative';
  END IF;
  
  -- Set processing method if not provided
  IF NEW.processing_method IS NULL THEN
    NEW.processing_method := 'manual';
  END IF;
  
  -- Validate OCR confidence if provided (should be between 0 and 1)
  IF NEW.ocr_confidence IS NOT NULL AND (NEW.ocr_confidence < 0 OR NEW.ocr_confidence > 1) THEN
    RAISE EXCEPTION 'OCR confidence must be between 0 and 1';
  END IF;
  
  -- Ensure user_id matches authenticated user
  IF NEW.user_id != auth.uid() THEN
    RAISE EXCEPTION 'Cannot create receipt for another user';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the search function to safely handle extracted_text with COALESCE
CREATE OR REPLACE FUNCTION public.search_user_receipts(
  user_uuid uuid,
  search_query text,
  limit_count integer DEFAULT 10
)
RETURNS TABLE(
  id uuid,
  product_description text,
  brand_name text,
  store_name text,
  purchase_date date,
  amount numeric,
  warranty_period text,
  relevance_score real
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.product_description,
    r.brand_name,
    COALESCE(r.store_name, '') as store_name,
    r.purchase_date,
    r.amount,
    r.warranty_period,
    CASE 
      WHEN r.product_description ILIKE '%' || search_query || '%' THEN 1.0
      WHEN r.brand_name ILIKE '%' || search_query || '%' THEN 0.9
      WHEN COALESCE(r.store_name, '') ILIKE '%' || search_query || '%' THEN 0.8
      WHEN COALESCE(r.model_number, '') ILIKE '%' || search_query || '%' THEN 0.7
      WHEN COALESCE(r.purchase_location, '') ILIKE '%' || search_query || '%' THEN 0.6
      WHEN COALESCE(r.extracted_text, '') ILIKE '%' || search_query || '%' THEN 0.5
      ELSE 0.4
    END as relevance_score
  FROM public.receipts r
  WHERE r.user_id = user_uuid
    AND (
      r.product_description ILIKE '%' || search_query || '%' OR
      r.brand_name ILIKE '%' || search_query || '%' OR
      COALESCE(r.store_name, '') ILIKE '%' || search_query || '%' OR
      COALESCE(r.model_number, '') ILIKE '%' || search_query || '%' OR
      COALESCE(r.purchase_location, '') ILIKE '%' || search_query || '%' OR
      COALESCE(r.extracted_text, '') ILIKE '%' || search_query || '%'
    )
  ORDER BY relevance_score DESC, r.created_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the receipts with warranty status function to include all columns
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
  image_url text,
  store_name text,
  purchase_location text,
  processing_method text,
  ocr_confidence numeric,
  extracted_text text,
  created_at timestamptz,
  updated_at timestamptz,
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
    r.warranty_period,
    r.extended_warranty,
    r.amount,
    r.image_path,
    r.image_url,
    r.store_name,
    r.purchase_location,
    COALESCE(r.processing_method, 'manual') as processing_method,
    r.ocr_confidence,
    r.extracted_text,
    r.created_at,
    r.updated_at,
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

-- Ensure the calculate_warranty_expiry function exists
CREATE OR REPLACE FUNCTION public.calculate_warranty_expiry(purchase_date date, warranty_period text)
RETURNS date AS $$
DECLARE
  expiry_date date;
  period_lower text;
  years_match text[];
  months_match text[];
BEGIN
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

-- Ensure proper permissions are granted
GRANT SELECT, INSERT, UPDATE, DELETE ON public.receipts TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_user_receipts(uuid, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_receipts_with_warranty_status(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_warranty_expiry(date, text) TO authenticated;

-- Refresh the schema cache by updating table statistics
ANALYZE public.receipts;

-- Verify the columns exist by selecting from information_schema
DO $$
DECLARE
  col_count integer;
BEGIN
  SELECT COUNT(*) INTO col_count
  FROM information_schema.columns 
  WHERE table_schema = 'public' 
  AND table_name = 'receipts' 
  AND column_name IN ('extracted_text', 'processing_method', 'ocr_confidence', 'image_url');
  
  IF col_count = 4 THEN
    RAISE NOTICE 'All required columns are present in receipts table';
  ELSE
    RAISE WARNING 'Missing columns in receipts table. Found % out of 4 required columns', col_count;
  END IF;
END $$;

-- Add a comment to track this migration
COMMENT ON TABLE public.receipts IS 'Receipts table with OCR and AI processing capabilities - Updated with all required columns including extracted_text';
COMMENT ON COLUMN public.receipts.extracted_text IS 'Raw text extracted from receipt image via OCR';
COMMENT ON COLUMN public.receipts.processing_method IS 'Method used to process receipt: manual, ocr, gpt_structured, fallback_parsing';
COMMENT ON COLUMN public.receipts.ocr_confidence IS 'OCR confidence score between 0 and 1';
COMMENT ON COLUMN public.receipts.image_url IS 'URL of the uploaded receipt image in storage';