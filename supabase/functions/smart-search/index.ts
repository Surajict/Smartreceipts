import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SmartSearchRequest {
  query: string;
  userId: string;
  limit?: number;
  threshold?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { query, userId, limit = 5, threshold = 0.3 }: SmartSearchRequest = await req.json()

    if (!query || !userId) {
      return new Response(
        JSON.stringify({ error: 'Missing query or userId' }),
        { status: 400, headers: corsHeaders }
      )
    }

    console.log(`Smart search for user ${userId}: "${query}"`)

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    let embedding: number[] = []

    // Generate embedding for the search query
    try {
      // Try OpenAI API first
      const openaiKey = Deno.env.get('OPENAI_API_KEY')
      
      if (openaiKey) {
        const openaiResponse = await fetch('https://api.openai.com/v1/embeddings', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'text-embedding-3-small',
            input: query,
            dimensions: 384
          }),
        })

        if (openaiResponse.ok) {
          const openaiData = await openaiResponse.json()
          embedding = openaiData.data[0].embedding
          console.log('Generated query embedding using OpenAI API')
        }
      }

      // If OpenAI failed, try Supabase AI
      if (embedding.length === 0) {
        const { data: embeddingData, error: embeddingError } = await supabase.functions.invoke('embed', {
          body: { 
            input: query,
            model: 'text-embedding-3-small'
          }
        })

        if (!embeddingError && embeddingData?.embedding) {
          embedding = embeddingData.embedding
          console.log('Generated query embedding using Supabase AI')
        }
      }

      if (embedding.length === 0) {
        throw new Error('Failed to generate embedding for search query')
      }

    } catch (embeddingError) {
      console.error('Embedding generation failed:', embeddingError)
      
      // Fallback to text search with user filtering
      console.log('Falling back to text search')
      const { data: textResults, error: textError } = await supabase
        .from('receipts')
        .select('id, product_description, brand_name, model_number, purchase_date, amount, warranty_period, store_name')
        .eq('user_id', userId)
        .or(`product_description.ilike.%${query}%,brand_name.ilike.%${query}%,model_number.ilike.%${query}%,store_name.ilike.%${query}%`)
        .limit(limit)

      if (textError) {
        throw new Error(`Text search failed: ${textError.message}`)
      }

      const fallbackResults = (textResults || []).map(receipt => ({
        id: receipt.id,
        title: receipt.product_description || 'Unknown Product',
        brand: receipt.brand_name || 'Unknown Brand',
        model: receipt.model_number,
        purchaseDate: receipt.purchase_date,
        amount: receipt.amount,
        warrantyPeriod: receipt.warranty_period || 'Unknown',
        relevanceScore: 0.7 // Mock score for text search
      }))

      return new Response(
        JSON.stringify({ 
          results: fallbackResults,
          fallback: true,
          message: 'Used text search due to embedding generation failure'
        }),
        { headers: corsHeaders }
      )
    }

    // Perform vector similarity search using the database function with user filtering
    try {
      const { data: vectorResults, error: vectorError } = await supabase
        .rpc('match_receipts_simple', {
          query_embedding: embedding,
          match_threshold: threshold,
          match_count: limit,
          user_id: userId  // Pass the user ID to filter results
        })

      if (vectorError) {
        throw new Error(`Vector search failed: ${vectorError.message}`)
      }

      const results = (vectorResults || []).map(receipt => ({
        id: receipt.id,
        title: receipt.product_description || 'Unknown Product',
        brand: receipt.brand_name || 'Unknown Brand',
        model: receipt.model_number,
        purchaseDate: receipt.purchase_date,
        amount: receipt.amount,
        warrantyPeriod: receipt.warranty_period || 'Unknown',
        relevanceScore: receipt.similarity || 0.5 // Use actual similarity score
      }))

      console.log(`Found ${results.length} results for user ${userId}, query "${query}"`)

      return new Response(
        JSON.stringify({ results }),
        { headers: corsHeaders }
      )

    } catch (vectorError) {
      console.error('Vector search failed:', vectorError)
      
      // Fallback to text search with user filtering
      console.log('Falling back to text search due to vector search failure')
      const { data: textResults, error: textError } = await supabase
        .from('receipts')
        .select('id, product_description, brand_name, model_number, purchase_date, amount, warranty_period, store_name')
        .eq('user_id', userId)
        .or(`product_description.ilike.%${query}%,brand_name.ilike.%${query}%,model_number.ilike.%${query}%,store_name.ilike.%${query}%`)
        .limit(limit)

      if (textError) {
        throw new Error(`Both vector and text search failed: ${textError.message}`)
      }

      const fallbackResults = (textResults || []).map(receipt => ({
        id: receipt.id,
        title: receipt.product_description || 'Unknown Product',
        brand: receipt.brand_name || 'Unknown Brand',
        model: receipt.model_number,
        purchaseDate: receipt.purchase_date,
        amount: receipt.amount,
        warrantyPeriod: receipt.warranty_period || 'Unknown',
        relevanceScore: 0.7 // Mock score for text search
      }))

      return new Response(
        JSON.stringify({ 
          results: fallbackResults,
          fallback: true,
          message: 'Used text search due to vector search failure'
        }),
        { headers: corsHeaders }
      )
    }

  } catch (error) {
    console.error('Smart search error:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Search failed',
        details: error.toString()
      }),
      { status: 500, headers: corsHeaders }
    )
  }
})