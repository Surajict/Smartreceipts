-- MIGRATION: Fix Subscription Code Generation
-- This migration fixes the subscription code generation function to create proper 16-digit codes
-- instead of decimal numbers

-- Drop existing functions first (to handle return type changes)
DROP FUNCTION IF EXISTS create_subscription_code(integer, text);
DROP FUNCTION IF EXISTS create_subscription_code(integer);
DROP FUNCTION IF EXISTS create_subscription_code();

-- Create the fixed function that generates proper 16-digit codes
CREATE FUNCTION create_subscription_code(
  duration_months INTEGER DEFAULT 1,
  notes TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_code TEXT;
  code_id UUID;
  result JSON;
  random_number BIGINT;
BEGIN
  -- Generate unique 16-digit code (proper integer approach)
  LOOP
    -- Generate a random number between 1000000000000000 and 9999999999999999 (16 digits)
    random_number := 1000000000000000 + FLOOR(RANDOM() * 9000000000000000)::BIGINT;
    new_code := random_number::TEXT;
    
    -- Ensure it's exactly 16 digits
    IF LENGTH(new_code) = 16 THEN
      -- Check if code already exists
      IF NOT EXISTS (SELECT 1 FROM subscription_codes WHERE code = new_code) THEN
        EXIT;
      END IF;
    END IF;
  END LOOP;
  
  -- Insert the new code
  INSERT INTO subscription_codes (
    code,
    status,
    generated_at,
    expires_at,
    duration_months,
    notes
  ) VALUES (
    new_code,
    'generated',
    NOW(),
    NOW() + (duration_months || ' months')::INTERVAL,
    duration_months,
    notes
  ) RETURNING id INTO code_id;
  
  -- Return success response
  result := json_build_object(
    'success', true,
    'code', new_code,
    'id', code_id,
    'expires_at', (NOW() + (duration_months || ' months')::INTERVAL)::TEXT
  );
  
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    -- Return error response
    result := json_build_object(
      'success', false,
      'error', SQLERRM
    );
    RETURN result;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION create_subscription_code TO authenticated; 