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

        // Call the generate-embedding edge function
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-embedding`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content: content,
            receiptId: receipt.id
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const result = await response.json();
        
        if (result.error) {
          throw new Error(result.error);
        }

        console.log(`✓ Successfully generated embedding for receipt ${receipt.id}`);
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