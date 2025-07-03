/*
  # Complete Smart Receipts Database Setup

  1. Tables
    - receipts: Complete receipt data with OCR and AI processing
    - users: Extended user profiles
    - user_notification_settings: User notification preferences
    - user_privacy_settings: User privacy preferences

  2. Storage
    - receipt-images: Private bucket for receipt images
    - profile-pictures: Public bucket for profile pictures

  3. Functions
    - Receipt processing and validation
    - Warranty calculations
    - Search functionality
    - Statistics and analytics

  4. Security
    - Comprehensive RLS policies
    - Storage access controls
    - User data isolation
*/

-- Ensure all required extensions are enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create receipts table with all required columns
CREATE TABLE IF NOT EXISTS public.receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  purchase_date date NOT NULL,
  country text NOT NULL,
  product_description text NOT NULL,
  brand_name text NOT NULL,
  model_number text,
  warranty_period text NOT NULL,
  extended_warranty text,
  amount numeric(10,2),
  image_path text,
  image_url text,
  store_name text,
  purchase_location text,
  processing_method text DEFAULT 'manual',
  ocr_confidence numeric(3,2),
  extracted_text text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create users table for extended profiles
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text,
  avatar_url text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create user notification settings table
CREATE TABLE IF NOT EXISTS public.user_notification_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  warranty_alerts boolean DEFAULT true NOT NULL,
  auto_system_update boolean DEFAULT true NOT NULL,
  marketing_notifications boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create user privacy settings table
CREATE TABLE IF NOT EXISTS public.user_privacy_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  data_collection boolean DEFAULT true NOT NULL,
  data_analysis text DEFAULT 'allowed' CHECK (data_analysis IN ('allowed', 'not_allowed')) NOT NULL,
  biometric_login boolean DEFAULT false NOT NULL,
  two_factor_auth boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS on all tables
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_privacy_settings ENABLE ROW LEVEL SECURITY;

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  (
    'receipt-images',
    'receipt-images',
    false,
    10485760,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']
  ),
  (
    'profile-pictures',
    'profile-pictures',
    true,
    5242880,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  )
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Create comprehensive indexes
CREATE INDEX IF NOT EXISTS receipts_user_id_idx ON public.receipts(user_id);
CREATE INDEX IF NOT EXISTS receipts_purchase_date_idx ON public.receipts(purchase_date);
CREATE INDEX IF NOT EXISTS receipts_created_at_idx ON public.receipts(created_at);
CREATE INDEX IF NOT EXISTS receipts_brand_name_idx ON public.receipts(brand_name);
CREATE INDEX IF NOT EXISTS receipts_store_name_idx ON public.receipts(store_name);
CREATE INDEX IF NOT EXISTS receipts_amount_idx ON public.receipts(amount);
CREATE INDEX IF NOT EXISTS receipts_processing_method_idx ON public.receipts(processing_method);
CREATE INDEX IF NOT EXISTS receipts_ocr_confidence_idx ON public.receipts(ocr_confidence);
CREATE INDEX IF NOT EXISTS receipts_image_url_idx ON public.receipts(image_url);
CREATE INDEX IF NOT EXISTS receipts_location_search_idx ON public.receipts(store_name, purchase_location);
CREATE INDEX IF NOT EXISTS receipts_user_search_idx ON public.receipts(user_id, purchase_date DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS receipts_extracted_text_gin_idx ON public.receipts USING gin(to_tsvector('english', COALESCE(extracted_text, '')));

CREATE INDEX IF NOT EXISTS users_email_idx ON public.users(email);
CREATE INDEX IF NOT EXISTS user_notification_settings_user_id_idx ON public.user_notification_settings(user_id);
CREATE INDEX IF NOT EXISTS user_privacy_settings_user_id_idx ON public.user_privacy_settings(user_id);

-- Create or update the update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at columns
DROP TRIGGER IF EXISTS update_receipts_updated_at ON public.receipts;
CREATE TRIGGER update_receipts_updated_at
  BEFORE UPDATE ON public.receipts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_notification_settings_updated_at ON public.user_notification_settings;
CREATE TRIGGER update_user_notification_settings_updated_at
  BEFORE UPDATE ON public.user_notification_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_privacy_settings_updated_at ON public.user_privacy_settings;
CREATE TRIGGER update_user_privacy_settings_updated_at
  BEFORE UPDATE ON public.user_privacy_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to validate receipt data
CREATE OR REPLACE FUNCTION public.validate_receipt_data()
RETURNS TRIGGER AS $$
BEGIN
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
  
  IF NEW.purchase_date > CURRENT_DATE THEN
    RAISE EXCEPTION 'Purchase date cannot be in the future';
  END IF;
  
  IF NEW.amount IS NOT NULL AND NEW.amount < 0 THEN
    RAISE EXCEPTION 'Amount cannot be negative';
  END IF;
  
  IF NEW.processing_method IS NULL THEN
    NEW.processing_method := 'manual';
  END IF;
  
  IF NEW.ocr_confidence IS NOT NULL AND (NEW.ocr_confidence < 0 OR NEW.ocr_confidence > 1) THEN
    RAISE EXCEPTION 'OCR confidence must be between 0 and 1';
  END IF;
  
  IF NEW.user_id != auth.uid() THEN
    RAISE EXCEPTION 'Cannot create receipt for another user';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for receipt validation
DROP TRIGGER IF EXISTS validate_receipt_before_insert ON public.receipts;
CREATE TRIGGER validate_receipt_before_insert
  BEFORE INSERT ON public.receipts
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_receipt_data();

-- Function to calculate warranty expiry
CREATE OR REPLACE FUNCTION public.calculate_warranty_expiry(purchase_date date, warranty_period text)
RETURNS date AS $$
DECLARE
  expiry_date date;
  period_lower text;
  years_match text[];
  months_match text[];
BEGIN
  period_lower := lower(warranty_period);
  
  IF period_lower LIKE '%lifetime%' OR period_lower LIKE '%permanent%' THEN
    RETURN '2099-12-31'::date;
  END IF;
  
  years_match := regexp_match(period_lower, '(\d+)\s*year');
  IF years_match IS NOT NULL THEN
    expiry_date := purchase_date + (years_match[1]::integer || ' years')::interval;
    RETURN expiry_date;
  END IF;
  
  months_match := regexp_match(period_lower, '(\d+)\s*month');
  IF months_match IS NOT NULL THEN
    expiry_date := purchase_date + (months_match[1]::integer || ' months')::interval;
    RETURN expiry_date;
  END IF;
  
  RETURN purchase_date + '1 year'::interval;
END;
$$ LANGUAGE plpgsql;

-- Function to get user receipt statistics
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
    COUNT(*) FILTER (WHERE public.calculate_warranty_expiry(r.purchase_date, r.warranty_period) <= CURRENT_DATE + interval '90 days' 
                     AND public.calculate_warranty_expiry(r.purchase_date, r.warranty_period) > CURRENT_DATE) as expiring_warranties
  FROM public.receipts r
  WHERE r.user_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to search receipts
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

-- Function to get warranty alerts
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
    AND public.calculate_warranty_expiry(r.purchase_date, r.warranty_period) > CURRENT_DATE
    AND public.calculate_warranty_expiry(r.purchase_date, r.warranty_period) <= CURRENT_DATE + interval '180 days'
  ORDER BY public.calculate_warranty_expiry(r.purchase_date, r.warranty_period) ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get receipts with warranty status
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

-- Function to handle new user setup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = NEW.email,
    full_name = COALESCE(NEW.raw_user_meta_data->>'full_name', public.users.full_name),
    updated_at = now();
  
  INSERT INTO public.user_notification_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  
  INSERT INTO public.user_privacy_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to initialize user data for %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user setup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Drop existing policies to recreate them properly
DROP POLICY IF EXISTS "Users can view own receipts" ON public.receipts;
DROP POLICY IF EXISTS "Users can insert own receipts" ON public.receipts;
DROP POLICY IF EXISTS "Users can update own receipts" ON public.receipts;
DROP POLICY IF EXISTS "Users can delete own receipts" ON public.receipts;

DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Service role can manage users" ON public.users;

DROP POLICY IF EXISTS "Users can view own notification settings" ON public.user_notification_settings;
DROP POLICY IF EXISTS "Users can insert own notification settings" ON public.user_notification_settings;
DROP POLICY IF EXISTS "Users can update own notification settings" ON public.user_notification_settings;
DROP POLICY IF EXISTS "Service role can manage notification settings" ON public.user_notification_settings;

DROP POLICY IF EXISTS "Users can view own privacy settings" ON public.user_privacy_settings;
DROP POLICY IF EXISTS "Users can insert own privacy settings" ON public.user_privacy_settings;
DROP POLICY IF EXISTS "Users can update own privacy settings" ON public.user_privacy_settings;
DROP POLICY IF EXISTS "Service role can manage privacy settings" ON public.user_privacy_settings;

-- Storage policies
DROP POLICY IF EXISTS "Users can upload receipt files to own folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own receipt files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own receipt files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own receipt files" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own profile pictures" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view profile pictures" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own profile pictures" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own profile pictures" ON storage.objects;

-- Create RLS policies for receipts
CREATE POLICY "Users can view own receipts"
  ON public.receipts FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own receipts"
  ON public.receipts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own receipts"
  ON public.receipts FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own receipts"
  ON public.receipts FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Create RLS policies for users
CREATE POLICY "Users can view own profile"
  ON public.users FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.users FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY "Service role can manage users"
  ON public.users FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Create RLS policies for notification settings
CREATE POLICY "Users can view own notification settings"
  ON public.user_notification_settings FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notification settings"
  ON public.user_notification_settings FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notification settings"
  ON public.user_notification_settings FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage notification settings"
  ON public.user_notification_settings FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Create RLS policies for privacy settings
CREATE POLICY "Users can view own privacy settings"
  ON public.user_privacy_settings FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own privacy settings"
  ON public.user_privacy_settings FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own privacy settings"
  ON public.user_privacy_settings FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage privacy settings"
  ON public.user_privacy_settings FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Create storage policies for receipt images
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

-- Create storage policies for profile pictures
CREATE POLICY "Users can upload own profile pictures"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'profile-pictures' AND
  auth.uid()::text = (string_to_array(name, '/'))[1]
);

CREATE POLICY "Anyone can view profile pictures"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'profile-pictures');

CREATE POLICY "Users can update own profile pictures"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'profile-pictures' AND
  auth.uid()::text = (string_to_array(name, '/'))[1]
)
WITH CHECK (
  bucket_id = 'profile-pictures' AND
  auth.uid()::text = (string_to_array(name, '/'))[1]
);

CREATE POLICY "Users can delete own profile pictures"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'profile-pictures' AND
  auth.uid()::text = (string_to_array(name, '/'))[1]
);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated, anon, service_role;
GRANT ALL ON public.users TO service_role;
GRANT ALL ON public.user_notification_settings TO service_role;
GRANT ALL ON public.user_privacy_settings TO service_role;
GRANT ALL ON public.receipts TO service_role;

GRANT SELECT, INSERT, UPDATE ON public.users TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.user_notification_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.user_privacy_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.receipts TO authenticated;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION public.get_user_receipt_stats(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_user_receipts(uuid, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_warranty_alerts(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_receipts_with_warranty_status(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_warranty_expiry(date, text) TO authenticated;

-- Initialize profiles and settings for existing users
INSERT INTO public.users (id, email, full_name)
SELECT 
  au.id, 
  COALESCE(au.email, ''), 
  COALESCE(au.raw_user_meta_data->>'full_name', '')
FROM auth.users au
WHERE au.id NOT IN (SELECT id FROM public.users)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  updated_at = now();

INSERT INTO public.user_notification_settings (user_id, warranty_alerts, auto_system_update, marketing_notifications)
SELECT id, true, true, false
FROM auth.users 
WHERE id NOT IN (SELECT user_id FROM public.user_notification_settings)
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO public.user_privacy_settings (user_id, data_collection, data_analysis, biometric_login, two_factor_auth)
SELECT id, true, 'allowed', false, false
FROM auth.users 
WHERE id NOT IN (SELECT user_id FROM public.user_privacy_settings)
ON CONFLICT (user_id) DO NOTHING;

-- Refresh statistics
ANALYZE public.receipts;
ANALYZE public.users;
ANALYZE public.user_notification_settings;
ANALYZE public.user_privacy_settings;