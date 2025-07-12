/*
  # Fix Receipt Schema and Add Currency Support

  1. Remove problematic columns that don't exist
  2. Add proper currency tracking columns
  3. Ensure all currency-related functionality works
  4. Add indexes for performance
*/

-- Remove any references to non-existent columns
-- (This is handled in the application layer now)

-- Ensure currency columns exist with proper defaults
DO $$ 
BEGIN
    -- Add original_currency if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'receipts' AND column_name = 'original_currency'
    ) THEN
        ALTER TABLE receipts ADD COLUMN original_currency text DEFAULT 'USD';
    END IF;

    -- Add converted_amount if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'receipts' AND column_name = 'converted_amount'
    ) THEN
        ALTER TABLE receipts ADD COLUMN converted_amount numeric(10,2);
    END IF;

    -- Add converted_currency if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'receipts' AND column_name = 'converted_currency'
    ) THEN
        ALTER TABLE receipts ADD COLUMN converted_currency text;
    END IF;

    -- Add exchange_rate if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'receipts' AND column_name = 'exchange_rate'
    ) THEN
        ALTER TABLE receipts ADD COLUMN exchange_rate numeric(10,6);
    END IF;

    -- Add conversion_date if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'receipts' AND column_name = 'conversion_date'
    ) THEN
        ALTER TABLE receipts ADD COLUMN conversion_date date;
    END IF;
END $$;

-- Add comments for clarity
COMMENT ON COLUMN receipts.original_currency IS 'Original currency from the receipt (e.g., USD, AED, GBP)';
COMMENT ON COLUMN receipts.converted_amount IS 'Amount converted to user preferred currency';
COMMENT ON COLUMN receipts.converted_currency IS 'User preferred currency for conversion';
COMMENT ON COLUMN receipts.exchange_rate IS 'Exchange rate used for conversion';
COMMENT ON COLUMN receipts.conversion_date IS 'Date when currency conversion was performed';

-- Add indexes for currency-related queries
CREATE INDEX IF NOT EXISTS receipts_currency_idx ON receipts (original_currency, converted_currency);
CREATE INDEX IF NOT EXISTS receipts_conversion_date_idx ON receipts (conversion_date);

-- Ensure user privacy settings have currency columns
DO $$ 
BEGIN
    -- Add preferred_currency if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_privacy_settings' AND column_name = 'preferred_currency'
    ) THEN
        ALTER TABLE user_privacy_settings ADD COLUMN preferred_currency text DEFAULT 'USD';
    END IF;

    -- Add display_currency_mode if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_privacy_settings' AND column_name = 'display_currency_mode'
    ) THEN
        ALTER TABLE user_privacy_settings ADD COLUMN display_currency_mode text DEFAULT 'native';
    END IF;
END $$;

-- Add comments for user privacy settings
COMMENT ON COLUMN user_privacy_settings.preferred_currency IS 'User preferred currency for dashboard display';
COMMENT ON COLUMN user_privacy_settings.display_currency_mode IS 'How to display currency: native, usd, or both';

-- Add constraint for display_currency_mode
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'user_privacy_settings_display_currency_mode_check'
    ) THEN
        ALTER TABLE user_privacy_settings 
        ADD CONSTRAINT user_privacy_settings_display_currency_mode_check 
        CHECK (display_currency_mode IN ('native', 'usd', 'both'));
    END IF;
END $$;

-- Update existing receipts to have default currency if null
UPDATE receipts 
SET original_currency = 'USD' 
WHERE original_currency IS NULL;

-- Update existing user privacy settings to have default currency preferences
UPDATE user_privacy_settings 
SET preferred_currency = 'USD', display_currency_mode = 'native'
WHERE preferred_currency IS NULL OR display_currency_mode IS NULL;