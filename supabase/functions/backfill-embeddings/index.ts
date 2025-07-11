import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface BackfillRequest {
  batchSize?: number;
  userId?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { batchSize = 5, userId }: BackfillRequest = await req.json()

    console.log(`Starting backfill process for ${userId ? 'user ' + userId : 'all users'}, batch size: ${batchSize}`)

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    })

    // Get receipts without embeddings using the new v2 function
    const { data: receiptsData, error: receiptsError } = await supabase
      .rpc('get_receipts_without_embeddings_v2', {
        user_id_param: userId || null,
        limit_param: batchSize
      })

    if (receiptsError) {
      console.error('Error fetching receipts without embeddings:', receiptsError)
      throw new Error(`Failed to fetch receipts: ${receiptsError.message}`)
    }

    if (!receiptsData || receiptsData.length === 0) {
      console.log('No receipts found without embeddings')
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No receipts need embedding generation',
          processed: 0,
          successful: 0,
          errors: 0,
          remaining: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Found ${receiptsData.length} receipts without embeddings`)

    const results = []
    let successful = 0
    let errors = 0

    // Process each receipt
    for (const receipt of receiptsData) {
      try {
        console.log(`Processing receipt ${receipt.receipt_id}`)

        // Call the generate-embedding function
        const { data: embeddingResult, error: embeddingError } = await supabase.functions.invoke('generate-embedding', {
          body: {
            receiptId: receipt.receipt_id,
            content: receipt.content_text
          }
        })

        if (embeddingError) {
          console.error(`Error generating embedding for receipt ${receipt.receipt_id}:`, embeddingError)
          results.push({
            receiptId: receipt.receipt_id,
            status: 'error',
            error: embeddingError.message || 'Unknown error'
          })
          errors++
        } else if (embeddingResult?.success) {
          console.log(`Successfully generated embedding for receipt ${receipt.receipt_id}`)
          results.push({
            receiptId: receipt.receipt_id,
            status: 'success'
          })
          successful++
        } else {
          console.error(`Unexpected response for receipt ${receipt.receipt_id}:`, embeddingResult)
          results.push({
            receiptId: receipt.receipt_id,
            status: 'error',
            error: 'Unexpected response from embedding generation'
          })
          errors++
        }
      } catch (error: any) {
        console.error(`Exception processing receipt ${receipt.receipt_id}:`, error)
        results.push({
          receiptId: receipt.receipt_id,
          status: 'error',
          error: error.message || 'Unknown exception'
        })
        errors++
      }
    }

    // Get remaining count using the new v2 function
    const { data: statusData, error: statusError } = await supabase
      .rpc('get_embedding_status_v2', {
        user_id_param: userId || null
      })

    let remaining = 0
    if (!statusError && statusData && statusData.length > 0) {
      remaining = statusData[0].receipts_without_embeddings || 0
    }

    console.log(`Backfill completed: ${successful} successful, ${errors} errors, ${remaining} remaining`)

    return new Response(
      JSON.stringify({
        success: true,
        processed: receiptsData.length,
        successful,
        errors,
        remaining,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Error in backfill-embeddings function:', error)
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Backfill failed',
        details: error.toString()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
}) 