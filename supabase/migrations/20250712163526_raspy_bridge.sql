/*
  # Fix Database Schema and Add Currency Management
  
  1. Database Schema Fixes
    - Remove ocr_engine column reference (doesn't exist)
    - Add currency-related columns to receipts table
    - Add user currency preferences
  
  2. Currency Management
    - Add currency preference to user settings
    - Add original and converted currency tracking
    - Add exchange rate tracking
*/

-- Add missing columns to receipts table
ALTER TABLE receipts 
ADD COLUMN IF NOT EXISTS original_currency text DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS converted_amount numeric(10,2),
ADD COLUMN IF NOT EXISTS converted_currency text,
ADD COLUMN IF NOT EXISTS exchange_rate numeric(10,6),
ADD COLUMN IF NOT EXISTS conversion_date date;

-- Add currency preference to user settings
ALTER TABLE user_privacy_settings 
ADD COLUMN IF NOT EXISTS preferred_currency text DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS display_currency_mode text DEFAULT 'native' CHECK (display_currency_mode IN ('native', 'usd', 'both'));

-- Add native country to users table if not exists
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS native_country text;

-- Create index for currency queries
CREATE INDEX IF NOT EXISTS receipts_currency_idx ON receipts (original_currency, converted_currency);

-- Update RLS policies to include new columns
-- (Existing policies will automatically cover new columns)

-- Add helpful comments
COMMENT ON COLUMN receipts.original_currency IS 'Original currency from the receipt (e.g., USD, AED, GBP)';
COMMENT ON COLUMN receipts.converted_amount IS 'Amount converted to user preferred currency';
COMMENT ON COLUMN receipts.converted_currency IS 'User preferred currency for conversion';
COMMENT ON COLUMN receipts.exchange_rate IS 'Exchange rate used for conversion';
COMMENT ON COLUMN receipts.conversion_date IS 'Date when currency conversion was performed';

COMMENT ON COLUMN user_privacy_settings.preferred_currency IS 'User preferred currency for dashboard display';
COMMENT ON COLUMN user_privacy_settings.display_currency_mode IS 'How to display currency: native, usd, or both';