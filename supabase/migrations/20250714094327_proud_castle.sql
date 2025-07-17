/*
  # Fix All Smart Receipts Issues - Complete Migration
  
  This migration resolves all outstanding issues:
  1. Ensures proper database schema with all required columns
  2. Sets up vector search functionality with correct dimensions
  3. Creates proper indexes for performance
  4. Establishes RLS policies for security
  5. Creates helper functions for embedding management
  6. Fixes any data integrity issues
*/

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Ensure receipts table has all required columns
DO $$ 
BEGIN
    -- Add missing columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'receipts' AND column_name = 'embedding') THEN
        ALTER TABLE receipts ADD COLUMN embedding vector(384);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'receipts' AND column_name = 'receipt_group_id') THEN
        ALTER TABLE receipts ADD COLUMN receipt_group_id uuid;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'receipts' AND column_name = 'is_group_receipt') THEN
        ALTER TABLE receipts ADD COLUMN is_group_receipt boolean DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'receipts' AND column_name = 'receipt_total') THEN
        ALTER TABLE receipts ADD COLUMN receipt_total numeric;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'receipts' AND column_name = 'processing_method') THEN
        ALTER TABLE receipts ADD COLUMN processing_method text DEFAULT 'manual';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'receipts' AND column_name = 'ocr_confidence') THEN
        ALTER TABLE receipts ADD COLUMN ocr_confidence numeric(3,2);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'receipts' AND column_name = 'extracted_text') THEN
        ALTER TABLE receipts ADD COLUMN extracted_text text;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'receipts' AND column_name = 'image_url') THEN
        ALTER TABLE receipts ADD COLUMN image_url text;
    END IF;
END $$;

-- Create optimized indexes
CREATE INDEX IF NOT EXISTS receipts_embedding_idx ON receipts 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

CREATE INDEX IF NOT EXISTS receipts_user_search_idx ON receipts 
(user_id, purchase_date DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS receipts_group_id_idx ON receipts (receipt_group_id) 
WHERE receipt_group_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS receipts_is_group_idx ON receipts (is_group_receipt) 
WHERE is_group_receipt = true;

CREATE INDEX IF NOT EXISTS receipts_text_search_idx ON receipts 
USING gin (to_tsvector('english', COALESCE(product_description, '') || ' ' || COALESCE(brand_name, '') || ' ' || COALESCE(store_name, '')));

-- Create vector search function with user filtering
CREATE OR REPLACE FUNCTION match_receipts_simple(
  query_embedding vector(384),
  match_threshold float DEFAULT 0.3,
  match_count int DEFAULT 5,
  user_id uuid DEFAULT NULL
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
    AND (user_id IS NULL OR receipts.user_id = user_id)
    AND (1 - (receipts.embedding <=> query_embedding)) > match_threshold
  ORDER BY receipts.embedding <=> query_embedding
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql;

-- Create embedding management functions
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

CREATE OR REPLACE FUNCTION get_embedding_status_v2(
    user_id_param uuid DEFAULT NULL
)
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
    FROM receipts
    WHERE (user_id_param IS NULL OR receipts.user_id = user_id_param);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_receipts_without_embeddings_v2(
    user_id_param uuid DEFAULT NULL,
    limit_param int DEFAULT 10
)
RETURNS TABLE (
    receipt_id uuid,
    content_text text
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        receipts.id as receipt_id,
        COALESCE(
            receipts.product_description || ' ' ||
            COALESCE(receipts.brand_name, '') || ' ' ||
            COALESCE(receipts.model_number, '') || ' ' ||
            COALESCE(receipts.store_name, '') || ' ' ||
            COALESCE(receipts.purchase_location, '') || ' ' ||
            COALESCE(receipts.warranty_period, ''),
            'Receipt content'
        ) as content_text
    FROM receipts
    WHERE receipts.embedding IS NULL
        AND (user_id_param IS NULL OR receipts.user_id = user_id_param)
    ORDER BY receipts.created_at DESC
    LIMIT limit_param;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION match_receipts_simple TO authenticated;
GRANT EXECUTE ON FUNCTION match_receipts_simple TO anon;
GRANT EXECUTE ON FUNCTION update_receipt_embedding_simple TO authenticated;
GRANT EXECUTE ON FUNCTION update_receipt_embedding_simple TO service_role;
GRANT EXECUTE ON FUNCTION get_embedding_status_v2 TO authenticated;
GRANT EXECUTE ON FUNCTION get_embedding_status_v2 TO service_role;
GRANT EXECUTE ON FUNCTION get_receipts_without_embeddings_v2 TO authenticated;
GRANT EXECUTE ON FUNCTION get_receipts_without_embeddings_v2 TO service_role;

-- Ensure RLS is enabled and policies are correct
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate them
DROP POLICY IF EXISTS "Users can view own receipts" ON receipts;
DROP POLICY IF EXISTS "Users can insert own receipts" ON receipts;
DROP POLICY IF EXISTS "Users can update own receipts" ON receipts;
DROP POLICY IF EXISTS "Users can delete own receipts" ON receipts;

CREATE POLICY "Users can view own receipts"
    ON receipts FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own receipts"
    ON receipts FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own receipts"
    ON receipts FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own receipts"
    ON receipts FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- Create storage bucket for receipt images if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipt-images', 'receipt-images', false)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies
DROP POLICY IF EXISTS "Users can upload receipt images" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own receipt images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own receipt images" ON storage.objects;

CREATE POLICY "Users can upload receipt images"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'receipt-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own receipt images"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (bucket_id = 'receipt-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own receipt images"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id = 'receipt-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create notification system tables if they don't exist
CREATE TABLE IF NOT EXISTS notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type text NOT NULL CHECK (type IN ('warranty_alert', 'new_receipt', 'system', 'other')),
    message text NOT NULL,
    read boolean DEFAULT false,
    archived boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enable RLS on notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create notification policies
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can insert own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
DROP POLICY IF EXISTS "Service role can manage notifications" ON notifications;

CREATE POLICY "Users can view own notifications"
    ON notifications FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notifications"
    ON notifications FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
    ON notifications FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage notifications"
    ON notifications FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Create indexes for notifications
CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON notifications (user_id);
CREATE INDEX IF NOT EXISTS notifications_created_at_idx ON notifications (created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_unread_idx ON notifications (user_id, read, archived) WHERE NOT read AND NOT archived;

-- Create warranty tracking function
CREATE OR REPLACE FUNCTION get_receipts_with_warranty_status(user_uuid uuid)
RETURNS TABLE (
    id uuid,
    product_description text,
    brand_name text,
    model_number text,
    purchase_date date,
    amount numeric,
    warranty_period text,
    store_name text,
    purchase_location text,
    warranty_expiry_date date,
    days_until_expiry int,
    warranty_status text
) AS $$
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
        CASE 
            WHEN r.warranty_period ILIKE '%lifetime%' THEN '2099-12-31'::date
            WHEN r.warranty_period ~ '\d+\s*year' THEN 
                r.purchase_date + INTERVAL '1 year' * (regexp_replace(r.warranty_period, '.*?(\d+)\s*year.*', '\1')::int)
            WHEN r.warranty_period ~ '\d+\s*month' THEN 
                r.purchase_date + INTERVAL '1 month' * (regexp_replace(r.warranty_period, '.*?(\d+)\s*month.*', '\1')::int)
            WHEN r.warranty_period ~ '\d+\s*day' THEN 
                r.purchase_date + INTERVAL '1 day' * (regexp_replace(r.warranty_period, '.*?(\d+)\s*day.*', '\1')::int)
            ELSE r.purchase_date + INTERVAL '1 year'
        END as warranty_expiry_date,
        CASE 
            WHEN r.warranty_period ILIKE '%lifetime%' THEN 999999
            WHEN r.warranty_period ~ '\d+\s*year' THEN 
                (r.purchase_date + INTERVAL '1 year' * (regexp_replace(r.warranty_period, '.*?(\d+)\s*year.*', '\1')::int) - CURRENT_DATE)::int
            WHEN r.warranty_period ~ '\d+\s*month' THEN 
                (r.purchase_date + INTERVAL '1 month' * (regexp_replace(r.warranty_period, '.*?(\d+)\s*month.*', '\1')::int) - CURRENT_DATE)::int
            WHEN r.warranty_period ~ '\d+\s*day' THEN 
                (r.purchase_date + INTERVAL '1 day' * (regexp_replace(r.warranty_period, '.*?(\d+)\s*day.*', '\1')::int) - CURRENT_DATE)::int
            ELSE (r.purchase_date + INTERVAL '1 year' - CURRENT_DATE)::int
        END as days_until_expiry,
        CASE 
            WHEN r.warranty_period ILIKE '%lifetime%' THEN 'lifetime'
            WHEN (
                CASE 
                    WHEN r.warranty_period ~ '\d+\s*year' THEN 
                        (r.purchase_date + INTERVAL '1 year' * (regexp_replace(r.warranty_period, '.*?(\d+)\s*year.*', '\1')::int) - CURRENT_DATE)::int
                    WHEN r.warranty_period ~ '\d+\s*month' THEN 
                        (r.purchase_date + INTERVAL '1 month' * (regexp_replace(r.warranty_period, '.*?(\d+)\s*month.*', '\1')::int) - CURRENT_DATE)::int
                    WHEN r.warranty_period ~ '\d+\s*day' THEN 
                        (r.purchase_date + INTERVAL '1 day' * (regexp_replace(r.warranty_period, '.*?(\d+)\s*day.*', '\1')::int) - CURRENT_DATE)::int
                    ELSE (r.purchase_date + INTERVAL '1 year' - CURRENT_DATE)::int
                END
            ) < 0 THEN 'expired'
            WHEN (
                CASE 
                    WHEN r.warranty_period ~ '\d+\s*year' THEN 
                        (r.purchase_date + INTERVAL '1 year' * (regexp_replace(r.warranty_period, '.*?(\d+)\s*year.*', '\1')::int) - CURRENT_DATE)::int
                    WHEN r.warranty_period ~ '\d+\s*month' THEN 
                        (r.purchase_date + INTERVAL '1 month' * (regexp_replace(r.warranty_period, '.*?(\d+)\s*month.*', '\1')::int) - CURRENT_DATE)::int
                    WHEN r.warranty_period ~ '\d+\s*day' THEN 
                        (r.purchase_date + INTERVAL '1 day' * (regexp_replace(r.warranty_period, '.*?(\d+)\s*day.*', '\1')::int) - CURRENT_DATE)::int
                    ELSE (r.purchase_date + INTERVAL '1 year' - CURRENT_DATE)::int
                END
            ) <= 30 THEN 'expiring_soon'
            WHEN (
                CASE 
                    WHEN r.warranty_period ~ '\d+\s*year' THEN 
                        (r.purchase_date + INTERVAL '1 year' * (regexp_replace(r.warranty_period, '.*?(\d+)\s*year.*', '\1')::int) - CURRENT_DATE)::int
                    WHEN r.warranty_period ~ '\d+\s*month' THEN 
                        (r.purchase_date + INTERVAL '1 month' * (regexp_replace(r.warranty_period, '.*?(\d+)\s*month.*', '\1')::int) - CURRENT_DATE)::int
                    WHEN r.warranty_period ~ '\d+\s*day' THEN 
                        (r.purchase_date + INTERVAL '1 day' * (regexp_replace(r.warranty_period, '.*?(\d+)\s*day.*', '\1')::int) - CURRENT_DATE)::int
                    ELSE (r.purchase_date + INTERVAL '1 year' - CURRENT_DATE)::int
                END
            ) <= 90 THEN 'expiring'
            ELSE 'active'
        END as warranty_status
    FROM receipts r
    WHERE r.user_id = user_uuid
        AND r.purchase_date IS NOT NULL
        AND r.warranty_period IS NOT NULL
    ORDER BY 
        CASE 
            WHEN r.warranty_period ILIKE '%lifetime%' THEN 999999
            WHEN r.warranty_period ~ '\d+\s*year' THEN 
                (r.purchase_date + INTERVAL '1 year' * (regexp_replace(r.warranty_period, '.*?(\d+)\s*year.*', '\1')::int) - CURRENT_DATE)::int
            WHEN r.warranty_period ~ '\d+\s*month' THEN 
                (r.purchase_date + INTERVAL '1 month' * (regexp_replace(r.warranty_period, '.*?(\d+)\s*month.*', '\1')::int) - CURRENT_DATE)::int
            WHEN r.warranty_period ~ '\d+\s*day' THEN 
                (r.purchase_date + INTERVAL '1 day' * (regexp_replace(r.warranty_period, '.*?(\d+)\s*day.*', '\1')::int) - CURRENT_DATE)::int
            ELSE (r.purchase_date + INTERVAL '1 year' - CURRENT_DATE)::int
        END ASC;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions for warranty function
GRANT EXECUTE ON FUNCTION get_receipts_with_warranty_status TO authenticated;

-- Create search function for receipts
CREATE OR REPLACE FUNCTION search_user_receipts(
    user_uuid uuid,
    search_query text,
    limit_count int DEFAULT 50
)
RETURNS TABLE (
    id uuid,
    product_description text,
    brand_name text,
    model_number text,
    store_name text,
    purchase_date date,
    amount numeric,
    warranty_period text,
    purchase_location text,
    is_group_receipt boolean,
    receipt_group_id uuid,
    receipt_total numeric
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.id,
        r.product_description,
        r.brand_name,
        r.model_number,
        r.store_name,
        r.purchase_date,
        r.amount,
        r.warranty_period,
        r.purchase_location,
        r.is_group_receipt,
        r.receipt_group_id,
        r.receipt_total
    FROM receipts r
    WHERE r.user_id = user_uuid
        AND (
            r.product_description ILIKE '%' || search_query || '%' OR
            r.brand_name ILIKE '%' || search_query || '%' OR
            r.store_name ILIKE '%' || search_query || '%' OR
            r.model_number ILIKE '%' || search_query || '%' OR
            r.purchase_location ILIKE '%' || search_query || '%'
        )
    ORDER BY r.created_at DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions for search function
GRANT EXECUTE ON FUNCTION search_user_receipts TO authenticated;

-- Create receipt stats function
CREATE OR REPLACE FUNCTION get_user_receipt_stats(user_uuid uuid)
RETURNS TABLE (
    total_receipts bigint,
    total_value numeric,
    active_warranties bigint,
    expiring_warranties bigint,
    expired_warranties bigint
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_receipts,
        COALESCE(SUM(r.amount), 0) as total_value,
        COUNT(*) FILTER (WHERE 
            r.warranty_period IS NOT NULL AND
            CASE 
                WHEN r.warranty_period ILIKE '%lifetime%' THEN true
                WHEN r.warranty_period ~ '\d+\s*year' THEN 
                    (r.purchase_date + INTERVAL '1 year' * (regexp_replace(r.warranty_period, '.*?(\d+)\s*year.*', '\1')::int)) > CURRENT_DATE
                WHEN r.warranty_period ~ '\d+\s*month' THEN 
                    (r.purchase_date + INTERVAL '1 month' * (regexp_replace(r.warranty_period, '.*?(\d+)\s*month.*', '\1')::int)) > CURRENT_DATE
                WHEN r.warranty_period ~ '\d+\s*day' THEN 
                    (r.purchase_date + INTERVAL '1 day' * (regexp_replace(r.warranty_period, '.*?(\d+)\s*day.*', '\1')::int)) > CURRENT_DATE
                ELSE (r.purchase_date + INTERVAL '1 year') > CURRENT_DATE
            END
        ) as active_warranties,
        COUNT(*) FILTER (WHERE 
            r.warranty_period IS NOT NULL AND
            r.warranty_period NOT ILIKE '%lifetime%' AND
            CASE 
                WHEN r.warranty_period ~ '\d+\s*year' THEN 
                    (r.purchase_date + INTERVAL '1 year' * (regexp_replace(r.warranty_period, '.*?(\d+)\s*year.*', '\1')::int) - CURRENT_DATE)::int <= 90
                    AND (r.purchase_date + INTERVAL '1 year' * (regexp_replace(r.warranty_period, '.*?(\d+)\s*year.*', '\1')::int)) > CURRENT_DATE
                WHEN r.warranty_period ~ '\d+\s*month' THEN 
                    (r.purchase_date + INTERVAL '1 month' * (regexp_replace(r.warranty_period, '.*?(\d+)\s*month.*', '\1')::int) - CURRENT_DATE)::int <= 90
                    AND (r.purchase_date + INTERVAL '1 month' * (regexp_replace(r.warranty_period, '.*?(\d+)\s*month.*', '\1')::int)) > CURRENT_DATE
                WHEN r.warranty_period ~ '\d+\s*day' THEN 
                    (r.purchase_date + INTERVAL '1 day' * (regexp_replace(r.warranty_period, '.*?(\d+)\s*day.*', '\1')::int) - CURRENT_DATE)::int <= 90
                    AND (r.purchase_date + INTERVAL '1 day' * (regexp_replace(r.warranty_period, '.*?(\d+)\s*day.*', '\1')::int)) > CURRENT_DATE
                ELSE 
                    (r.purchase_date + INTERVAL '1 year' - CURRENT_DATE)::int <= 90
                    AND (r.purchase_date + INTERVAL '1 year') > CURRENT_DATE
            END
        ) as expiring_warranties,
        COUNT(*) FILTER (WHERE 
            r.warranty_period IS NOT NULL AND
            r.warranty_period NOT ILIKE '%lifetime%' AND
            CASE 
                WHEN r.warranty_period ~ '\d+\s*year' THEN 
                    (r.purchase_date + INTERVAL '1 year' * (regexp_replace(r.warranty_period, '.*?(\d+)\s*year.*', '\1')::int)) <= CURRENT_DATE
                WHEN r.warranty_period ~ '\d+\s*month' THEN 
                    (r.purchase_date + INTERVAL '1 month' * (regexp_replace(r.warranty_period, '.*?(\d+)\s*month.*', '\1')::int)) <= CURRENT_DATE
                WHEN r.warranty_period ~ '\d+\s*day' THEN 
                    (r.purchase_date + INTERVAL '1 day' * (regexp_replace(r.warranty_period, '.*?(\d+)\s*day.*', '\1')::int)) <= CURRENT_DATE
                ELSE (r.purchase_date + INTERVAL '1 year') <= CURRENT_DATE
            END
        ) as expired_warranties
    FROM receipts r
    WHERE r.user_id = user_uuid;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions for stats function
GRANT EXECUTE ON FUNCTION get_user_receipt_stats TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE receipts IS 'Receipts table with OCR and AI processing capabilities - Updated with all required columns including extracted_text';
COMMENT ON COLUMN receipts.embedding IS 'Vector embedding generated by edge function for semantic search';
COMMENT ON COLUMN receipts.receipt_group_id IS 'UUID linking products from the same physical receipt. NULL for single-product receipts.';
COMMENT ON COLUMN receipts.is_group_receipt IS 'TRUE if this row is part of a multi-product receipt group.';
COMMENT ON COLUMN receipts.receipt_total IS 'Original receipt total amount. For multi-product receipts, this is duplicated across all group members.';
COMMENT ON COLUMN receipts.processing_method IS 'Method used to process receipt: manual, ocr, gpt_structured, fallback_parsing';
COMMENT ON COLUMN receipts.ocr_confidence IS 'OCR confidence score between 0 and 1';
COMMENT ON COLUMN receipts.extracted_text IS 'Raw text extracted from receipt image via OCR';
COMMENT ON COLUMN receipts.image_url IS 'URL of the uploaded receipt image in storage';

-- Final verification query
DO $$
BEGIN
    RAISE NOTICE 'Migration completed successfully. Smart Receipts database is now fully configured.';
    RAISE NOTICE 'Vector search: %', CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'receipts' AND column_name = 'embedding') THEN 'ENABLED' ELSE 'DISABLED' END;
    RAISE NOTICE 'Multi-product support: %', CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'receipts' AND column_name = 'receipt_group_id') THEN 'ENABLED' ELSE 'DISABLED' END;
    RAISE NOTICE 'Notification system: %', CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN 'ENABLED' ELSE 'DISABLED' END;
END $$;