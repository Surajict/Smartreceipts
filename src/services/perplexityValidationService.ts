import { ExtractedReceiptData } from '../types/receipt';

export interface ValidationResult {
  success: boolean;
  validatedData: ExtractedReceiptData;
  validationDetails: {
    productDescription: {
      original: string;
      validated: string;
      confidence: number;
      changed: boolean;
    };
    brand: {
      original: string;
      validated: string;
      confidence: number;
      changed: boolean;
    };
    storeName: {
      original: string;
      validated: string;
      confidence: number;
      changed: boolean;
    };
    warrantyPeriod: {
      original: string;
      validated: string;
      confidence: number;
      changed: boolean;
    };
  };
  error?: string;
}

export class PerplexityValidationService {
  private static readonly PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';
  
  /**
   * Validate extracted receipt data using Perplexity AI
   */
  static async validateReceiptData(extractedData: ExtractedReceiptData): Promise<ValidationResult> {
    console.log('🔍 Starting Perplexity validation for extracted data...');
    
    // Check if API key is available first
    const apiKey = import.meta.env.VITE_PERPLEXITY_API_KEY;
    if (!apiKey) {
      console.warn('⚠️ Perplexity API key not configured - skipping validation');
      return {
        success: false,
        validatedData: extractedData,
        validationDetails: {
          productDescription: { original: extractedData.product_description || '', validated: extractedData.product_description || '', confidence: 0, changed: false },
          brand: { original: extractedData.brand_name || '', validated: extractedData.brand_name || '', confidence: 0, changed: false },
          storeName: { original: extractedData.store_name || '', validated: extractedData.store_name || '', confidence: 0, changed: false },
          warrantyPeriod: { original: extractedData.warranty_period || '', validated: extractedData.warranty_period || '', confidence: 0, changed: false }
        },
        error: 'Perplexity API key not configured. Please add VITE_PERPLEXITY_API_KEY to your .env.local file'
      };
    }
    
    try {
      console.log('📋 Validating fields:', {
        product: extractedData.product_description,
        brand: extractedData.brand_name,
        store: extractedData.store_name,
        warranty: extractedData.warranty_period
      });
      
      // Prepare validation requests for each field
      const validationPromises = [
        this.validateProductDescription(extractedData.product_description || ''),
        this.validateBrand(extractedData.brand_name || ''),
        this.validateStoreName(extractedData.store_name || ''),
        this.validateWarrantyPeriod(extractedData.warranty_period || '', extractedData.product_description || '')
      ];
      
      // Execute all validations in parallel
      console.log('⏳ Running validation requests in parallel...');
      const [productResult, brandResult, storeResult, warrantyResult] = await Promise.all(validationPromises);
      
      console.log('📊 Validation results:', {
        product: productResult,
        brand: brandResult,
        store: storeResult,
        warranty: warrantyResult
      });
      
      // Create validated data object
      const validatedData: ExtractedReceiptData = {
        ...extractedData,
        product_description: productResult.validated,
        brand_name: brandResult.validated,
        store_name: storeResult.validated,
        warranty_period: warrantyResult.validated,
        country: this.expandCountryCode(extractedData.country)
      };
      
      // If this is a multi-product receipt, validate each product
      if (extractedData.products && extractedData.products.length > 0) {
        console.log('🔄 Validating multi-product receipt...');
        const validatedProducts = await Promise.all(
          extractedData.products.map(async (product, index) => {
            console.log(`Validating product ${index + 1}:`, product.product_description);
            const [prodResult, brandResult, warrantyResult] = await Promise.all([
              this.validateProductDescription(product.product_description || ''),
              this.validateBrand(product.brand_name || ''),
              this.validateWarrantyPeriod(product.warranty_period || '', product.product_description || '')
            ]);
            
            return {
              ...product,
              product_description: prodResult.validated,
              brand_name: brandResult.validated,
              warranty_period: warrantyResult.validated
            };
          })
        );
        
        validatedData.products = validatedProducts;
      }
      
      const validationDetails = {
        productDescription: productResult,
        brand: brandResult,
        storeName: storeResult,
        warrantyPeriod: warrantyResult
      };
      
      console.log('✅ Perplexity validation completed successfully');
      
      return {
        success: true,
        validatedData,
        validationDetails
      };
      
    } catch (error) {
      console.error('❌ Perplexity validation failed:', error);
      
      return {
        success: false,
        validatedData: extractedData, // Return original data on error
        validationDetails: {
          productDescription: { original: extractedData.product_description || '', validated: extractedData.product_description || '', confidence: 0, changed: false },
          brand: { original: extractedData.brand_name || '', validated: extractedData.brand_name || '', confidence: 0, changed: false },
          storeName: { original: extractedData.store_name || '', validated: extractedData.store_name || '', confidence: 0, changed: false },
          warrantyPeriod: { original: extractedData.warranty_period || '', validated: extractedData.warranty_period || '', confidence: 0, changed: false }
        },
        error: error instanceof Error ? error.message : 'Unknown validation error'
      };
    }
  }
  
  /**
   * Validate product description
   */
  private static async validateProductDescription(productDescription: string): Promise<{
    original: string;
    validated: string;
    confidence: number;
    changed: boolean;
  }> {
    if (!productDescription.trim()) {
      return {
        original: productDescription,
        validated: productDescription,
        confidence: 0,
        changed: false
      };
    }
    
    try {
      const prompt = `Create a short, clean product name from this receipt description: "${productDescription}"

Please:
1. Keep the brand name and main product type
2. Include the model number if important
3. Remove unnecessary technical specifications and marketing text
4. Make it concise and readable (maximum 60 characters)
5. Use standard formatting (e.g., "Brand Model Product Type")

Examples:
- "Apple iPhone 14 Pro Max 256GB Space Black with..." → "Apple iPhone 14 Pro Max"
- "Logitech MK270 Wireless Keyboard and Mouse Combo for Windows, 2.4 GHz..." → "Logitech MK270 Wireless Keyboard & Mouse"
- "Samsung 65-inch Class QLED 4K UHD Smart TV..." → "Samsung 65" QLED 4K Smart TV"

IMPORTANT: Return ONLY the shortened product name, no explanations or additional text.`;

      const response = await this.callPerplexityAPI(prompt);
      const validated = response.trim();
      
      return {
        original: productDescription,
        validated: validated,
        confidence: this.calculateConfidence(productDescription, validated),
        changed: productDescription !== validated
      };
      
    } catch (error) {
      console.warn('Product description validation failed:', error);
      return {
        original: productDescription,
        validated: productDescription,
        confidence: 0,
        changed: false
      };
    }
  }
  
  /**
   * Validate brand name
   */
  private static async validateBrand(brandName: string): Promise<{
    original: string;
    validated: string;
    confidence: number;
    changed: boolean;
  }> {
    if (!brandName.trim()) {
      return {
        original: brandName,
        validated: brandName,
        confidence: 0,
        changed: false
      };
    }
    
    try {
      const prompt = `Validate and correct this brand name from a receipt: "${brandName}"

Please:
1. Check if the brand name is spelled correctly
2. Use the official brand name format (proper capitalization)
3. Correct any OCR errors
4. Return the standardized brand name

Return only the corrected brand name, nothing else.`;

      const response = await this.callPerplexityAPI(prompt);
      const validated = response.trim();
      
      return {
        original: brandName,
        validated: validated,
        confidence: this.calculateConfidence(brandName, validated),
        changed: brandName !== validated
      };
      
    } catch (error) {
      console.warn('Brand validation failed:', error);
      return {
        original: brandName,
        validated: brandName,
        confidence: 0,
        changed: false
      };
    }
  }
  
  /**
   * Validate store name
   */
  private static async validateStoreName(storeName: string): Promise<{
    original: string;
    validated: string;
    confidence: number;
    changed: boolean;
  }> {
    if (!storeName.trim()) {
      return {
        original: storeName,
        validated: storeName,
        confidence: 0,
        changed: false
      };
    }
    
    try {
      const prompt = `Validate and correct this store name from a receipt: "${storeName}"

Please:
1. Check if the store name is spelled correctly
2. Use the official store name format
3. Correct any OCR errors
4. Return the standardized store name

IMPORTANT: Return ONLY the corrected store name (e.g., "Amazon Australia", "Walmart", "Target"). Do not include explanations, citations, or additional text.`;

      const response = await this.callPerplexityAPI(prompt);
      const validated = this.extractStoreName(response.trim());
      
      return {
        original: storeName,
        validated: validated,
        confidence: this.calculateConfidence(storeName, validated),
        changed: storeName !== validated
      };
      
    } catch (error) {
      console.warn('Store name validation failed:', error);
      return {
        original: storeName,
        validated: storeName,
        confidence: 0,
        changed: false
      };
    }
  }
  
  /**
   * Validate warranty period
   */
  private static async validateWarrantyPeriod(warrantyPeriod: string, productDescription: string): Promise<{
    original: string;
    validated: string;
    confidence: number;
    changed: boolean;
  }> {
    if (!warrantyPeriod.trim()) {
      return {
        original: warrantyPeriod,
        validated: warrantyPeriod,
        confidence: 0,
        changed: false
      };
    }
    
    try {
      const prompt = `Validate and correct this warranty period for the product "${productDescription}": "${warrantyPeriod}"

Please:
1. Check if the warranty period is reasonable for this type of product
2. Correct the format to be standardized (e.g., "1 year", "6 months", "90 days")
3. Verify if this warranty period is typical for this product category
4. If the warranty seems incorrect, provide the standard warranty for this product type

IMPORTANT: Return ONLY the corrected warranty period in simple format (e.g., "3 years", "1 year", "6 months"). Do not include any explanations, citations, or additional text.`;

      const response = await this.callPerplexityAPI(prompt);
      const validated = this.extractWarrantyPeriod(response.trim());
      
      return {
        original: warrantyPeriod,
        validated: validated,
        confidence: this.calculateConfidence(warrantyPeriod, validated),
        changed: warrantyPeriod !== validated
      };
      
    } catch (error) {
      console.warn('Warranty period validation failed:', error);
      return {
        original: warrantyPeriod,
        validated: warrantyPeriod,
        confidence: 0,
        changed: false
      };
    }
  }
  
  /**
   * Call Perplexity API using the MCP server
   */
  private static async callPerplexityAPI(prompt: string): Promise<string> {
    const apiKey = import.meta.env.VITE_PERPLEXITY_API_KEY;
    
    if (!apiKey) {
      console.error('❌ Perplexity API key not configured');
      throw new Error('Perplexity API key not configured. Please add VITE_PERPLEXITY_API_KEY to your .env.local file');
    }
    
    console.log('🔍 Making Perplexity API call...');
    console.log('Prompt:', prompt.substring(0, 100) + '...');
    
    try {
      const response = await fetch(this.PERPLEXITY_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'sonar',
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 150,
          temperature: 0.1,
        }),
      });
      
      console.log('📡 Perplexity API response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Perplexity API error response:', errorText);
        throw new Error(`Perplexity API error: ${response.status} - ${errorText}`);
      }
      
      const data = await response.json();
      console.log('✅ Perplexity API response:', data);
      
      const content = data.choices[0]?.message?.content || '';
      console.log('📝 Extracted content:', content);
      
      return content;
    } catch (error) {
      console.error('💥 Perplexity API call failed:', error);
      throw error;
    }
  }
  
  /**
   * Extract clean warranty period from potentially verbose response
   */
  private static extractWarrantyPeriod(response: string): string {
    // Remove citations like [1], [2], etc.
    let cleaned = response.replace(/\[\d+\]/g, '').trim();
    
    // Look for patterns like "3 years", "1 year", "6 months", "90 days"
    const patterns = [
      /(\d+)\s*(year|years)/i,
      /(\d+)\s*(month|months)/i,
      /(\d+)\s*(day|days)/i,
      /(\d+)\s*(week|weeks)/i
    ];
    
    for (const pattern of patterns) {
      const match = cleaned.match(pattern);
      if (match) {
        const number = match[1];
        const unit = match[2].toLowerCase();
        // Normalize to singular/plural
        if (number === '1') {
          return `1 ${unit.replace('s', '')}`;
        } else {
          return `${number} ${unit.endsWith('s') ? unit : unit + 's'}`;
        }
      }
    }
    
    // If no pattern found, return the first sentence or first 50 characters
    const firstSentence = cleaned.split('.')[0];
    if (firstSentence.length <= 50) {
      return firstSentence;
    }
    
    return cleaned.substring(0, 50).trim() + '...';
  }

  /**
   * Extract clean store name from potentially verbose response
   */
  private static extractStoreName(response: string): string {
    // Remove citations like [1], [2], etc.
    let cleaned = response.replace(/\[[\d,\s]+\]/g, '').trim();
    
    // Look for patterns that indicate the final answer
    const patterns = [
      // Look for "should be:" followed by the answer
      /should be:\s*\*?\*?([^*\n]+)\*?\*?/i,
      // Look for "Therefore, the corrected" followed by the answer
      /Therefore,\s+the\s+corrected[^:]*:\s*\*?\*?([^*\n]+)\*?\*?/i,
      // Look for text in **bold** formatting
      /\*\*([^*]+)\*\*/,
      // Look for the last line that doesn't contain explanatory text
      /^([A-Za-z0-9\s&]+)$/m
    ];
    
    for (const pattern of patterns) {
      const match = cleaned.match(pattern);
      if (match && match[1]) {
        const extracted = match[1].trim();
        // Make sure it's a reasonable store name (not too long)
        if (extracted.length <= 50 && !extracted.includes('format') && !extracted.includes('standardized')) {
          return extracted;
        }
      }
    }
    
    // If no pattern matches, try to get the first reasonable line
    const lines = cleaned.split('\n').filter(line => line.trim());
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.length <= 50 && 
          !trimmed.includes('not the official') && 
          !trimmed.includes('format') &&
          !trimmed.includes('Therefore') &&
          !trimmed.includes('corrected')) {
        return trimmed;
      }
    }
    
    // Last resort: take first 50 characters
    return cleaned.substring(0, 50).trim();
  }

  /**
   * Expand country codes to full country names
   */
  private static expandCountryCode(countryCode: string): string {
    const countryMap: { [key: string]: string } = {
      'AU': 'Australia',
      'US': 'United States',
      'USA': 'United States',
      'UK': 'United Kingdom',
      'GB': 'United Kingdom',
      'CA': 'Canada',
      'DE': 'Germany',
      'FR': 'France',
      'IT': 'Italy',
      'ES': 'Spain',
      'JP': 'Japan',
      'CN': 'China',
      'IN': 'India',
      'BR': 'Brazil',
      'MX': 'Mexico',
      'NZ': 'New Zealand',
      'SG': 'Singapore',
      'HK': 'Hong Kong',
      'TH': 'Thailand',
      'MY': 'Malaysia',
      'PH': 'Philippines',
      'ID': 'Indonesia',
      'VN': 'Vietnam',
      'KR': 'South Korea',
      'TW': 'Taiwan'
    };

    const code = countryCode.trim().toUpperCase();
    return countryMap[code] || countryCode;
  }

  /**
   * Calculate confidence score based on similarity between original and validated
   */
  private static calculateConfidence(original: string, validated: string): number {
    if (original === validated) return 100;
    
    // Simple similarity calculation
    const similarity = this.calculateSimilarity(original.toLowerCase(), validated.toLowerCase());
    return Math.round(similarity * 100);
  }
  
  /**
   * Calculate string similarity using Levenshtein distance
   */
  private static calculateSimilarity(str1: string, str2: string): number {
    const len1 = str1.length;
    const len2 = str2.length;
    
    if (len1 === 0) return len2 === 0 ? 1 : 0;
    if (len2 === 0) return 0;
    
    const matrix = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(null));
    
    for (let i = 0; i <= len1; i++) matrix[i][0] = i;
    for (let j = 0; j <= len2; j++) matrix[0][j] = j;
    
    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }
    
    const distance = matrix[len1][len2];
    const maxLen = Math.max(len1, len2);
    
    return 1 - (distance / maxLen);
  }
} 