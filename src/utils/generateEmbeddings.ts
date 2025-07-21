import { supabase } from '../lib/supabase';

interface Receipt {
  id: string;
  product_description: string;
  brand_name: string;
  model_number: string;
  store_name: string;
  purchase_location: string;
  warranty_period: string;
  embedding: any;
}

export async function generateEmbeddingsForAllReceipts(userId: string): Promise<{
  success: boolean;
  processed: number;
  successful: number;
  errors: number;
  message: string;
}> {
  try {
    console.log('Starting embedding generation for all receipts...');

    // Get all receipts without embeddings
    const { data: receipts, error: fetchError } = await supabase
      .from('receipts')
      .select('id, product_description, brand_name, model_number, store_name, purchase_location, warranty_period, embedding')
      .eq('user_id', userId)
      .is('embedding', null);

    if (fetchError) {
      throw new Error(`Failed to fetch receipts: ${fetchError.message}`);
    }

    if (!receipts || receipts.length === 0) {
      return {
        success: true,
        processed: 0,
        successful: 0,
        errors: 0,
        message: 'No receipts found without embeddings'
      };
    }

    console.log(`Found ${receipts.length} receipts without embeddings`);

    let successful = 0;
    let errors = 0;

    // Process receipts one by one
    for (const receipt of receipts) {
      try {
        // Create content for embedding
        const content = [
          receipt.product_description || '',
          receipt.brand_name || '',
          receipt.model_number || '',
          receipt.store_name || '',
          receipt.purchase_location || '',
          receipt.warranty_period || ''
        ].filter(Boolean).join(' ');

        if (!content.trim()) {
          console.warn(`Skipping receipt ${receipt.id} - no content to embed`);
          continue;
        }

        console.log(`Generating embedding for receipt ${receipt.id}: "${content.substring(0, 100)}..."`);

        // Generate embedding directly using OpenAI API
        const openaiApiKey = import.meta.env.VITE_OPENAI_API_KEY;
        
        if (!openaiApiKey) {
          throw new Error('OpenAI API key not configured');
        }

        const response = await fetch('https://api.openai.com/v1/embeddings', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'text-embedding-3-small',
            input: content,
            dimensions: 384
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        const embedding = result.data[0].embedding;

        // Save the embedding directly to the database
        const { error: updateError } = await supabase
          .from('receipts')
          .update({ embedding: embedding })
          .eq('id', receipt.id);

        if (updateError) {
          throw new Error(`Database update failed: ${updateError.message}`);
        }

        console.log(`✓ Successfully generated and saved embedding for receipt ${receipt.id}`);
        successful++;

        // Add a small delay to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`✗ Failed to generate embedding for receipt ${receipt.id}:`, error);
        errors++;
      }
    }

    return {
      success: true,
      processed: receipts.length,
      successful,
      errors,
      message: `Processed ${receipts.length} receipts: ${successful} successful, ${errors} errors`
    };

  } catch (error) {
    console.error('Embedding generation failed:', error);
    return {
      success: false,
      processed: 0,
      successful: 0,
      errors: 1,
      message: `Failed to generate embeddings: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

// Test function for embedding generation
export async function testEmbeddingGeneration(): Promise<boolean> {
  try {
    const openaiApiKey = import.meta.env.VITE_OPENAI_API_KEY;
    
    if (!openaiApiKey) {
      console.error('❌ OpenAI API key not configured');
      return false;
    }

    console.log('🧪 Testing embedding generation...');
    
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: 'Test embedding generation',
        dimensions: 384
      })
    });

    if (!response.ok) {
      console.error('❌ Embedding generation test failed:', response.status);
      return false;
    }

    const result = await response.json();
    const embedding = result.data[0].embedding;
    
    if (!embedding || !Array.isArray(embedding) || embedding.length !== 384) {
      console.error('❌ Invalid embedding format received');
      return false;
    }

    console.log('✅ Embedding generation test successful!');
    return true;
  } catch (error) {
    console.error('❌ Embedding generation test error:', error);
    return false;
  }
}

export async function checkEmbeddingStatus(userId: string): Promise<{
  total: number;
  withEmbeddings: number;
  withoutEmbeddings: number;
}> {
  try {
    const { data, error } = await supabase
      .from('receipts')
      .select('id, embedding')
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to check embedding status: ${error.message}`);
    }

    const total = data?.length || 0;
    const withEmbeddings = data?.filter(r => r.embedding !== null).length || 0;
    const withoutEmbeddings = total - withEmbeddings;

    return {
      total,
      withEmbeddings,
      withoutEmbeddings
    };

  } catch (error) {
    console.error('Failed to check embedding status:', error);
    return {
      total: 0,
      withEmbeddings: 0,
      withoutEmbeddings: 0
    };
  }
} 