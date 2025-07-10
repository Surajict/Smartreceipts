/*
  # Nuclear Cleanup and Fix for Embedding System
  
  This migration uses a nuclear approach to clean up ALL embedding functions
  by dropping them with every possible signature combination, then rebuilds
  the system from scratch.
*/

-- Step 1: Nuclear cleanup - Drop ALL possible function variations
DROP TRIGGER IF EXISTS trigger_generate_receipt_embedding ON receipts CASCADE;

-- Drop update_receipt_embedding with ALL possible signatures
DROP FUNCTION IF EXISTS update_receipt_embedding() CASCADE;
DROP FUNCTION IF EXISTS update_receipt_embedding(uuid) CASCADE;
DROP FUNCTION IF EXISTS update_receipt_embedding(text) CASCADE;
DROP FUNCTION IF EXISTS update_receipt_embedding(uuid, vector) CASCADE;
DROP FUNCTION IF EXISTS update_receipt_embedding(uuid, vector(384)) CASCADE;
DROP FUNCTION IF EXISTS update_receipt_embedding(uuid, vector(1536)) CASCADE;
DROP FUNCTION IF EXISTS update_receipt_embedding(text, vector) CASCADE;
DROP FUNCTION IF EXISTS update_receipt_embedding(text, vector(384)) CASCADE;
DROP FUNCTION IF EXISTS update_receipt_embedding(text, vector(1536)) CASCADE;
DROP FUNCTION IF EXISTS update_receipt_embedding(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS update_receipt_embedding(text, text) CASCADE;

-- Drop generate functions with ALL possible signatures
DROP FUNCTION IF EXISTS generate_receipt_embedding() CASCADE;
DROP FUNCTION IF EXISTS generate_receipt_embedding(uuid) CASCADE;
DROP FUNCTION IF EXISTS generate_receipt_embedding(text) CASCADE;
DROP FUNCTION IF EXISTS generate_embedding_for_receipt() CASCADE;
DROP FUNCTION IF EXISTS generate_embedding_for_receipt(uuid) CASCADE;
DROP FUNCTION IF EXISTS generate_embedding_for_receipt(text) CASCADE;

-- Drop get functions with ALL possible signatures
DROP FUNCTION IF EXISTS get_receipts_without_embeddings() CASCADE;
DROP FUNCTION IF EXISTS get_receipts_without_embeddings(int) CASCADE;
DROP FUNCTION IF EXISTS get_receipts_without_embeddings(integer) CASCADE;
DROP FUNCTION IF EXISTS get_receipts_without_embeddings(bigint) CASCADE;

-- Drop search functions with ALL possible signatures
DROP FUNCTION IF EXISTS search_receipts_by_embedding(vector, uuid) CASCADE;
DROP FUNCTION IF EXISTS search_receipts_by_embedding(vector, uuid, float) CASCADE;
DROP FUNCTION IF EXISTS search_receipts_by_embedding(vector, uuid, float, int) CASCADE;
DROP FUNCTION IF EXISTS search_receipts_by_embedding(vector(384), uuid) CASCADE;
DROP FUNCTION IF EXISTS search_receipts_by_embedding(vector(384), uuid, float) CASCADE;
DROP FUNCTION IF EXISTS search_receipts_by_embedding(vector(384), uuid, float, int) CASCADE;
DROP FUNCTION IF EXISTS search_receipts_by_embedding(vector(1536), uuid, float, int) CASCADE;

-- Drop status functions with ALL possible signatures
DROP FUNCTION IF EXISTS get_embedding_status() CASCADE;
DROP FUNCTION IF EXISTS get_embedding_status(uuid) CASCADE;
DROP FUNCTION IF EXISTS check_embedding_status() CASCADE;
DROP FUNCTION IF EXISTS check_embedding_status(uuid) CASCADE;

-- Drop any AI-related functions
DROP FUNCTION IF EXISTS ai.openai_embed(text) CASCADE;
DROP FUNCTION IF EXISTS ai.openai_embed(text, text) CASCADE;
DROP FUNCTION IF EXISTS ai.openai_embed(text, text, int) CASCADE;
DROP FUNCTION IF EXISTS ai.openai_embed(text, text, integer) CASCADE;

-- Drop any other potential embedding functions
DROP FUNCTION IF EXISTS embedding_search() CASCADE;
DROP FUNCTION IF EXISTS vector_search() CASCADE;
DROP FUNCTION IF EXISTS similarity_search() CASCADE;

-- Step 2: Clean up any remaining schemas or types that might conflict
DROP TYPE IF EXISTS embedding_status_type CASCADE;
DROP TYPE IF EXISTS search_result_type CASCADE;

-- Step 3: Ensure pgvector extension is enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Step 4: Reset the embedding column completely
DO $$
BEGIN
  -- Drop the embedding column completely if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'receipts' 
    AND column_name = 'embedding'
  ) THEN
    ALTER TABLE receipts DROP COLUMN embedding;
  END IF;
  
  -- Add the column with correct type
  ALTER TABLE receipts ADD COLUMN embedding vector(384);
  
  RAISE NOTICE 'Embedding column reset successfully';
END $$;

-- Step 5: Drop and recreate all indexes
DROP INDEX IF EXISTS receipts_embedding_idx CASCADE;
DROP INDEX IF EXISTS receipts_user_id_embedding_idx CASCADE;
DROP INDEX IF EXISTS receipts_embedding_null_idx CASCADE;
DROP INDEX IF EXISTS idx_receipts_embedding CASCADE;
DROP INDEX IF EXISTS idx_receipts_embedding_cosine CASCADE;

-- Step 6: Create the utility function with a unique name to avoid conflicts
CREATE FUNCTION receipt_embedding_update(
  receipt_id uuid,
  embedding_vector vector(384)
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE receipts 
  SET embedding = embedding_vector
  WHERE id = receipt_id;
  
  -- Log the update for debugging
  RAISE NOTICE 'Updated embedding for receipt %', receipt_id;
END;
$$;

-- Step 7: Create function to get receipts without embeddings (for backfill)
CREATE FUNCTION receipts_needing_embeddings(batch_size int DEFAULT 10)
RETURNS TABLE(
  id uuid,
  content text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    TRIM(
      COALESCE(r.product_description, '') || ' ' ||
      COALESCE(r.brand_name, '') || ' ' ||
      COALESCE(r.model_number, '') || ' ' ||
      COALESCE(r.store_name, '') || ' ' ||
      COALESCE(r.purchase_location, '') || ' ' ||
      COALESCE(r.country, '') || ' ' ||
      COALESCE(r.warranty_period, '')
    ) as content
  FROM receipts r
  WHERE r.embedding IS NULL
    AND LENGTH(TRIM(COALESCE(r.product_description, ''))) > 0
  ORDER BY r.created_at DESC
  LIMIT batch_size;
END;
$$;

-- Step 8: Create vector similarity search function
CREATE FUNCTION receipt_vector_search(
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
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    COALESCE(r.product_description, 'Unknown Product') as title,
    COALESCE(r.brand_name, 'Unknown Brand') as brand,
    r.model_number as model,
    r.purchase_date,
    r.amount,
    COALESCE(r.warranty_period, 'Unknown') as warranty_period,
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

-- Step 9: Create helper function to check embedding status
CREATE FUNCTION embedding_status_check()
RETURNS TABLE(
  total_receipts bigint,
  receipts_with_embeddings bigint,
  receipts_without_embeddings bigint,
  percentage_complete numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_count bigint;
  with_embeddings_count bigint;
BEGIN
  SELECT COUNT(*) INTO total_count FROM receipts;
  SELECT COUNT(*) INTO with_embeddings_count FROM receipts WHERE embedding IS NOT NULL;
  
  RETURN QUERY
  SELECT 
    total_count,
    with_embeddings_count,
    total_count - with_embeddings_count,
    CASE 
      WHEN total_count > 0 THEN ROUND((with_embeddings_count::numeric / total_count::numeric) * 100, 2)
      ELSE 0
    END;
END;
$$;

-- Step 10: Create indexes for better performance
CREATE INDEX receipts_embedding_cosine_idx ON receipts USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);
CREATE INDEX receipts_user_embedding_idx ON receipts (user_id) WHERE embedding IS NOT NULL;
CREATE INDEX receipts_null_embedding_idx ON receipts (created_at) WHERE embedding IS NULL;

-- Step 11: Grant necessary permissions
GRANT EXECUTE ON FUNCTION receipt_embedding_update(uuid, vector(384)) TO authenticated;
GRANT EXECUTE ON FUNCTION receipts_needing_embeddings(int) TO authenticated;
GRANT EXECUTE ON FUNCTION receipt_vector_search(vector(384), uuid, float, int) TO authenticated;
GRANT EXECUTE ON FUNCTION embedding_status_check() TO authenticated;

-- Step 12: Add helpful comments
COMMENT ON FUNCTION receipt_embedding_update IS 'Updates embedding for a specific receipt - called by edge functions';
COMMENT ON FUNCTION receipts_needing_embeddings IS 'Returns receipts that need embeddings generated - used for backfill';
COMMENT ON FUNCTION receipt_vector_search IS 'Performs vector similarity search on receipts';
COMMENT ON FUNCTION embedding_status_check IS 'Returns current embedding statistics';

-- Step 13: Test the setup
DO $$
DECLARE
  test_status RECORD;
BEGIN
  -- Test the status function
  SELECT * INTO test_status FROM embedding_status_check() LIMIT 1;
  
  RAISE NOTICE '=== EMBEDDING SYSTEM NUCLEAR CLEANUP COMPLETED ===';
  RAISE NOTICE 'Total receipts: %', test_status.total_receipts;
  RAISE NOTICE 'Receipts with embeddings: %', test_status.receipts_with_embeddings;
  RAISE NOTICE 'Receipts without embeddings: %', test_status.receipts_without_embeddings;
  RAISE NOTICE 'Completion percentage: %%', test_status.percentage_complete;
  RAISE NOTICE '';
  RAISE NOTICE 'NEW FUNCTION NAMES (to avoid conflicts):';
  RAISE NOTICE '- receipt_embedding_update()';
  RAISE NOTICE '- receipts_needing_embeddings()';
  RAISE NOTICE '- receipt_vector_search()';
  RAISE NOTICE '- embedding_status_check()';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Update edge functions to use new function names';
  RAISE NOTICE '2. Deploy the edge functions';
  RAISE NOTICE '3. Generate embeddings for existing receipts';
END $$; 