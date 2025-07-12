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
  currency: string;
}

export interface MultiItemExtractionResult {
  items: ExtractedItem[];
  store_info: StoreInfo;
}

export interface CurrencyConversion {
  original_amount: number;
  original_currency: string;
  converted_amount: number;
  target_currency: string;
  exchange_rate: number;
  conversion_date: string;
}

/**
 * Enhanced AI service for multi-item receipt processing and currency handling
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

      const openaiApiKey = import.meta.env.VITE_OPENAI_API_KEY;
      
      if (!openaiApiKey) {
        throw new Error('OpenAI API key not configured. Please set VITE_OPENAI_API_KEY in your environment variables.');
      }

      const prompt = `You are an AI assistant that extracts structured data from retail receipts.
Analyze the receipt text and extract ALL individual items/products found.

Return ONLY valid JSON in this exact format:
{
  "items": [
    {
      "product_description": "string - product name",
      "brand_name": "string - brand name or null",
      "model_number": "string - model/SKU or null", 
      "price": "number - individual item price or null",
      "quantity": "number - quantity (default 1)",
      "warranty_period_months": "number - warranty in months or null",
      "extended_warranty_months": "number - extended warranty months or null"
    }
  ],
  "store_info": {
    "store_name": "string - store name or null",
    "purchase_location": "string - store address or null",
    "purchase_date": "string - date in YYYY-MM-DD format",
    "total_amount": "number - total receipt amount or null",
    "country": "string - country or 'United States'",
    "currency": "string - currency code like USD, EUR, AED etc"
  }
}

IMPORTANT:
- Extract EVERY product/item found on the receipt
- If only one item, still return it in the items array
- Include individual prices when available
- Detect currency from receipt (USD, EUR, AED, etc.)
- Set warranty_period_months based on product type (electronics: 12-24, appliances: 12-36, etc.)

Receipt text:
${receiptText}

Return only valid JSON:`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: 'You are a precise data extraction assistant specialized in retail receipts. Extract ALL items from receipts and return only valid JSON.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 1500,
          temperature: 0.1,
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`OpenAI API error: ${response.status} - ${errorData}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;

      if (!content) {
        throw new Error('No response from OpenAI');
      }

      // Clean the response to extract JSON
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in response');
      }

      const extractedData = JSON.parse(jsonMatch[0]);
      
      // Validate and clean the extracted data
      if (!extractedData.items || !Array.isArray(extractedData.items)) {
        throw new Error('Invalid items structure in response');
      }

      if (!extractedData.store_info) {
        throw new Error('Invalid store info structure in response');
      }

      // Clean and validate items
      const cleanedItems = extractedData.items.map((item: any) => ({
        product_description: item.product_description || 'Unknown Product',
        brand_name: item.brand_name || null,
        model_number: item.model_number || null,
        price: typeof item.price === 'number' ? item.price : null,
        quantity: typeof item.quantity === 'number' ? item.quantity : 1,
        warranty_period_months: typeof item.warranty_period_months === 'number' ? item.warranty_period_months : null,
        extended_warranty_months: typeof item.extended_warranty_months === 'number' ? item.extended_warranty_months : null
      }));

      // Clean and validate store info
      const cleanedStoreInfo = {
        store_name: extractedData.store_info.store_name || null,
        purchase_location: extractedData.store_info.purchase_location || null,
        purchase_date: extractedData.store_info.purchase_date || new Date().toISOString().split('T')[0],
        total_amount: typeof extractedData.store_info.total_amount === 'number' ? extractedData.store_info.total_amount : null,
        country: extractedData.store_info.country || 'United States',
        currency: extractedData.store_info.currency || 'USD'
      };

      // Ensure date is in correct format
      if (cleanedStoreInfo.purchase_date && !cleanedStoreInfo.purchase_date.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const date = new Date(cleanedStoreInfo.purchase_date);
        if (!isNaN(date.getTime())) {
          cleanedStoreInfo.purchase_date = date.toISOString().split('T')[0];
        } else {
          cleanedStoreInfo.purchase_date = new Date().toISOString().split('T')[0];
        }
      }

      const result: MultiItemExtractionResult = {
        items: cleanedItems,
        store_info: cleanedStoreInfo
      };
      
      console.log(`AIService: Successfully extracted ${cleanedItems.length} items`);
      
      return {
        data: result,
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
   * Get currency for a country using OpenAI
   */
  static async getCurrencyForCountry(country: string): Promise<{
    currency_code: string;
    currency_name: string;
    currency_symbol: string;
  }> {
    try {
      const openaiApiKey = import.meta.env.VITE_OPENAI_API_KEY;
      
      if (!openaiApiKey) {
        // Fallback to common currencies
        return this.getFallbackCurrency(country);
      }

      const prompt = `What is the official currency for ${country}? 
Return ONLY valid JSON in this format:
{
  "currency_code": "USD",
  "currency_name": "US Dollar", 
  "currency_symbol": "$"
}`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: 'You are a currency expert. Return only valid JSON with currency information.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 200,
          temperature: 0.1,
        }),
      });

      if (!response.ok) {
        throw new Error('OpenAI API error');
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;

      if (!content) {
        throw new Error('No response from OpenAI');
      }

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found');
      }

      const currencyData = JSON.parse(jsonMatch[0]);
      
      return {
        currency_code: currencyData.currency_code || 'USD',
        currency_name: currencyData.currency_name || 'US Dollar',
        currency_symbol: currencyData.currency_symbol || '$'
      };

    } catch (error) {
      console.error('Error getting currency for country:', error);
      return this.getFallbackCurrency(country);
    }
  }

  /**
   * Convert currency using OpenAI
   */
  static async convertCurrency(
    amount: number,
    fromCurrency: string,
    toCurrency: string
  ): Promise<CurrencyConversion | null> {
    try {
      if (fromCurrency === toCurrency) {
        return {
          original_amount: amount,
          original_currency: fromCurrency,
          converted_amount: amount,
          target_currency: toCurrency,
          exchange_rate: 1,
          conversion_date: new Date().toISOString().split('T')[0]
        };
      }

      const openaiApiKey = import.meta.env.VITE_OPENAI_API_KEY;
      
      if (!openaiApiKey) {
        throw new Error('OpenAI API key not configured');
      }

      const prompt = `Convert ${amount} ${fromCurrency} to ${toCurrency}.
Return ONLY valid JSON in this format:
{
  "original_amount": ${amount},
  "original_currency": "${fromCurrency}",
  "converted_amount": 0.00,
  "target_currency": "${toCurrency}",
  "exchange_rate": 0.00,
  "conversion_date": "2024-01-01"
}

Use current exchange rates and return accurate conversion.`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: 'You are a currency conversion expert. Use current exchange rates and return only valid JSON.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 300,
          temperature: 0.1,
        }),
      });

      if (!response.ok) {
        throw new Error('OpenAI API error');
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;

      if (!content) {
        throw new Error('No response from OpenAI');
      }

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found');
      }

      const conversionData = JSON.parse(jsonMatch[0]);
      
      return {
        original_amount: amount,
        original_currency: fromCurrency,
        converted_amount: conversionData.converted_amount || amount,
        target_currency: toCurrency,
        exchange_rate: conversionData.exchange_rate || 1,
        conversion_date: new Date().toISOString().split('T')[0]
      };

    } catch (error) {
      console.error('Error converting currency:', error);
      return null;
    }
  }

  /**
   * Fallback currency mapping for common countries
   */
  private static getFallbackCurrency(country: string): {
    currency_code: string;
    currency_name: string;
    currency_symbol: string;
  } {
    const countryLower = country.toLowerCase();
    
    const currencyMap: { [key: string]: any } = {
      'united states': { currency_code: 'USD', currency_name: 'US Dollar', currency_symbol: '$' },
      'usa': { currency_code: 'USD', currency_name: 'US Dollar', currency_symbol: '$' },
      'uae': { currency_code: 'AED', currency_name: 'UAE Dirham', currency_symbol: 'د.إ' },
      'united arab emirates': { currency_code: 'AED', currency_name: 'UAE Dirham', currency_symbol: 'د.إ' },
      'uk': { currency_code: 'GBP', currency_name: 'British Pound', currency_symbol: '£' },
      'united kingdom': { currency_code: 'GBP', currency_name: 'British Pound', currency_symbol: '£' },
      'canada': { currency_code: 'CAD', currency_name: 'Canadian Dollar', currency_symbol: 'C$' },
      'australia': { currency_code: 'AUD', currency_name: 'Australian Dollar', currency_symbol: 'A$' },
      'germany': { currency_code: 'EUR', currency_name: 'Euro', currency_symbol: '€' },
      'france': { currency_code: 'EUR', currency_name: 'Euro', currency_symbol: '€' },
      'japan': { currency_code: 'JPY', currency_name: 'Japanese Yen', currency_symbol: '¥' },
      'india': { currency_code: 'INR', currency_name: 'Indian Rupee', currency_symbol: '₹' },
      'china': { currency_code: 'CNY', currency_name: 'Chinese Yuan', currency_symbol: '¥' }
    };

    return currencyMap[countryLower] || { currency_code: 'USD', currency_name: 'US Dollar', currency_symbol: '$' };
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