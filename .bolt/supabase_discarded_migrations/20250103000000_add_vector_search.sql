/*
  # Add Vector Search Support for Smart Search

  1. Enable pgvector extension
  2. Add embedding column to receipts table
  3. Create vector index for similarity search
  4. Add function to generate embeddings for existing receipts
*/

-- Enable the pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column to receipts table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'receipts' AND column_name = 'embedding'
  ) THEN
    ALTER TABLE receipts ADD COLUMN embedding vector(384);
    COMMENT ON COLUMN receipts.embedding IS 'Vector embedding for semantic search using gte-small model (384 dimensions)';
  END IF;
END $$;

-- Create vector similarity search index
CREATE INDEX IF NOT EXISTS receipts_embedding_idx ON receipts USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Function to generate embeddings for text content
CREATE OR REPLACE FUNCTION generate_receipt_embedding(receipt_text text)
RETURNS vector(384) AS $$
DECLARE
  embedding_result vector(384);
BEGIN
  -- This function would be called from the application layer
  -- For now, return a zero vector as placeholder
  RETURN array_fill(0, ARRAY[384])::vector(384);
END;
$$ LANGUAGE plpgsql;

-- Function to perform vector similarity search
CREATE OR REPLACE FUNCTION search_receipts_by_embedding(
  user_uuid uuid,
  query_embedding vector(384),
  similarity_threshold float DEFAULT 0.5,
  limit_count integer DEFAULT 5
)
RETURNS TABLE(
  id uuid,
  product_description text,
  brand_name text,
  store_name text,
  purchase_date date,
  amount numeric,
  warranty_period text,
  similarity_score float
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.product_description,
    r.brand_name,
    COALESCE(r.store_name, '') as store_name,
    r.purchase_date,
    r.amount,
    r.warranty_period,
    (1 - (r.embedding <=> query_embedding)) as similarity_score
  FROM receipts r
  WHERE r.user_id = user_uuid
    AND r.embedding IS NOT NULL
    AND (1 - (r.embedding <=> query_embedding)) > similarity_threshold
  ORDER BY r.embedding <=> query_embedding
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the vector search function
GRANT EXECUTE ON FUNCTION search_receipts_by_embedding(uuid, vector(384), float, integer) TO authenticated;

-- Function to update embedding when receipt is inserted or updated
CREATE OR REPLACE FUNCTION update_receipt_embedding()
RETURNS TRIGGER AS $$
BEGIN
  -- The embedding will be generated and set from the application layer
  -- This trigger ensures the embedding is updated when receipt content changes
  IF NEW.product_description IS DISTINCT FROM OLD.product_description OR
     NEW.brand_name IS DISTINCT FROM OLD.brand_name OR
     NEW.extracted_text IS DISTINCT FROM OLD.extracted_text THEN
    -- Mark that embedding needs to be regenerated
    -- The application will handle the actual embedding generation
    NEW.embedding = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update embeddings when receipt content changes
DROP TRIGGER IF EXISTS update_receipt_embedding_trigger ON receipts;
CREATE TRIGGER update_receipt_embedding_trigger
  BEFORE UPDATE ON receipts
  FOR EACH ROW
  EXECUTE FUNCTION update_receipt_embedding();

-- Add comment to table
COMMENT ON TABLE receipts IS 'Receipts table with vector search capabilities for semantic similarity matching'; 