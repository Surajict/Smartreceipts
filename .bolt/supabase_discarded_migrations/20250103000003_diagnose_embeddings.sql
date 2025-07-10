/*
  # Diagnostic Script for Embedding Issues
  
  This script will help us understand what's happening with embeddings
*/

-- Check if the trigger exists
SELECT 
  trigger_name,
  event_manipulation,
  action_statement,
  action_timing
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_generate_receipt_embedding';

-- Check if the function exists
SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines 
WHERE routine_name = 'generate_receipt_embedding';

-- Check if pgvector extension is enabled
SELECT 
  extname,
  extversion
FROM pg_extension 
WHERE extname = 'vector';

-- Check if we have any receipts with embeddings
SELECT 
  COUNT(*) as total_receipts,
  COUNT(embedding) as receipts_with_embeddings,
  COUNT(*) - COUNT(embedding) as receipts_without_embeddings
FROM receipts;

-- Check if Supabase AI functions are available
SELECT 
  routine_name
FROM information_schema.routines 
WHERE routine_name LIKE '%openai%' OR routine_name LIKE '%embed%';

-- Test a simple embedding generation (this will fail if AI isn't available)
DO $$
DECLARE
  test_embedding vector(384);
BEGIN
  BEGIN
    SELECT ai.openai_embed(
      'text-embedding-3-small',
      'test text',
      dimensions => 384
    ) INTO test_embedding;
    
    RAISE NOTICE 'Supabase AI is working! Test embedding generated successfully.';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Supabase AI is not available: %', SQLERRM;
  END;
END $$; 