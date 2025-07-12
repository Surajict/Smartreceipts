import { extractReceiptDataWithGPT } from '../lib/supabase';

export interface ExtractedItem {
  product_description: string;
  brand_name: string | null;
  model_number: string | null;
  price: number | null;
  quantity: number;
  warranty_period_months: number | null;
  extended_warranty_months: number | null;
}

export interface StoreInfo {
  store_name: string | null;
  purchase_location: string | null;
  purchase_date: string;
  total_amount: number | null;
  country: string;
}

export interface MultiItemExtractionResult {
  items: ExtractedItem[];
  store_info: StoreInfo;
}

/**
 * Enhanced AI service for multi-item receipt processing
 */
export class AIService {
  /**
   * Extract multiple items from receipt text using OpenAI GPT-4o
   */
  static async extractMultipleItems(receiptText: string): Promise<{
    data: MultiItemExtractionResult | null;
    error: { message: string } | null;
  }> {
    try {
      console.log('AIService: Starting multi-item extraction...');
      
      if (!receiptText || receiptText.trim().length === 0) {
        throw new Error('No receipt text provided for extraction');
      }

      // Use the enhanced GPT extraction function
      const result = await extractReceiptDataWithGPT(receiptText);
      
      if (result.error) {
        throw new Error(result.error.message);
      }

      if (!result.data) {
        throw new Error('No data returned from GPT extraction');
      }

      // Validate the structure
      if (!Array.isArray(result.data.items)) {
        throw new Error('Invalid items structure returned from GPT');
      }

      if (!result.data.store_info) {
        throw new Error('Invalid store info structure returned from GPT');
      }

      console.log(`AIService: Successfully extracted ${result.data.items.length} items`);
      
      return {
        data: result.data as MultiItemExtractionResult,
        error: null
      };

    } catch (error: any) {
      console.error('AIService: Multi-item extraction failed:', error);
      return {
        data: null,
        error: { message: error.message || 'Failed to extract items from receipt' }
      };
    }
  }

  /**
   * Test if OpenAI API is properly configured
   */
  static async testOpenAIConnection(): Promise<boolean> {
    try {
      const openaiApiKey = import.meta.env.VITE_OPENAI_API_KEY;
      
      if (!openaiApiKey) {
        console.warn('OpenAI API key not configured');
        return false;
      }

      console.log('Testing OpenAI API connection...');
      
      const response = await fetch('https://api.openai.com/v1/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`
        }
      });

      if (response.ok) {
        console.log('OpenAI API connection successful');
        return true;
      } else {
        console.error('OpenAI API connection failed:', response.status, response.statusText);
        return false;
      }
    } catch (err) {
      console.error('OpenAI API connection test error:', err);
      return false;
    }
  }

  /**
   * Convert warranty period from months to human-readable format
   */
  static formatWarrantyPeriod(months: number | null): string {
    if (!months || months <= 0) {
      return '1 year'; // Default warranty
    }

    if (months === 12) {
      return '1 year';
    } else if (months === 24) {
      return '2 years';
    } else if (months === 36) {
      return '3 years';
    } else if (months < 12) {
      return `${months} months`;
    } else {
      const years = Math.floor(months / 12);
      const remainingMonths = months % 12;
      if (remainingMonths === 0) {
        return `${years} years`;
      } else {
        return `${years} years ${remainingMonths} months`;
      }
    }
  }

  /**
   * Validate extracted item data
   */
  static validateExtractedItem(item: ExtractedItem): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!item.product_description || item.product_description.trim().length === 0) {
      errors.push('Product description is required');
    }

    if (!item.brand_name || item.brand_name.trim().length === 0) {
      errors.push('Brand name is required');
    }

    if (item.quantity && item.quantity <= 0) {
      errors.push('Quantity must be greater than 0');
    }

    if (item.price && item.price <= 0) {
      errors.push('Price must be greater than 0');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate store information
   */
  static validateStoreInfo(storeInfo: StoreInfo): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!storeInfo.purchase_date) {
      errors.push('Purchase date is required');
    } else {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(storeInfo.purchase_date)) {
        errors.push('Purchase date must be in YYYY-MM-DD format');
      }
    }

    if (!storeInfo.country || storeInfo.country.trim().length === 0) {
      errors.push('Country is required');
    }

    if (storeInfo.total_amount && storeInfo.total_amount <= 0) {
      errors.push('Total amount must be greater than 0');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}