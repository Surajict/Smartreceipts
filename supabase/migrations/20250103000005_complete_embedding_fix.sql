/*
  # Complete Embedding System Fix
  
  This migration completely fixes the embedding system by:
  1. Removing all old broken triggers and functions
  2. Ensuring pgvector is properly set up
  3. Creating utility functions for the edge functions to use
  4. Setting up proper indexes for fast vector search
*/

-- Step 1: Clean up any existing broken triggers and functions
DROP TRIGGER IF EXISTS trigger_generate_receipt_embedding ON receipts;
DROP FUNCTION IF EXISTS generate_receipt_embedding();
DROP FUNCTION IF EXISTS generate_embedding_for_receipt();

-- Step 2: Ensure pgvector extension is enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Step 3: Ensure embedding column exists with correct dimensions
DO $$
BEGIN
  -- Check if embedding column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'receipts' 
    AND column_name = 'embedding'
  ) THEN
    ALTER TABLE receipts ADD COLUMN embedding vector(384);
  END IF;
END $$;

-- Step 4: Create utility function for edge functions to call
CREATE OR REPLACE FUNCTION update_receipt_embedding(
  receipt_id uuid,
  embedding_vector vector(384)
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE receipts 
  SET embedding = embedding_vector
  WHERE id = receipt_id;
END;
$$;

-- Step 5: Create function to get receipts without embeddings (for backfill)
CREATE OR REPLACE FUNCTION get_receipts_without_embeddings(batch_size int DEFAULT 10)
RETURNS TABLE(
  id uuid,
  content text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    COALESCE(r.product_description, '') || ' ' ||
    COALESCE(r.brand_name, '') || ' ' ||
    COALESCE(r.model_number, '') || ' ' ||
    COALESCE(r.store_name, '') || ' ' ||
    COALESCE(r.purchase_location, '') as content
  FROM receipts r
  WHERE r.embedding IS NULL
  ORDER BY r.created_at DESC
  LIMIT batch_size;
END;
$$;

-- Step 6: Create vector similarity search function
CREATE OR REPLACE FUNCTION search_receipts_by_embedding(
  query_embedding vector(384),
  user_id_param uuid,
  match_threshold float DEFAULT 0.3,
  match_count int DEFAULT 5
)
RETURNS TABLE(
  id uuid,
  title text,
  brand text,
  model text,
  purchase_date date,
  amount numeric,
  warranty_period text,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.product_description as title,
    r.brand_name as brand,
    r.model_number as model,
    r.purchase_date,
    r.amount,
    r.warranty_period,
    1 - (r.embedding <=> query_embedding) as similarity
  FROM receipts r
  WHERE 
    r.user_id = user_id_param
    AND r.embedding IS NOT NULL
    AND 1 - (r.embedding <=> query_embedding) > match_threshold
  ORDER BY r.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Step 7: Create indexes for better performance
CREATE INDEX IF NOT EXISTS receipts_embedding_idx ON receipts USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS receipts_user_id_embedding_idx ON receipts (user_id) WHERE embedding IS NOT NULL;

-- Step 8: Grant necessary permissions
GRANT EXECUTE ON FUNCTION update_receipt_embedding TO authenticated;
GRANT EXECUTE ON FUNCTION get_receipts_without_embeddings TO authenticated;
GRANT EXECUTE ON FUNCTION search_receipts_by_embedding TO authenticated;

-- Step 9: Add helpful comments
COMMENT ON FUNCTION update_receipt_embedding IS 'Updates embedding for a specific receipt - called by edge functions';
COMMENT ON FUNCTION get_receipts_without_embeddings IS 'Returns receipts that need embeddings generated - used for backfill';
COMMENT ON FUNCTION search_receipts_by_embedding IS 'Performs vector similarity search on receipts';

-- Step 10: Log completion
DO $$
BEGIN
  RAISE NOTICE 'Embedding system fix completed successfully!';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Deploy the edge functions';
  RAISE NOTICE '2. Run the backfill process';
  RAISE NOTICE '3. Test smart search functionality';
END $$; 