-- Create subscription code system for Smart Receipts
-- This allows admins to generate 16-digit codes that give users premium access

-- 1. Admin settings table to control system behavior
CREATE TABLE IF NOT EXISTS admin_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text UNIQUE NOT NULL,
  setting_value jsonb NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS on admin_settings (only accessible by admin)
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

-- Create policy for admin_settings (service role only for now)
CREATE POLICY "Admin settings accessible by service role only"
  ON admin_settings FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Insert default settings
INSERT INTO admin_settings (setting_key, setting_value) VALUES 
  ('subscription_system', '"code_based"'::jsonb),
  ('admin_credentials', '{"username": "smartreceiptsau@gmail.com", "password": "greatAppple651"}'::jsonb)
ON CONFLICT (setting_key) DO NOTHING;

-- 2. Subscription codes table
CREATE TABLE IF NOT EXISTS subscription_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  status text DEFAULT 'generated' CHECK (status IN ('generated', 'used', 'expired')) NOT NULL,
  generated_at timestamptz DEFAULT now() NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  used_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  duration_months integer DEFAULT 1 NOT NULL,
  created_by_admin boolean DEFAULT true,
  notes text
);

-- Enable RLS on subscription_codes
ALTER TABLE subscription_codes ENABLE ROW LEVEL SECURITY;

-- Create policies for subscription_codes
CREATE POLICY "Subscription codes readable by service role"
  ON subscription_codes FOR SELECT
  TO service_role
  USING (true);

CREATE POLICY "Subscription codes manageable by service role"
  ON subscription_codes FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS subscription_codes_code_idx ON subscription_codes (code);
CREATE INDEX IF NOT EXISTS subscription_codes_status_idx ON subscription_codes (status);
CREATE INDEX IF NOT EXISTS subscription_codes_expires_at_idx ON subscription_codes (expires_at);
CREATE INDEX IF NOT EXISTS subscription_codes_used_by_user_id_idx ON subscription_codes (used_by_user_id);

-- 3. Function to generate unique 16-digit codes
CREATE OR REPLACE FUNCTION generate_subscription_code()
RETURNS text AS $$
DECLARE
  code_chars text := '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  result text := '';
  i integer;
  char_index integer;
  code_exists boolean;
BEGIN
  -- Keep generating until we get a unique code
  LOOP
    result := '';
    
    -- Generate 16 character code
    FOR i IN 1..16 LOOP
      char_index := floor(random() * length(code_chars) + 1);
      result := result || substr(code_chars, char_index, 1);
    END LOOP;
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM subscription_codes WHERE code = result) INTO code_exists;
    
    -- Exit loop if code is unique
    IF NOT code_exists THEN
      EXIT;
    END IF;
  END LOOP;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 4. Function to create a new subscription code
CREATE OR REPLACE FUNCTION create_subscription_code(duration_months integer DEFAULT 1, notes text DEFAULT NULL)
RETURNS jsonb AS $$
DECLARE
  new_code text;
  code_record subscription_codes%ROWTYPE;
BEGIN
  -- Generate unique code
  new_code := generate_subscription_code();
  
  -- Insert the new code
  INSERT INTO subscription_codes (
    code, 
    expires_at, 
    duration_months, 
    notes
  ) VALUES (
    new_code,
    now() + (duration_months || ' months')::interval,
    duration_months,
    notes
  ) RETURNING * INTO code_record;
  
  -- Return the created code info
  RETURN jsonb_build_object(
    'success', true,
    'code', code_record.code,
    'id', code_record.id,
    'expires_at', code_record.expires_at,
    'duration_months', code_record.duration_months
  );
END;
$$ LANGUAGE plpgsql;

-- 5. Function to redeem a subscription code
CREATE OR REPLACE FUNCTION redeem_subscription_code(
  code_to_redeem text,
  user_id uuid
)
RETURNS jsonb AS $$
DECLARE
  code_record subscription_codes%ROWTYPE;
  subscription_end_date timestamptz;
BEGIN
  -- Find the code
  SELECT * INTO code_record 
  FROM subscription_codes 
  WHERE code = code_to_redeem;
  
  -- Check if code exists
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid subscription code'
    );
  END IF;
  
  -- Check if code is already used
  IF code_record.status = 'used' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'This subscription code has already been used'
    );
  END IF;
  
  -- Check if code is expired
  IF code_record.expires_at < now() OR code_record.status = 'expired' THEN
    -- Mark as expired if not already
    UPDATE subscription_codes 
    SET status = 'expired' 
    WHERE id = code_record.id;
    
    RETURN jsonb_build_object(
      'success', false,
      'error', 'This subscription code has expired'
    );
  END IF;
  
  -- Calculate subscription end date
  subscription_end_date := now() + (code_record.duration_months || ' months')::interval;
  
  -- Mark code as used
  UPDATE subscription_codes 
  SET 
    status = 'used',
    used_at = now(),
    used_by_user_id = user_id
  WHERE id = code_record.id;
  
  -- Update or create user subscription
  INSERT INTO user_subscriptions (
    user_id,
    plan,
    status,
    current_period_end,
    subscription_type
  ) VALUES (
    user_id,
    'premium',
    'active',
    subscription_end_date,
    'code_based'
  )
  ON CONFLICT (user_id) DO UPDATE SET
    plan = 'premium',
    status = 'active',
    current_period_end = subscription_end_date,
    subscription_type = 'code_based',
    updated_at = now();
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Subscription code redeemed successfully!',
    'premium_until', subscription_end_date
  );
END;
$$ LANGUAGE plpgsql;

-- 6. Function to get admin dashboard stats
CREATE OR REPLACE FUNCTION get_admin_subscription_stats()
RETURNS jsonb AS $$
DECLARE
  total_codes integer;
  used_codes integer;
  expired_codes integer;
  active_codes integer;
BEGIN
  -- Count codes by status
  SELECT COUNT(*) INTO total_codes FROM subscription_codes;
  SELECT COUNT(*) INTO used_codes FROM subscription_codes WHERE status = 'used';
  SELECT COUNT(*) INTO expired_codes FROM subscription_codes WHERE status = 'expired';
  SELECT COUNT(*) INTO active_codes FROM subscription_codes WHERE status = 'generated' AND expires_at > now();
  
  RETURN jsonb_build_object(
    'total_codes', total_codes,
    'used_codes', used_codes,
    'expired_codes', expired_codes,
    'active_codes', active_codes
  );
END;
$$ LANGUAGE plpgsql;

-- 7. Add subscription_type column to user_subscriptions if it doesn't exist
DO $$ BEGIN
  BEGIN
    ALTER TABLE user_subscriptions ADD COLUMN subscription_type text DEFAULT 'stripe' CHECK (subscription_type IN ('stripe', 'code_based'));
  EXCEPTION
    WHEN duplicate_column THEN
      -- Column already exists, do nothing
      NULL;
  END;
END $$;

-- 8. Create trigger to automatically expire old codes
CREATE OR REPLACE FUNCTION expire_old_subscription_codes()
RETURNS void AS $$
BEGIN
  UPDATE subscription_codes 
  SET status = 'expired' 
  WHERE status = 'generated' 
    AND expires_at < now();
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to run this function (we'll also run it via cron or manually)
-- For now, we'll rely on checking during redemption 