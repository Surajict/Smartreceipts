/*
  # Complete Warranty Claims System Migration

  This migration consolidates all warranty claims functionality into a single comprehensive setup:
  
  1. Creates warranty_claims table with all necessary columns
  2. Sets up Row Level Security (RLS) policies
  3. Creates indexes for optimal performance
  4. Implements automatic claim ID generation system
  5. Sets up trigger functions for automated workflows
  6. Creates statistics function for dashboard integration
  7. Handles existing data migration safely

  Features included:
  - Unique alphanumeric claim IDs (format: WC-XXXXXX)
  - User name and email tracking
  - Comprehensive receipt and product information
  - Webhook response storage
  - Status tracking (submitted/completed)
  - Automatic timestamp management
  - Performance-optimized indexing
*/

-- Create warranty_claims table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'warranty_claims') THEN
        CREATE TABLE warranty_claims (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            claim_id TEXT UNIQUE,
            user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
            user_name TEXT,
            user_email TEXT,
            receipt_id UUID REFERENCES receipts(id) ON DELETE SET NULL,
            product_name TEXT NOT NULL,
            brand_name TEXT,
            model_number TEXT,
            warranty_period TEXT,
            amount DECIMAL(10,2),
            receipt_image_url TEXT,
            store_name TEXT,
            purchase_location TEXT,
            issue_description TEXT NOT NULL,
            webhook_response TEXT,
            status TEXT DEFAULT 'submitted' CHECK (status IN ('submitted', 'completed')),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        RAISE NOTICE 'Created warranty_claims table';
    ELSE
        RAISE NOTICE 'warranty_claims table already exists';
    END IF;
END $$;

-- Add missing columns to existing table (safe for both new and existing tables)
ALTER TABLE warranty_claims 
ADD COLUMN IF NOT EXISTS claim_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS user_name TEXT,
ADD COLUMN IF NOT EXISTS user_email TEXT;

-- Create performance indexes
CREATE INDEX IF NOT EXISTS idx_warranty_claims_user_id ON warranty_claims(user_id);
CREATE INDEX IF NOT EXISTS idx_warranty_claims_receipt_id ON warranty_claims(receipt_id);
CREATE INDEX IF NOT EXISTS idx_warranty_claims_status ON warranty_claims(status);
CREATE INDEX IF NOT EXISTS idx_warranty_claims_created_at ON warranty_claims(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_warranty_claims_claim_id ON warranty_claims(claim_id);

-- Enable Row Level Security
ALTER TABLE warranty_claims ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (with conflict handling)
DO $$
BEGIN
    -- Policy for viewing own warranty claims
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'warranty_claims' 
        AND policyname = 'Users can view their own warranty claims'
    ) THEN
        CREATE POLICY "Users can view their own warranty claims" 
            ON warranty_claims FOR SELECT 
            USING (auth.uid() = user_id);
    END IF;

    -- Policy for inserting own warranty claims
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'warranty_claims' 
        AND policyname = 'Users can insert their own warranty claims'
    ) THEN
        CREATE POLICY "Users can insert their own warranty claims" 
            ON warranty_claims FOR INSERT 
            WITH CHECK (auth.uid() = user_id);
    END IF;

    -- Policy for updating own warranty claims
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'warranty_claims' 
        AND policyname = 'Users can update their own warranty claims'
    ) THEN
        CREATE POLICY "Users can update their own warranty claims" 
            ON warranty_claims FOR UPDATE 
            USING (auth.uid() = user_id);
    END IF;
END $$;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_warranty_claims_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at (with conflict handling)
DROP TRIGGER IF EXISTS warranty_claims_updated_at ON warranty_claims;
CREATE TRIGGER warranty_claims_updated_at
    BEFORE UPDATE ON warranty_claims
    FOR EACH ROW
    EXECUTE FUNCTION update_warranty_claims_updated_at();

-- Function to generate unique alphanumeric claim IDs
CREATE OR REPLACE FUNCTION generate_claim_id()
RETURNS TEXT AS $$
DECLARE
    new_claim_id TEXT;
    exists_check INTEGER;
BEGIN
    LOOP
        -- Generate 8-character alphanumeric ID (format: WC-XXXXXX)
        new_claim_id := 'WC-' || upper(
            substring(
                encode(gen_random_bytes(4), 'base64'),
                1, 6
            )
        );
        
        -- Replace any non-alphanumeric characters with random letters
        new_claim_id := regexp_replace(new_claim_id, '[^A-Z0-9-]', chr(65 + floor(random() * 26)::int), 'g');
        
        -- Check if this ID already exists
        SELECT COUNT(*) INTO exists_check 
        FROM warranty_claims 
        WHERE warranty_claims.claim_id = new_claim_id;
        
        -- If unique, break the loop
        IF exists_check = 0 THEN
            EXIT;
        END IF;
    END LOOP;
    
    RETURN new_claim_id;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically set claim_id on insert
CREATE OR REPLACE FUNCTION warranty_claims_set_claim_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.claim_id IS NULL THEN
        NEW.claim_id := generate_claim_id();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic claim_id generation (with conflict handling)
DROP TRIGGER IF EXISTS warranty_claims_claim_id_trigger ON warranty_claims;
CREATE TRIGGER warranty_claims_claim_id_trigger
    BEFORE INSERT ON warranty_claims
    FOR EACH ROW
    EXECUTE FUNCTION warranty_claims_set_claim_id();

-- Function to get user warranty claims statistics for dashboard
CREATE OR REPLACE FUNCTION get_user_warranty_claims_stats(user_uuid UUID)
RETURNS TABLE (
    total_claims INTEGER,
    submitted_claims INTEGER,
    completed_claims INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_claims,
        COUNT(*) FILTER (WHERE status = 'submitted')::INTEGER as submitted_claims,
        COUNT(*) FILTER (WHERE status = 'completed')::INTEGER as completed_claims
    FROM warranty_claims 
    WHERE user_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update existing records with user information (safe migration)
UPDATE warranty_claims 
SET 
    user_name = COALESCE(
        (SELECT raw_user_meta_data->>'full_name' FROM auth.users WHERE id = warranty_claims.user_id),
        (SELECT raw_user_meta_data->>'name' FROM auth.users WHERE id = warranty_claims.user_id),
        user_name,
        ''
    ),
    user_email = COALESCE(
        (SELECT email FROM auth.users WHERE id = warranty_claims.user_id),
        user_email,
        ''
    )
WHERE (user_name IS NULL OR user_email IS NULL OR user_name = '' OR user_email = '');

-- Generate claim IDs for existing records that don't have them
UPDATE warranty_claims 
SET claim_id = generate_claim_id()
WHERE claim_id IS NULL;

-- Create a comment to document the migration
COMMENT ON TABLE warranty_claims IS 'Comprehensive warranty claims system with automated claim ID generation, user tracking, and webhook response storage';
COMMENT ON COLUMN warranty_claims.claim_id IS 'Unique alphanumeric claim identifier (format: WC-XXXXXX)';
COMMENT ON COLUMN warranty_claims.user_name IS 'Full name of the user who submitted the claim';
COMMENT ON COLUMN warranty_claims.user_email IS 'Email address of the user who submitted the claim';
COMMENT ON COLUMN warranty_claims.webhook_response IS 'Response from the warranty processing webhook/n8n workflow';
COMMENT ON FUNCTION get_user_warranty_claims_stats(UUID) IS 'Returns warranty claims statistics for dashboard display';
