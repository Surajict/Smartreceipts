# Smart Search Embedding Deployment Guide

## Problem
The Smart Search feature isn't working because:
1. The embedding column in the receipts table is empty (NULL values)
2. The edge functions need to be deployed to Supabase
3. The database migrations need to be run

## Solution Steps

### Step 1: Run Database Migrations

Go to your **Supabase Dashboard** → **Database** → **SQL Editor** and run these migrations:

#### Migration 1: Simple Embedding Setup
```sql
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
```

#### Migration 2: Vector Search Function
```sql
/*
  # Add Vector Search Function
  
  This migration adds a simple vector search function that can be called from the edge function.
*/

-- Create a function to match receipts using vector similarity
CREATE OR REPLACE FUNCTION match_receipts_simple(
  query_embedding vector(384),
  match_threshold float DEFAULT 0.3,
  match_count int DEFAULT 5
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
    AND (1 - (receipts.embedding <=> query_embedding)) > match_threshold
  ORDER BY receipts.embedding <=> query_embedding
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql;
```

### Step 2: Deploy Edge Functions

Since you don't have Supabase CLI, you'll need to deploy via the Dashboard:

#### Deploy generate-embedding Function
1. Go to **Supabase Dashboard** → **Edge Functions**
2. Create or update the **generate-embedding** function
3. Copy the code from `supabase/functions/generate-embedding/index.ts`
4. Save/Deploy

#### Deploy/Update smart-search Function
1. Go to **Supabase Dashboard** → **Edge Functions**
2. Update the **smart-search** function
3. Copy the updated code from `supabase/functions/smart-search/index.ts`
4. Save/Deploy

### Step 3: Set Environment Variables

Make sure these environment variables are set in your Supabase project:

1. Go to **Supabase Dashboard** → **Settings** → **API**
2. Copy your **Project URL** and **anon key**
3. Make sure your `.env` file has:
   ```
   VITE_SUPABASE_URL=your_project_url
   VITE_SUPABASE_ANON_KEY=your_anon_key
   ```

4. For the edge functions, you may need to set:
   - `OPENAI_API_KEY` (if you want to use OpenAI for embeddings)
   - `SUPABASE_SERVICE_ROLE_KEY` (for the edge functions to access the database)

### Step 4: Generate Embeddings for Existing Receipts

1. Open your Smart Receipts app
2. Go to the Dashboard
3. Look for the Smart Search section
4. If you see a yellow notification about receipts needing to be indexed, click **"Index Receipts"**
5. Wait for the process to complete

### Step 5: Test Smart Search

1. After indexing is complete, try searching for something like "laptop" or "electronics"
2. The search should now work with AI-powered semantic search

## Troubleshooting

### If embeddings fail to generate:
1. Check the browser console for errors
2. Verify the edge functions are deployed
3. Check that environment variables are set correctly

### If search still doesn't work:
1. Check that the database migrations ran successfully
2. Verify that the embedding column has data (not NULL)
3. Check the edge function logs in Supabase Dashboard

### If you get API errors:
1. Make sure your OpenAI API key is valid (if using OpenAI)
2. Check that Supabase service role key is set for edge functions
3. Verify your Supabase project has the pgvector extension enabled

## Success Indicators

✅ Database migrations run without errors
✅ Edge functions deploy successfully  
✅ Embedding column gets populated with vector data
✅ Smart Search returns relevant results
✅ Search works for semantic queries (e.g., "laptop" finds "MacBook") 