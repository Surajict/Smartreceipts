import { supabase } from './supabase';

export interface EmbeddingStatus {
  totalReceipts: number;
  receiptsWithEmbeddings: number;
  receiptsWithoutEmbeddings: number;
  percentageComplete: number;
}

export interface BackfillResult {
  success: boolean;
  processed: number;
  successful: number;
  errors: number;
  remaining: number;
  results: Array<{
    receiptId: string;
    status: 'success' | 'error';
    error?: string;
  }>;
}

/**
 * Check the current status of embeddings for all receipts
 */
export async function checkEmbeddingStatus(userId?: string): Promise<EmbeddingStatus> {
  try {
    let query = supabase
      .from('receipts')
      .select('id, embedding', { count: 'exact' });
    
    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data: receipts, error, count } = await query;

    if (error) {
      throw new Error(`Failed to check embedding status: ${error.message}`);
    }

    const totalReceipts = count || 0;
    const receiptsWithEmbeddings = receipts?.filter(r => r.embedding !== null).length || 0;
    const receiptsWithoutEmbeddings = totalReceipts - receiptsWithEmbeddings;
    const percentageComplete = totalReceipts > 0 ? (receiptsWithEmbeddings / totalReceipts) * 100 : 0;

    return {
      totalReceipts,
      receiptsWithEmbeddings,
      receiptsWithoutEmbeddings,
      percentageComplete: Math.round(percentageComplete * 100) / 100
    };
  } catch (error) {
    console.error('Error checking embedding status:', error);
    throw error;
  }
}

/**
 * Generate embedding for a single receipt
 */
export async function generateEmbeddingForReceipt(receiptId: string, content: string): Promise<boolean> {
  try {
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-embedding`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        receiptId,
        content
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

    return result.success === true;
  } catch (error) {
    console.error(`Error generating embedding for receipt ${receiptId}:`, error);
    throw error;
  }
}

/**
 * Run the backfill process to generate embeddings for receipts that don't have them
 */
export async function backfillEmbeddings(batchSize: number = 5): Promise<BackfillResult> {
  try {
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/backfill-embeddings`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        batchSize
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

    return result;
  } catch (error) {
    console.error('Error running backfill:', error);
    throw error;
  }
}

/**
 * Generate embeddings for a specific user's receipts
 */
export async function generateEmbeddingsForUser(userId: string, batchSize: number = 5): Promise<BackfillResult> {
  try {
    // Get receipts without embeddings for this user
    const { data: receipts, error } = await supabase
      .from('receipts')
      .select(`
        id,
        product_description,
        brand_name,
        model_number,
        store_name,
        purchase_location
      `)
      .eq('user_id', userId)
      .is('embedding', null)
      .limit(batchSize);

    if (error) {
      throw new Error(`Failed to fetch receipts: ${error.message}`);
    }

    if (!receipts || receipts.length === 0) {
      return {
        success: true,
        processed: 0,
        successful: 0,
        errors: 0,
        remaining: 0,
        results: []
      };
    }

    const results = [];
    let successful = 0;
    let errors = 0;

    for (const receipt of receipts) {
      try {
        const content = [
          receipt.product_description,
          receipt.brand_name,
          receipt.model_number,
          receipt.store_name,
          receipt.purchase_location
        ].filter(Boolean).join(' ');

        const success = await generateEmbeddingForReceipt(receipt.id, content);
        
        if (success) {
          successful++;
          results.push({
            receiptId: receipt.id,
            status: 'success' as const
          });
        } else {
          errors++;
          results.push({
            receiptId: receipt.id,
            status: 'error' as const,
            error: 'Generation failed'
          });
        }
      } catch (error) {
        errors++;
        results.push({
          receiptId: receipt.id,
          status: 'error' as const,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Check remaining count
    const status = await checkEmbeddingStatus(userId);

    return {
      success: true,
      processed: receipts.length,
      successful,
      errors,
      remaining: status.receiptsWithoutEmbeddings,
      results
    };
  } catch (error) {
    console.error('Error generating embeddings for user:', error);
    throw error;
  }
}

/**
 * Test if the smart search system is working
 */
export async function testSmartSearch(query: string, userId: string): Promise<any> {
  try {
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/smart-search`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        userId
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error testing smart search:', error);
    throw error;
  }
}

/**
 * Utility function to create content string from receipt data
 */
export function createReceiptContent(receipt: any): string {
  const parts = [
    receipt.product_description,
    receipt.brand_name,
    receipt.model_number,
    receipt.store_name,
    receipt.purchase_location,
    receipt.country,
    receipt.warranty_period,
    receipt.extracted_text
  ].filter(part => part && typeof part === 'string' && part.trim().length > 0);

  return parts.join(' ').trim();
} 