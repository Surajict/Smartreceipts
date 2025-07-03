/*
  # Complete Receipt Management System with Enhanced Features

  1. Database Schema Updates
    - Add missing columns to receipts table (image_url, processing_method, ocr_confidence, extracted_text)
    - Create proper storage bucket for receipt images
    - Set up comprehensive RLS policies

  2. Storage Configuration
    - Create receipt-images bucket with proper security
    - Configure file size limits and allowed MIME types
    - Set up user-specific folder structure

  3. Enhanced Functions
    - Receipt validation function
    - Warranty calculation function
    - User statistics function
    - Smart search function
    - Warranty alerts function

  4. Performance Optimizations
    - Create indexes for common query patterns
    - Optimize search functionality
    - Add composite indexes for better performance

  5. User Management
    - Ensure users table exists with proper structure
    - Set up automatic user profile creation
    - Initialize user settings on signup
*/

-- Ensure receipts table has all required columns with proper types
DO $$
BEGIN
  -- Add missing columns if they don't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'receipts' AND column_name = 'image_url'
  ) THEN
    ALTER TABLE receipts ADD COLUMN image_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'receipts' AND column_name = 'processing_method'
  ) THEN
    ALTER TABLE receipts ADD COLUMN processing_method text DEFAULT 'manual';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'receipts' AND column_name = 'ocr_confidence'
  ) THEN
    ALTER TABLE receipts ADD COLUMN ocr_confidence decimal(3,2);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'receipts' AND column_name = 'extracted_text'
  ) THEN
    ALTER TABLE receipts ADD COLUMN extracted_text text;
  END IF;
END $$;

-- Create receipt-images storage bucket with proper configuration
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'receipt-images',
  'receipt-images',
  false, -- Private bucket for security
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'];

-- Drop existing storage policies to recreate them
DROP POLICY IF EXISTS "Users can upload receipt files to own folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own receipt files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own receipt files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own receipt files" ON storage.objects;

-- Create comprehensive storage policies for receipt-images
CREATE POLICY "Users can upload receipt files to own folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'receipt-images' AND
  auth.uid()::text = (string_to_array(name, '/'))[1]
);

CREATE POLICY "Users can view own receipt files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'receipt-images' AND
  auth.uid()::text = (string_to_array(name, '/'))[1]
);

CREATE POLICY "Users can update own receipt files"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'receipt-images' AND
  auth.uid()::text = (string_to_array(name, '/'))[1]
)
WITH CHECK (
  bucket_id = 'receipt-images' AND
  auth.uid()::text = (string_to_array(name, '/'))[1]
);

CREATE POLICY "Users can delete own receipt files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'receipt-images' AND
  auth.uid()::text = (string_to_array(name, '/'))[1]
);

-- Ensure receipts table has proper RLS policies
DROP POLICY IF EXISTS "Users can view own receipts" ON receipts;
DROP POLICY IF EXISTS "Users can insert own receipts" ON receipts;
DROP POLICY IF EXISTS "Users can update own receipts" ON receipts;
DROP POLICY IF EXISTS "Users can delete own receipts" ON receipts;

-- Create comprehensive RLS policies for receipts
CREATE POLICY "Users can view own receipts"
  ON receipts
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own receipts"
  ON receipts
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own receipts"
  ON receipts
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own receipts"
  ON receipts
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create additional indexes for better performance
CREATE INDEX IF NOT EXISTS receipts_user_id_idx ON receipts(user_id);
CREATE INDEX IF NOT EXISTS receipts_purchase_date_idx ON receipts(purchase_date);
CREATE INDEX IF NOT EXISTS receipts_created_at_idx ON receipts(created_at);
CREATE INDEX IF NOT EXISTS receipts_brand_name_idx ON receipts(brand_name);
CREATE INDEX IF NOT EXISTS receipts_store_name_idx ON receipts(store_name);
CREATE INDEX IF NOT EXISTS receipts_amount_idx ON receipts(amount);
CREATE INDEX IF NOT EXISTS receipts_processing_method_idx ON receipts(processing_method);

-- Create a composite index for common search patterns
CREATE INDEX IF NOT EXISTS receipts_user_search_idx ON receipts(user_id, purchase_date DESC, created_at DESC);

-- Function to validate receipt data before insertion
CREATE OR REPLACE FUNCTION validate_receipt_data()
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
  
  -- Ensure user_id matches authenticated user
  IF NEW.user_id != auth.uid() THEN
    RAISE EXCEPTION 'Cannot create receipt for another user';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for receipt validation
DROP TRIGGER IF EXISTS validate_receipt_before_insert ON receipts;
CREATE TRIGGER validate_receipt_before_insert
  BEFORE INSERT ON receipts
  FOR EACH ROW
  EXECUTE FUNCTION validate_receipt_data();

-- Function to calculate warranty expiry date
CREATE OR REPLACE FUNCTION calculate_warranty_expiry(purchase_date date, warranty_period text)
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

-- Function to get receipt statistics for a user
CREATE OR REPLACE FUNCTION get_user_receipt_stats(user_uuid uuid)
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
    COUNT(*) FILTER (WHERE calculate_warranty_expiry(r.purchase_date, r.warranty_period) <= CURRENT_DATE + interval '90 days' 
                     AND calculate_warranty_expiry(r.purchase_date, r.warranty_period) > CURRENT_DATE) as expiring_warranties
  FROM receipts r
  WHERE r.user_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION get_user_receipt_stats(uuid) TO authenticated;

-- Create function to search receipts with text similarity
CREATE OR REPLACE FUNCTION search_user_receipts(
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
    r.store_name,
    r.purchase_date,
    r.amount,
    r.warranty_period,
    CASE 
      WHEN r.product_description ILIKE '%' || search_query || '%' THEN 1.0
      WHEN r.brand_name ILIKE '%' || search_query || '%' THEN 0.9
      WHEN r.store_name ILIKE '%' || search_query || '%' THEN 0.8
      WHEN r.model_number ILIKE '%' || search_query || '%' THEN 0.7
      WHEN r.purchase_location ILIKE '%' || search_query || '%' THEN 0.6
      ELSE 0.5
    END as relevance_score
  FROM receipts r
  WHERE r.user_id = user_uuid
    AND (
      r.product_description ILIKE '%' || search_query || '%' OR
      r.brand_name ILIKE '%' || search_query || '%' OR
      r.store_name ILIKE '%' || search_query || '%' OR
      r.model_number ILIKE '%' || search_query || '%' OR
      r.purchase_location ILIKE '%' || search_query || '%' OR
      r.extracted_text ILIKE '%' || search_query || '%'
    )
  ORDER BY relevance_score DESC, r.created_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the search function
GRANT EXECUTE ON FUNCTION search_user_receipts(uuid, text, integer) TO authenticated;

-- Create function to get warranty alerts for a user
CREATE OR REPLACE FUNCTION get_user_warranty_alerts(user_uuid uuid)
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
    calculate_warranty_expiry(r.purchase_date, r.warranty_period) as warranty_expiry_date,
    (calculate_warranty_expiry(r.purchase_date, r.warranty_period) - CURRENT_DATE)::integer as days_until_expiry,
    CASE 
      WHEN calculate_warranty_expiry(r.purchase_date, r.warranty_period) <= CURRENT_DATE + interval '30 days' THEN 'high'
      WHEN calculate_warranty_expiry(r.purchase_date, r.warranty_period) <= CURRENT_DATE + interval '90 days' THEN 'medium'
      ELSE 'low'
    END as urgency
  FROM receipts r
  WHERE r.user_id = user_uuid
    AND calculate_warranty_expiry(r.purchase_date, r.warranty_period) > CURRENT_DATE
    AND calculate_warranty_expiry(r.purchase_date, r.warranty_period) <= CURRENT_DATE + interval '180 days'
  ORDER BY calculate_warranty_expiry(r.purchase_date, r.warranty_period) ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the warranty alerts function
GRANT EXECUTE ON FUNCTION get_user_warranty_alerts(uuid) TO authenticated;

-- Function to get receipts with warranty status (replaces the problematic view)
CREATE OR REPLACE FUNCTION get_receipts_with_warranty_status(user_uuid uuid)
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
    r.processing_method,
    r.ocr_confidence,
    r.extracted_text,
    r.created_at,
    r.updated_at,
    calculate_warranty_expiry(r.purchase_date, r.warranty_period) as warranty_expiry_date,
    CASE 
      WHEN calculate_warranty_expiry(r.purchase_date, r.warranty_period) < CURRENT_DATE THEN 'expired'
      WHEN calculate_warranty_expiry(r.purchase_date, r.warranty_period) <= CURRENT_DATE + interval '30 days' THEN 'expiring_soon'
      WHEN calculate_warranty_expiry(r.purchase_date, r.warranty_period) <= CURRENT_DATE + interval '90 days' THEN 'expiring_medium'
      ELSE 'active'
    END as warranty_status,
    (calculate_warranty_expiry(r.purchase_date, r.warranty_period) - CURRENT_DATE)::integer as days_until_expiry
  FROM receipts r
  WHERE r.user_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the warranty status function
GRANT EXECUTE ON FUNCTION get_receipts_with_warranty_status(uuid) TO authenticated;

-- Create users table if it doesn't exist (for profile management)
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text,
  avatar_url text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policies for users table
DO $$
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Users can view own profile" ON users;
  DROP POLICY IF EXISTS "Users can insert own profile" ON users;
  DROP POLICY IF EXISTS "Users can update own profile" ON users;
  DROP POLICY IF EXISTS "Service role can manage users" ON users;

  -- Create new policies
  CREATE POLICY "Users can view own profile"
    ON users
    FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

  CREATE POLICY "Users can insert own profile"
    ON users
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);

  CREATE POLICY "Users can update own profile"
    ON users
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

  -- Service role can manage users
  CREATE POLICY "Service role can manage users"
    ON users
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
END $$;

-- Create trigger for users updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for users table
CREATE INDEX IF NOT EXISTS users_email_idx ON users(email);

-- Function to handle new user setup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create user profile
  INSERT INTO users (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = NEW.email,
    full_name = COALESCE(NEW.raw_user_meta_data->>'full_name', users.full_name),
    updated_at = now();
  
  -- Initialize notification settings
  INSERT INTO user_notification_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Initialize privacy settings
  INSERT INTO user_privacy_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the user creation
    RAISE WARNING 'Failed to initialize user data for %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user setup
DROP TRIGGER IF EXISTS on_auth_user_created_setup ON auth.users;
CREATE TRIGGER on_auth_user_created_setup
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Initialize profiles for existing users who don't have them
INSERT INTO users (id, email, full_name)
SELECT 
  au.id, 
  COALESCE(au.email, ''), 
  COALESCE(au.raw_user_meta_data->>'full_name', '')
FROM auth.users au
WHERE au.id NOT IN (SELECT id FROM users)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  updated_at = now();