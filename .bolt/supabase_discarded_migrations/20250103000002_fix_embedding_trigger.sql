/*
  # Fix Embedding Trigger - Use Only Existing Fields
  
  1. Drop the existing trigger that references non-existent fields
  2. Create a corrected trigger that only uses actual receipt table fields
  3. Update the backfill function with correct field names
*/

-- Drop the existing trigger and function
DROP TRIGGER IF EXISTS trigger_generate_receipt_embedding ON receipts;
DROP FUNCTION IF EXISTS generate_receipt_embedding();
DROP FUNCTION IF EXISTS backfill_receipt_embeddings();

-- Create corrected function to generate embedding for a receipt
CREATE OR REPLACE FUNCTION generate_receipt_embedding()
RETURNS TRIGGER AS $$
DECLARE
  embedding_text TEXT;
  embedding_result vector(384);
BEGIN
  -- Combine relevant text fields for embedding (only using fields that exist)
  embedding_text := COALESCE(NEW.product_description, '') || ' ' ||
                   COALESCE(NEW.brand_name, '') || ' ' ||
                   COALESCE(NEW.model_number, '') || ' ' ||
                   COALESCE(NEW.store_name, '') || ' ' ||
                   COALESCE(NEW.purchase_location, '') || ' ' ||
                   COALESCE(NEW.country, '') || ' ' ||
                   COALESCE(NEW.warranty_period, '') || ' ' ||
                   COALESCE(NEW.extended_warranty, '') || ' ' ||
                   COALESCE(NEW.extracted_text, '');
  
  -- Clean up the text (remove extra spaces)
  embedding_text := TRIM(REGEXP_REPLACE(embedding_text, '\s+', ' ', 'g'));
  
  -- Only generate embedding if we have meaningful text
  IF LENGTH(embedding_text) > 0 THEN
    BEGIN
      -- Generate embedding using Supabase AI
      SELECT ai.openai_embed(
        'text-embedding-3-small',
        embedding_text,
        dimensions => 384
      ) INTO embedding_result;
      
      -- Set the embedding
      NEW.embedding := embedding_result;
      
    EXCEPTION WHEN OTHERS THEN
      -- Log error but don't fail the insert/update
      RAISE WARNING 'Failed to generate embedding for receipt %: %', NEW.id, SQLERRM;
      NEW.embedding := NULL;
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically generate embeddings
CREATE TRIGGER trigger_generate_receipt_embedding
  BEFORE INSERT OR UPDATE ON receipts
  FOR EACH ROW
  EXECUTE FUNCTION generate_receipt_embedding();

-- Create corrected function to backfill embeddings for existing receipts
CREATE OR REPLACE FUNCTION backfill_receipt_embeddings()
RETURNS INTEGER AS $$
DECLARE
  receipt_record RECORD;
  embedding_text TEXT;
  embedding_result vector(384);
  updated_count INTEGER := 0;
BEGIN
  -- Process receipts that don't have embeddings
  FOR receipt_record IN 
    SELECT * FROM receipts 
    WHERE embedding IS NULL
    LIMIT 100 -- Process in batches to avoid timeouts
  LOOP
    BEGIN
      -- Combine relevant text fields for embedding (only using fields that exist)
      embedding_text := COALESCE(receipt_record.product_description, '') || ' ' ||
                       COALESCE(receipt_record.brand_name, '') || ' ' ||
                       COALESCE(receipt_record.model_number, '') || ' ' ||
                       COALESCE(receipt_record.store_name, '') || ' ' ||
                       COALESCE(receipt_record.purchase_location, '') || ' ' ||
                       COALESCE(receipt_record.country, '') || ' ' ||
                       COALESCE(receipt_record.warranty_period, '') || ' ' ||
                       COALESCE(receipt_record.extended_warranty, '') || ' ' ||
                       COALESCE(receipt_record.extracted_text, '');
      
      -- Clean up the text
      embedding_text := TRIM(REGEXP_REPLACE(embedding_text, '\s+', ' ', 'g'));
      
      -- Only generate embedding if we have meaningful text
      IF LENGTH(embedding_text) > 0 THEN
        -- Generate embedding using Supabase AI
        SELECT ai.openai_embed(
          'text-embedding-3-small',
          embedding_text,
          dimensions => 384
        ) INTO embedding_result;
        
        -- Update the receipt with the embedding
        UPDATE receipts 
        SET embedding = embedding_result 
        WHERE id = receipt_record.id;
        
        updated_count := updated_count + 1;
      END IF;
      
    EXCEPTION WHEN OTHERS THEN
      -- Log error but continue processing
      RAISE WARNING 'Failed to generate embedding for receipt %: %', receipt_record.id, SQLERRM;
    END;
  END LOOP;
  
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Add comments
COMMENT ON FUNCTION generate_receipt_embedding() IS 'Automatically generates vector embeddings for receipts using Supabase AI - Fixed to use only existing fields';
COMMENT ON FUNCTION backfill_receipt_embeddings() IS 'Backfills embeddings for existing receipts without embeddings - Fixed to use only existing fields'; 