-- Fix smart search to filter by user ID
-- This migration ensures that vector search results are user-specific

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS match_receipts_simple(vector, double precision, int);

-- Create user-filtered vector search function
CREATE OR REPLACE FUNCTION match_receipts_simple(
  query_embedding vector(384),
  match_threshold double precision DEFAULT 0.3,
  match_count int DEFAULT 5,
  user_id uuid DEFAULT NULL
)
RETURNS TABLE(
  id uuid,
  product_description text,
  brand_name text,
  model_number text,
  purchase_date date,
  amount numeric,
  warranty_period text,
  store_name text,
  purchase_location text,
  similarity double precision
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id,
    r.product_description,
    r.brand_name,
    r.model_number,
    r.purchase_date,
    r.amount,
    r.warranty_period,
    r.store_name,
    r.purchase_location,
    1 - (r.embedding <=> query_embedding) as similarity
  FROM receipts r
  WHERE r.embedding IS NOT NULL
    AND (user_id IS NULL OR r.user_id = user_id)
    AND 1 - (r.embedding <=> query_embedding) > match_threshold
  ORDER BY r.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION match_receipts_simple(vector, double precision, int, uuid) TO authenticated;

-- Create an index on the embedding column for better performance
CREATE INDEX IF NOT EXISTS receipts_embedding_idx ON receipts USING ivfflat (embedding vector_cosine_ops);

-- Update the RLS policies to ensure they work with vector search
-- (These should already exist but let's ensure they're correct)
DROP POLICY IF EXISTS "Users can view own receipts" ON receipts;
CREATE POLICY "Users can view own receipts"
  ON receipts
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Add a comment to track this migration
COMMENT ON FUNCTION match_receipts_simple(vector, double precision, int, uuid) IS 'User-filtered vector search function for receipts - ensures search results are user-specific'; 