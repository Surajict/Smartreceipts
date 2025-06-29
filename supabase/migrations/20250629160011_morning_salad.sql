/*
  # Add store and location fields to receipts table

  1. Schema Changes
    - Add `store_name` field to store the name of the store/merchant
    - Add `purchase_location` field to store the location where purchase was made
    
  2. Updates
    - Both fields are optional (nullable) to maintain compatibility with existing data
    - Add indexes for better search performance
*/

-- Add new columns to receipts table
DO $$
BEGIN
  -- Add store_name column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'receipts' AND column_name = 'store_name'
  ) THEN
    ALTER TABLE receipts ADD COLUMN store_name text;
  END IF;

  -- Add purchase_location column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'receipts' AND column_name = 'purchase_location'
  ) THEN
    ALTER TABLE receipts ADD COLUMN purchase_location text;
  END IF;
END $$;

-- Create indexes for better search performance
CREATE INDEX IF NOT EXISTS receipts_store_name_idx ON receipts(store_name);
CREATE INDEX IF NOT EXISTS receipts_purchase_location_idx ON receipts(purchase_location);

-- Create a composite index for location-based searches
CREATE INDEX IF NOT EXISTS receipts_location_search_idx ON receipts(store_name, purchase_location);