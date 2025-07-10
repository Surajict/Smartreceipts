# Deploy Smart Search Fix

## Steps to Fix Smart Search Functionality

### 1. Apply the New Migration

Run this command to apply the embedding trigger migration:

```bash
cd /home/biswan02/Smart_Receipts_Suraj_V5/Smartreceipts
supabase db push
```

### 2. Deploy the Updated Edge Function

```bash
supabase functions deploy smart-search
```

### 3. Backfill Existing Receipts with Embeddings

After the migration is applied, run this SQL in your Supabase dashboard:

```sql
-- Run this to generate embeddings for existing receipts
SELECT backfill_receipt_embeddings();
```

**Note**: This may take a few minutes depending on how many receipts you have.

### 4. Test the Smart Search

1. Go to your app: http://localhost:5174/
2. Add a new receipt (the embedding will be generated automatically)
3. Try searching for it using the Smart Search feature

## What This Fix Does

✅ **Automatic Embeddings**: New receipts will automatically get embeddings when added
✅ **Backfill Existing**: Existing receipts will get embeddings when you run the backfill function
✅ **Better Error Handling**: The system gracefully handles embedding failures
✅ **Improved Search**: Uses proper Supabase AI integration

## Troubleshooting

If Smart Search still doesn't work:

1. Check if embeddings exist:
```sql
SELECT COUNT(*) as total_receipts, 
       COUNT(embedding) as receipts_with_embeddings 
FROM receipts;
```

2. If no embeddings exist, make sure Supabase AI is enabled in your project
3. Check the edge function logs in Supabase dashboard

## Technical Details

- **Trigger**: Automatically generates embeddings on INSERT/UPDATE
- **Model**: Uses OpenAI's text-embedding-3-small (384 dimensions)
- **Fallback**: Falls back to text search if vector search fails
- **Performance**: Optimized with proper indexing 