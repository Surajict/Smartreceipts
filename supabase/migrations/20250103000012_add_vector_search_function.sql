/*
  # Add Vector Search Function
  
  This migration adds a simple vector search function that can be called from the edge function.
*/

-- Create a function to match receipts using vector similarity
CREATE OR REPLACE FUNCTION match_receipts_simple(
  query_embedding vector(384),
  match_threshold float DEFAULT 0.3,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  product_description text,
  brand_name text,
  model_number text,
  purchase_date date,
  amount numeric,
  warranty_period text,
  store_name text,
  similarity float
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    receipts.id,
    receipts.product_description,
    receipts.brand_name,
    receipts.model_number,
    receipts.purchase_date,
    receipts.amount,
    receipts.warranty_period,
    receipts.store_name,
    (1 - (receipts.embedding <=> query_embedding)) as similarity
  FROM receipts
  WHERE receipts.embedding IS NOT NULL
    AND (1 - (receipts.embedding <=> query_embedding)) > match_threshold
  ORDER BY receipts.embedding <=> query_embedding
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql; 