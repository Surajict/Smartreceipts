/*
  # Fixed Nuclear Cleanup for Embedding System
  
  This migration fixes the RAISE statement syntax and completely cleans up 
  all embedding-related objects, then rebuilds everything properly.
*/

-- Step 1: Ultimate nuclear cleanup - Drop ALL possible objects with CASCADE
DROP TRIGGER IF EXISTS trigger_generate_receipt_embedding ON receipts CASCADE;

-- Drop all views that might depend on embedding column
DROP VIEW IF EXISTS receipt_embedding_status CASCADE;
DROP VIEW IF EXISTS embedding_stats CASCADE;
DROP VIEW IF EXISTS receipt_stats CASCADE;

-- Drop update_receipt_embedding with ALL possible signatures and CASCADE
DROP FUNCTION IF EXISTS update_receipt_embedding() CASCADE;
DROP FUNCTION IF EXISTS update_receipt_embedding(uuid) CASCADE;
DROP FUNCTION IF EXISTS update_receipt_embedding(text) CASCADE;
DROP FUNCTION IF EXISTS update_receipt_embedding(uuid, vector) CASCADE;
DROP FUNCTION IF EXISTS update_receipt_embedding(uuid, vector(384)) CASCADE;
DROP FUNCTION IF EXISTS update_receipt_embedding(text, vector) CASCADE;
DROP FUNCTION IF EXISTS update_receipt_embedding(text, vector(384)) CASCADE;

-- Drop all other embedding functions
DROP FUNCTION IF EXISTS generate_receipt_embedding() CASCADE;
DROP FUNCTION IF EXISTS generate_receipt_embedding(uuid) CASCADE;
DROP FUNCTION IF EXISTS generate_embedding_for_receipt() CASCADE;
DROP FUNCTION IF EXISTS generate_embedding_for_receipt(uuid) CASCADE;
DROP FUNCTION IF EXISTS get_embedding_status() CASCADE;
DROP FUNCTION IF EXISTS get_embedding_status(uuid) CASCADE;
DROP FUNCTION IF EXISTS update_embedding() CASCADE;
DROP FUNCTION IF EXISTS update_embedding(uuid) CASCADE;
DROP FUNCTION IF EXISTS update_embedding(uuid, vector) CASCADE;
DROP FUNCTION IF EXISTS update_embedding(uuid, vector(384)) CASCADE;

-- Step 2: Remove embedding column if it exists (with CASCADE)
DO $$
BEGIN
    -- Check if embedding column exists and drop it
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'receipts' 
        AND column_name = 'embedding'
    ) THEN
        ALTER TABLE receipts DROP COLUMN embedding CASCADE;
        RAISE NOTICE 'Embedding column dropped successfully';
    ELSE
        RAISE NOTICE 'Embedding column does not exist';
    END IF;
END $$;

-- Step 3: Ensure pgvector extension is enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Step 4: Add embedding column with proper vector type
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS embedding vector(384);

-- Step 5: Create index for fast similarity search
CREATE INDEX IF NOT EXISTS receipts_embedding_idx ON receipts 
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Step 6: Create utility function for updating embeddings (used by edge functions)
CREATE OR REPLACE FUNCTION update_receipt_embedding_v2(
    receipt_id uuid,
    embedding_vector vector(384)
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE receipts 
    SET embedding = embedding_vector 
    WHERE id = receipt_id;
    
    RETURN FOUND;
END;
$$;

-- Step 7: Create function to get embedding status
CREATE OR REPLACE FUNCTION get_embedding_status_v2(user_id_param uuid DEFAULT NULL)
RETURNS TABLE(
    total_receipts bigint,
    receipts_with_embeddings bigint,
    receipts_without_embeddings bigint,
    percentage_complete numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_receipts,
        COUNT(embedding) as receipts_with_embeddings,
        COUNT(*) - COUNT(embedding) as receipts_without_embeddings,
        CASE 
            WHEN COUNT(*) = 0 THEN 0
            ELSE ROUND((COUNT(embedding)::numeric / COUNT(*)::numeric) * 100, 2)
        END as percentage_complete
    FROM receipts 
    WHERE (user_id_param IS NULL OR user_id = user_id_param);
END;
$$;

-- Step 8: Create function to search receipts without embeddings
CREATE OR REPLACE FUNCTION get_receipts_without_embeddings_v2(
    user_id_param uuid DEFAULT NULL,
    limit_param integer DEFAULT 10
)
RETURNS TABLE(
    receipt_id uuid,
    content_text text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.id as receipt_id,
        CONCAT_WS(' ',
            COALESCE(r.product_description, ''),
            COALESCE(r.brand_name, ''),
            COALESCE(r.model_number, ''),
            COALESCE(r.store_name, ''),
            COALESCE(r.purchase_location, ''),
            COALESCE(r.warranty_period, ''),
            COALESCE(r.extracted_text, '')
        ) as content_text
    FROM receipts r
    WHERE r.embedding IS NULL
    AND (user_id_param IS NULL OR r.user_id = user_id_param)
    ORDER BY r.created_at DESC
    LIMIT limit_param;
END;
$$;

-- Step 9: Grant necessary permissions
GRANT EXECUTE ON FUNCTION update_receipt_embedding_v2(uuid, vector) TO authenticated;
GRANT EXECUTE ON FUNCTION get_embedding_status_v2(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_receipts_without_embeddings_v2(uuid, integer) TO authenticated;

-- Step 10: Create a view for easy embedding status monitoring
CREATE OR REPLACE VIEW receipt_embedding_status_v2 AS
SELECT 
    user_id,
    COUNT(*) as total_receipts,
    COUNT(embedding) as receipts_with_embeddings,
    COUNT(*) - COUNT(embedding) as receipts_without_embeddings,
    CASE 
        WHEN COUNT(*) = 0 THEN 0
        ELSE ROUND((COUNT(embedding)::numeric / COUNT(*)::numeric) * 100, 2)
    END as percentage_complete
FROM receipts 
GROUP BY user_id;

-- Grant access to the view
GRANT SELECT ON receipt_embedding_status_v2 TO authenticated;

-- Final notification
DO $$
BEGIN
    RAISE NOTICE 'Embedding system cleanup and setup completed successfully!';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Deploy the edge functions';
    RAISE NOTICE '2. Run backfill to generate embeddings for existing receipts';
    RAISE NOTICE '3. Test smart search functionality';
END $$; 