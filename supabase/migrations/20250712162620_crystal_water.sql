/*
  # Add Native Country and Currency Support

  1. New Columns
    - Add `native_country` to users table
    - Add `currency` and `original_currency` to receipts table
    - Add `converted_amount` and `original_amount` to receipts table

  2. Updates
    - Update existing users table structure
    - Update receipts table for multi-currency support
    
  3. Security
    - Maintain existing RLS policies
*/

-- Add native_country to users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'native_country'
  ) THEN
    ALTER TABLE users ADD COLUMN native_country text;
  END IF;
END $$;

-- Add currency support to receipts table
DO $$
BEGIN
  -- Add currency column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'receipts' AND column_name = 'currency'
  ) THEN
    ALTER TABLE receipts ADD COLUMN currency text DEFAULT 'USD';
  END IF;
  
  -- Add original_currency column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'receipts' AND column_name = 'original_currency'
  ) THEN
    ALTER TABLE receipts ADD COLUMN original_currency text;
  END IF;
  
  -- Add converted_amount column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'receipts' AND column_name = 'converted_amount'
  ) THEN
    ALTER TABLE receipts ADD COLUMN converted_amount numeric(10,2);
  END IF;
  
  -- Add original_amount column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'receipts' AND column_name = 'original_amount'
  ) THEN
    ALTER TABLE receipts ADD COLUMN original_amount numeric(10,2);
  END IF;
  
  -- Add exchange_rate column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'receipts' AND column_name = 'exchange_rate'
  ) THEN
    ALTER TABLE receipts ADD COLUMN exchange_rate numeric(10,6) DEFAULT 1.0;
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS receipts_currency_idx ON receipts (currency);
CREATE INDEX IF NOT EXISTS receipts_original_currency_idx ON receipts (original_currency);
CREATE INDEX IF NOT EXISTS users_native_country_idx ON users (native_country);

-- Update existing receipts to have currency data
UPDATE receipts 
SET 
  currency = 'USD',
  original_currency = 'USD',
  converted_amount = amount,
  original_amount = amount,
  exchange_rate = 1.0
WHERE currency IS NULL;

-- Add comments for documentation
COMMENT ON COLUMN users.native_country IS 'User native country for currency and localization';
COMMENT ON COLUMN receipts.currency IS 'Currency code of the receipt (e.g., USD, EUR, AED)';
COMMENT ON COLUMN receipts.original_currency IS 'Original currency from the receipt';
COMMENT ON COLUMN receipts.converted_amount IS 'Amount converted to user default currency';
COMMENT ON COLUMN receipts.original_amount IS 'Original amount from receipt';
COMMENT ON COLUMN receipts.exchange_rate IS 'Exchange rate used for conversion';