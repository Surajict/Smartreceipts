-- Add columns to support multi-product receipts using single-table approach
-- Each product from a multi-product receipt becomes its own row in the receipts table

-- Add receipt_group_id to group products from the same physical receipt
ALTER TABLE receipts ADD COLUMN receipt_group_id UUID;

-- Add flag to identify if this is part of a multi-product receipt
ALTER TABLE receipts ADD COLUMN is_group_receipt BOOLEAN DEFAULT FALSE NOT NULL;

-- Add receipt_total to store the original receipt total (duplicated across group members)
ALTER TABLE receipts ADD COLUMN receipt_total NUMERIC;

-- Create index for efficient grouping queries
CREATE INDEX idx_receipts_group_id ON receipts(receipt_group_id) WHERE receipt_group_id IS NOT NULL;

-- Create index for filtering group receipts
CREATE INDEX idx_receipts_is_group ON receipts(is_group_receipt) WHERE is_group_receipt = TRUE;

-- Update existing receipts to have receipt_total equal to amount
UPDATE receipts SET receipt_total = amount WHERE receipt_total IS NULL;

-- Add comment to document the new approach
COMMENT ON TABLE receipts IS 'Receipts table supporting both single and multi-product receipts. Multi-product receipts are stored as multiple rows with the same receipt_group_id.';

-- Add column comments
COMMENT ON COLUMN receipts.receipt_group_id IS 'UUID linking products from the same physical receipt. NULL for single-product receipts.';
COMMENT ON COLUMN receipts.is_group_receipt IS 'TRUE if this row is part of a multi-product receipt group.';
COMMENT ON COLUMN receipts.receipt_total IS 'Original receipt total amount. For multi-product receipts, this is duplicated across all group members.';
COMMENT ON COLUMN receipts.amount IS 'Individual product amount. For single-product receipts, equals receipt_total.'; 