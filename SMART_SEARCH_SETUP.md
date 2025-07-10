# Smart Search Feature Setup

## Overview

The Smart Search feature uses AI-powered vector embeddings to provide semantic search capabilities for your receipt collection. This allows users to find receipts by meaning rather than exact text matches.

## Features

- **Vector Similarity Search**: Uses OpenAI embeddings to understand search intent
- **Fallback Search**: Automatically falls back to text-based search if vector search fails
- **Real-time Results**: Shows search results with relevance scores
- **Mobile Responsive**: Clean, responsive design that works on all devices
- **Error Handling**: Graceful error handling with user-friendly messages

## Database Setup

### 1. Run the Vector Migration

Apply the vector search migration to your Supabase database:

```sql
-- This migration is in: supabase/migrations/20250103000000_add_vector_search.sql
-- It will:
-- 1. Enable the pgvector extension
-- 2. Add embedding column to receipts table
-- 3. Create vector similarity search functions
-- 4. Set up indexes for performance
```

### 2. Enable pgvector Extension

In your Supabase dashboard:
1. Go to Database > Extensions
2. Enable the `vector` extension

## Edge Function Setup

The Smart Search feature uses a Supabase Edge Function located at:
`supabase/functions/smart-search/index.ts`

### Deploy the Edge Function

```bash
# Deploy the smart search function
supabase functions deploy smart-search

# Set required environment variables
supabase secrets set SUPABASE_URL=your-supabase-url
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Frontend Integration

The Smart Search component is integrated into the Dashboard component and includes:

### Search Input
- Clean, accessible search input with loading states
- Real-time search as you type
- Clear button to reset search

### Results Display
- Relevance scores for each result
- Rich metadata display (brand, date, amount, warranty)
- Responsive card layout
- Empty states and error handling

### Search Logic
1. **Vector Search**: First attempts AI-powered semantic search
2. **Text Search**: Falls back to database text search
3. **Basic Search**: Final fallback to simple SQL LIKE queries

## Usage

### For Users

1. Navigate to the Dashboard
2. Find the "Smart Search" section
3. Type your search query (e.g., "laptop computer", "kitchen appliance")
4. View results with relevance scores
5. Click on results to view details

### Search Examples

- **"laptop computer"** - Finds MacBooks, gaming notebooks, tablets
- **"kitchen appliance"** - Finds blenders, toasters, microwaves
- **"electronics warranty"** - Finds items with extended warranties
- **"expensive purchase"** - Finds high-value items

## Technical Details

### Vector Embeddings
- Uses OpenAI's `gte-small` model (384 dimensions)
- Embeddings are generated for receipt content including:
  - Product description
  - Brand name
  - Store name
  - Extracted OCR text

### Search Algorithm
1. Generate embedding for search query
2. Perform cosine similarity search against receipt embeddings
3. Return top 5 results with similarity scores > 0.3
4. Fall back to text search if no vector results found

### Performance
- Vector index using IVFFlat with 100 lists
- Optimized for datasets up to 1M receipts
- Sub-second search response times

## Troubleshooting

### Common Issues

1. **No search results**: Check if receipts have embeddings generated
2. **Slow search**: Verify vector index is created properly
3. **Edge function errors**: Check environment variables are set

### Debug Steps

1. Check Supabase logs for edge function errors
2. Verify pgvector extension is enabled
3. Ensure receipts table has embedding column
4. Test fallback search functionality

## Future Enhancements

- **Batch Embedding Generation**: Process existing receipts in batches
- **Improved Relevance**: Fine-tune similarity thresholds
- **Search Filters**: Add date, amount, and category filters
- **Search History**: Save and suggest previous searches
- **Advanced Analytics**: Track search patterns and improve results

## Support

For issues with the Smart Search feature:
1. Check the browser console for JavaScript errors
2. Review Supabase edge function logs
3. Verify database migrations are applied
4. Test with simple search queries first 