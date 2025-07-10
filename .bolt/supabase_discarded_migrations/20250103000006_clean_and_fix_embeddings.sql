/*
  # Clean and Fix Embedding System
  
  This migration completely cleans up and fixes the embedding system by:
  1. Properly removing ALL existing functions and triggers
  2. Ensuring pgvector is properly set up
  3. Creating new utility functions for the edge functions
  4. Setting up proper indexes for fast vector search
*/

-- Step 1: Clean up ALL existing functions and triggers thoroughly
DROP TRIGGER IF EXISTS trigger_generate_receipt_embedding ON receipts;

-- Drop all variations of the embedding functions
DROP FUNCTION IF EXISTS generate_receipt_embedding();
DROP FUNCTION IF EXISTS generate_receipt_embedding(uuid);
DROP FUNCTION IF EXISTS generate_embedding_for_receipt();
DROP FUNCTION IF EXISTS generate_embedding_for_receipt(uuid);
DROP FUNCTION IF EXISTS update_receipt_embedding(uuid, vector);
DROP FUNCTION IF EXISTS update_receipt_embedding(uuid, vector(384));
DROP FUNCTION IF EXISTS get_receipts_without_embeddings();
DROP FUNCTION IF EXISTS get_receipts_without_embeddings(int);
DROP FUNCTION IF EXISTS search_receipts_by_embedding(vector, uuid, float, int);
DROP FUNCTION IF EXISTS search_receipts_by_embedding(vector(384), uuid, float, int);

-- Also clean up any AI-related functions that might conflict
DROP FUNCTION IF EXISTS ai.openai_embed(text, text);
DROP FUNCTION IF EXISTS ai.openai_embed(text, text, int);

-- Step 2: Ensure pgvector extension is enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Step 3: Ensure embedding column exists with correct dimensions
DO $$
BEGIN
  -- Check if embedding column exists and has correct type
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'receipts' 
    AND column_name = 'embedding'
    AND data_type = 'USER-DEFINED'
  ) THEN
    -- Drop the column if it exists but has wrong type
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'receipts' 
      AND column_name = 'embedding'
    ) THEN
      ALTER TABLE receipts DROP COLUMN embedding;
    END IF;
    
    -- Add the column with correct type
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

-- Step 5: Create function to get receipts without embeddings (for backfill)
CREATE OR REPLACE FUNCTION get_receipts_without_embeddings(batch_size int DEFAULT 10)
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

-- Step 7: Create helper function to check embedding status
CREATE OR REPLACE FUNCTION get_embedding_status()
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

-- Step 8: Create indexes for better performance
-- Drop existing indexes first
DROP INDEX IF EXISTS receipts_embedding_idx;
DROP INDEX IF EXISTS receipts_user_id_embedding_idx;

-- Create new indexes
CREATE INDEX receipts_embedding_idx ON receipts USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);
CREATE INDEX receipts_user_id_embedding_idx ON receipts (user_id) WHERE embedding IS NOT NULL;
CREATE INDEX receipts_embedding_null_idx ON receipts (created_at) WHERE embedding IS NULL;

-- Step 9: Grant necessary permissions
GRANT EXECUTE ON FUNCTION update_receipt_embedding(uuid, vector(384)) TO authenticated;
GRANT EXECUTE ON FUNCTION get_receipts_without_embeddings(int) TO authenticated;
GRANT EXECUTE ON FUNCTION search_receipts_by_embedding(vector(384), uuid, float, int) TO authenticated;
GRANT EXECUTE ON FUNCTION get_embedding_status() TO authenticated;

-- Step 10: Add helpful comments
COMMENT ON FUNCTION update_receipt_embedding IS 'Updates embedding for a specific receipt - called by edge functions';
COMMENT ON FUNCTION get_receipts_without_embeddings IS 'Returns receipts that need embeddings generated - used for backfill';
COMMENT ON FUNCTION search_receipts_by_embedding IS 'Performs vector similarity search on receipts';
COMMENT ON FUNCTION get_embedding_status IS 'Returns current embedding statistics';

-- Step 11: Test the setup
DO $$
DECLARE
  test_status RECORD;
BEGIN
  -- Test the status function
  SELECT * INTO test_status FROM get_embedding_status() LIMIT 1;
  
  RAISE NOTICE 'Embedding system setup completed successfully!';
  RAISE NOTICE 'Total receipts: %', test_status.total_receipts;
  RAISE NOTICE 'Receipts with embeddings: %', test_status.receipts_with_embeddings;
  RAISE NOTICE 'Receipts without embeddings: %', test_status.receipts_without_embeddings;
  RAISE NOTICE 'Completion percentage: %%', test_status.percentage_complete;
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Deploy the edge functions';
  RAISE NOTICE '2. Run the backfill process';
  RAISE NOTICE '3. Test smart search functionality';
END $$; 