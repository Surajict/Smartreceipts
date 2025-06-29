import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
}

interface SearchRequest {
  query: string;
  userId: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    })
  }

  try {
    const { query, userId }: SearchRequest = await req.json()

    if (!query || !userId) {
      return new Response(
        JSON.stringify({ error: "Query and userId are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    // Generate embedding for the search query
    const model = new Supabase.ai.Session('gte-small')
    const embedding = await model.run(query, { mean_pool: true, normalize: true })

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const { createClient } = await import('npm:@supabase/supabase-js@2')
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Perform vector similarity search on receipts
    // Note: This assumes you have a vector column in your receipts table
    // For now, we'll do a text-based search as a fallback
    const { data: receipts, error } = await supabase
      .from('receipts')
      .select('*')
      .eq('user_id', userId)
      .or(`product_description.ilike.%${query}%,brand_name.ilike.%${query}%,model_number.ilike.%${query}%`)
      .limit(5)

    if (error) {
      console.error('Search error:', error)
      return new Response(
        JSON.stringify({ error: "Search failed" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    // Format results for display
    const results = receipts.map(receipt => ({
      id: receipt.id,
      title: receipt.product_description,
      brand: receipt.brand_name,
      model: receipt.model_number,
      purchaseDate: receipt.purchase_date,
      amount: receipt.amount,
      warrantyPeriod: receipt.warranty_period,
      relevanceScore: 0.8 // Mock score for now
    }))

    return new Response(
      JSON.stringify({ results }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    )

  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    )
  }
})