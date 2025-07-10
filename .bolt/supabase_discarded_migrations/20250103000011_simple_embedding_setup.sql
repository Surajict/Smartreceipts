/*
  # Simple Embedding Setup
  
  This migration sets up the basic embedding system without complex functions.
  Just the essential vector column and index for smart search.
*/

-- Step 1: Ensure pgvector extension is enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Step 2: Add embedding column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'receipts' AND column_name = 'embedding'
    ) THEN
        ALTER TABLE receipts ADD COLUMN embedding vector(384);
    END IF;
END $$;

-- Step 3: Create index for fast vector search
CREATE INDEX IF NOT EXISTS receipts_embedding_idx ON receipts 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Step 4: Create a simple function to get embedding status
CREATE OR REPLACE FUNCTION get_embedding_status_simple()
RETURNS TABLE (
    total_receipts bigint,
    receipts_with_embeddings bigint,
    receipts_without_embeddings bigint
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_receipts,
        COUNT(embedding) as receipts_with_embeddings,
        COUNT(*) - COUNT(embedding) as receipts_without_embeddings
    FROM receipts;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Create a simple function to update embeddings
CREATE OR REPLACE FUNCTION update_receipt_embedding_simple(
    receipt_id uuid,
    new_embedding vector(384)
)
RETURNS boolean AS $$
BEGIN
    UPDATE receipts 
    SET embedding = new_embedding 
    WHERE id = receipt_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql; 