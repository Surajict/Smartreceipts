/*
  # Add Multi-Item Receipt Support
  
  1. Schema Updates
    - Add columns to track multi-item receipt processing
    - Add audit fields for item selection tracking
    
  2. New Columns
    - `selected_item_index` - Index of selected item from multi-item extraction
    - `total_items_found` - Total number of items found during extraction
    - `processing_method` - Updated to include multi-item processing methods
    
  3. Backward Compatibility
    - All existing receipts will continue to work
    - New columns are nullable and have sensible defaults
*/

-- Add new columns to support multi-item receipt processing
ALTER TABLE receipts 
ADD COLUMN IF NOT EXISTS selected_item_index integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS total_items_found integer DEFAULT 1;

-- Add comment explaining the new columns
COMMENT ON COLUMN receipts.selected_item_index IS 'Index of the selected item when multiple items were found on a receipt (0-based)';
COMMENT ON COLUMN receipts.total_items_found IS 'Total number of items found during AI extraction (1 for single item receipts)';

-- Update the processing_method column comment to include new methods
COMMENT ON COLUMN receipts.processing_method IS 'Method used to process receipt: manual, ocr, gpt_structured, ai_multi_item_gpt_structured, fallback_parsing';

-- Create an index on the new columns for better query performance
CREATE INDEX IF NOT EXISTS idx_receipts_multi_item ON receipts (total_items_found, selected_item_index) WHERE total_items_found > 1;

-- Create a view to help with multi-item receipt analytics
CREATE OR REPLACE VIEW multi_item_receipt_stats AS
SELECT 
  user_id,
  COUNT(*) as total_receipts,
  COUNT(CASE WHEN total_items_found > 1 THEN 1 END) as multi_item_receipts,
  COUNT(CASE WHEN total_items_found = 1 THEN 1 END) as single_item_receipts,
  AVG(total_items_found) as avg_items_per_receipt,
  MAX(total_items_found) as max_items_found
FROM receipts
GROUP BY user_id;

-- Grant access to the new view
GRANT SELECT ON multi_item_receipt_stats TO authenticated;

-- Add RLS policy for the new view (inherits from receipts table policies)
ALTER VIEW multi_item_receipt_stats SET (security_invoker = true);