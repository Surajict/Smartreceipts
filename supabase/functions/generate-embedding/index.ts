import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface GenerateEmbeddingRequest {
  content: string;
  receiptId?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Parse the request
    const { content, receiptId }: GenerateEmbeddingRequest = await req.json()

    if (!content) {
      return new Response(
        JSON.stringify({ error: 'Missing content' }),
        { status: 400, headers: corsHeaders }
      )
    }

    console.log(`Generating embedding for content: "${content.substring(0, 100)}..."`)

    let embedding: number[] = []

    // Try OpenAI API first
    const openaiKey = Deno.env.get('OPENAI_API_KEY')
    
    if (openaiKey) {
      try {
        const openaiResponse = await fetch('https://api.openai.com/v1/embeddings', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'text-embedding-3-small',
            input: content,
            dimensions: 384
          }),
        })

        if (openaiResponse.ok) {
          const openaiData = await openaiResponse.json()
          embedding = openaiData.data[0].embedding
          console.log('Successfully generated embedding using OpenAI API')
        } else {
          throw new Error(`OpenAI API error: ${openaiResponse.status}`)
        }
      } catch (openaiError) {
        console.error('OpenAI API failed:', openaiError)
      }
    }

    // If OpenAI failed, try Supabase AI
    if (embedding.length === 0) {
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        const supabase = createClient(supabaseUrl, supabaseKey)

        const { data: embeddingData, error: embeddingError } = await supabase.functions.invoke('embed', {
          body: { 
            input: content,
            model: 'text-embedding-3-small'
          }
        })

        if (!embeddingError && embeddingData?.embedding) {
          embedding = embeddingData.embedding
          console.log('Successfully generated embedding using Supabase AI')
        } else {
          throw new Error('Supabase AI failed')
        }
      } catch (supabaseError) {
        console.error('Supabase AI failed:', supabaseError)
      }
    }

    if (embedding.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Failed to generate embedding with both OpenAI and Supabase AI' }),
        { status: 500, headers: corsHeaders }
      )
    }

    // If receiptId is provided, update the receipt with the embedding
    if (receiptId) {
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        const supabase = createClient(supabaseUrl, supabaseKey)

        const { error: updateError } = await supabase
          .rpc('update_receipt_embedding_simple', {
            receipt_id: receiptId,
            new_embedding: embedding
          })

        if (updateError) {
          console.error('Failed to update receipt embedding:', updateError)
          return new Response(
            JSON.stringify({ 
              embedding,
              warning: 'Generated embedding but failed to update receipt'
            }),
            { headers: corsHeaders }
          )
        }

        console.log(`Successfully updated receipt ${receiptId} with embedding`)
      } catch (updateError) {
        console.error('Error updating receipt:', updateError)
      }
    }

    return new Response(
      JSON.stringify({ embedding }),
      { headers: corsHeaders }
    )

  } catch (error) {
    console.error('Generate embedding error:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to generate embedding',
        details: error.toString()
      }),
      { status: 500, headers: corsHeaders }
    )
  }
}) 