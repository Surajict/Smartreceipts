import { supabase } from '../lib/supabase';
import { ExtractedReceiptData, Receipt } from '../types/receipt';

export interface DuplicateMatch {
  receipt: Receipt;
  matchScore: number;
  matchReasons: string[];
}

export interface DuplicateDetectionResult {
  isDuplicate: boolean;
  matches: DuplicateMatch[];
  confidence: number;
}

export class DuplicateDetectionService {
  
  /**
   * Check if a receipt is a potential duplicate
   */
  static async checkForDuplicates(
    extractedData: ExtractedReceiptData,
    userId: string
  ): Promise<DuplicateDetectionResult> {
    try {
      console.log('🔍 Checking for duplicate receipts...');
      
      // Get existing receipts for the user from the same store and similar date range
      const existingReceipts = await this.getExistingReceipts(extractedData, userId);
      
      if (existingReceipts.length === 0) {
        console.log('✅ No existing receipts found - not a duplicate');
        return {
          isDuplicate: false,
          matches: [],
          confidence: 0
        };
      }
      
      console.log(`📋 Found ${existingReceipts.length} existing receipts to check`);
      
      // Check each existing receipt for similarity
      const matches: DuplicateMatch[] = [];
      
      for (const existingReceipt of existingReceipts) {
        const matchResult = this.calculateMatchScore(extractedData, existingReceipt);
        
        if (matchResult.matchScore > 0.6) { // 60% similarity threshold
          matches.push(matchResult);
        }
      }
      
      // Sort matches by score (highest first)
      matches.sort((a, b) => b.matchScore - a.matchScore);
      
      const isDuplicate = matches.length > 0;
      const confidence = isDuplicate ? matches[0].matchScore : 0;
      
      console.log(`${isDuplicate ? '⚠️ Potential duplicate found' : '✅ No duplicates found'} - Confidence: ${confidence.toFixed(2)}`);
      
      return {
        isDuplicate,
        matches,
        confidence
      };
      
    } catch (error) {
      console.error('💥 Error checking for duplicates:', error);
      // If duplicate detection fails, don't block the save
      return {
        isDuplicate: false,
        matches: [],
        confidence: 0
      };
    }
  }
  
  /**
   * Get existing receipts that could be duplicates
   */
  private static async getExistingReceipts(
    extractedData: ExtractedReceiptData,
    userId: string
  ): Promise<Receipt[]> {
    const purchaseDate = new Date(extractedData.purchase_date);
    const storeName = extractedData.store_name?.toLowerCase().trim();
    
    // Search for receipts from same store within ±3 days
    const startDate = new Date(purchaseDate);
    startDate.setDate(startDate.getDate() - 3);
    
    const endDate = new Date(purchaseDate);
    endDate.setDate(endDate.getDate() + 3);
    
    let query = supabase
      .from('receipts')
      .select('*')
      .eq('user_id', userId)
      .gte('purchase_date', startDate.toISOString().split('T')[0])
      .lte('purchase_date', endDate.toISOString().split('T')[0]);
    
    // If we have a store name, filter by it
    if (storeName) {
      query = query.ilike('store_name', `%${storeName}%`);
    }
    
    const { data, error } = await query.order('purchase_date', { ascending: false });
    
    if (error) {
      console.error('Error fetching existing receipts:', error);
      return [];
    }
    
    return data || [];
  }
  
  /**
   * Calculate similarity score between new receipt and existing receipt
   */
  private static calculateMatchScore(
    newReceipt: ExtractedReceiptData,
    existingReceipt: Receipt
  ): DuplicateMatch {
    let score = 0;
    const matchReasons: string[] = [];
    
    // Check for single product vs multi-product comparison
    if (newReceipt.products && newReceipt.products.length > 0) {
      // New receipt is multi-product
      return this.calculateMultiProductMatchScore(newReceipt, existingReceipt);
    } else {
      // New receipt is single-product
      return this.calculateSingleProductMatchScore(newReceipt, existingReceipt);
    }
  }
  
  /**
   * Calculate match score for single-product receipt
   */
  private static calculateSingleProductMatchScore(
    newReceipt: ExtractedReceiptData,
    existingReceipt: Receipt
  ): DuplicateMatch {
    let score = 0;
    const matchReasons: string[] = [];
    
    // 1. Store name match (25 points)
    if (this.isSimilarString(newReceipt.store_name, existingReceipt.store_name)) {
      score += 0.25;
      matchReasons.push('Same store');
    }
    
    // 2. Purchase date match (20 points)
    if (newReceipt.purchase_date === existingReceipt.purchase_date) {
      score += 0.20;
      matchReasons.push('Same purchase date');
    }
    
    // 3. Product description match (25 points)
    if (this.isSimilarString(newReceipt.product_description, existingReceipt.product_description)) {
      score += 0.25;
      matchReasons.push('Similar product');
    }
    
    // 4. Brand name match (15 points)
    if (this.isSimilarString(newReceipt.brand_name, existingReceipt.brand_name)) {
      score += 0.15;
      matchReasons.push('Same brand');
    }
    
    // 5. Amount match (10 points)
    if (newReceipt.amount && existingReceipt.amount && 
        Math.abs(newReceipt.amount - existingReceipt.amount) < 0.01) {
      score += 0.10;
      matchReasons.push('Same amount');
    }
    
    // 6. Model number match (5 points)
    if (newReceipt.model_number && existingReceipt.model_number &&
        this.isSimilarString(newReceipt.model_number, existingReceipt.model_number)) {
      score += 0.05;
      matchReasons.push('Same model');
    }
    
    return {
      receipt: existingReceipt,
      matchScore: score,
      matchReasons
    };
  }
  
  /**
   * Calculate match score for multi-product receipt
   */
  private static calculateMultiProductMatchScore(
    newReceipt: ExtractedReceiptData,
    existingReceipt: Receipt
  ): DuplicateMatch {
    let score = 0;
    const matchReasons: string[] = [];
    
    // 1. Store name match (30 points)
    if (this.isSimilarString(newReceipt.store_name, existingReceipt.store_name)) {
      score += 0.30;
      matchReasons.push('Same store');
    }
    
    // 2. Purchase date match (25 points)
    if (newReceipt.purchase_date === existingReceipt.purchase_date) {
      score += 0.25;
      matchReasons.push('Same purchase date');
    }
    
    // 3. Total amount match (20 points)
    if (newReceipt.total_amount && existingReceipt.receipt_total && 
        Math.abs(newReceipt.total_amount - existingReceipt.receipt_total) < 0.01) {
      score += 0.20;
      matchReasons.push('Same total amount');
    }
    
    // 4. Check if any product in new receipt matches existing receipt (25 points)
    if (newReceipt.products) {
      for (const product of newReceipt.products) {
        if (this.isSimilarString(product.product_description, existingReceipt.product_description)) {
          score += 0.25;
          matchReasons.push('Contains similar product');
          break;
        }
      }
    }
    
    return {
      receipt: existingReceipt,
      matchScore: score,
      matchReasons
    };
  }
  
  /**
   * Check if two strings are similar (case-insensitive, trimmed)
   */
  private static isSimilarString(str1: string | null | undefined, str2: string | null | undefined): boolean {
    if (!str1 || !str2) return false;
    
    const clean1 = str1.toLowerCase().trim();
    const clean2 = str2.toLowerCase().trim();
    
    // Exact match
    if (clean1 === clean2) return true;
    
    // Check if one contains the other (for partial matches)
    if (clean1.includes(clean2) || clean2.includes(clean1)) return true;
    
    // Calculate Levenshtein distance for similarity
    const similarity = this.calculateSimilarity(clean1, clean2);
    return similarity > 0.8; // 80% similarity threshold
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
  
  /**
   * Format duplicate matches for display
   */
  static formatDuplicateMessage(matches: DuplicateMatch[]): string {
    if (matches.length === 0) return '';
    
    const bestMatch = matches[0];
    const receipt = bestMatch.receipt;
    const reasons = bestMatch.matchReasons.join(', ');
    
    return `Similar receipt found from ${receipt.store_name} on ${receipt.purchase_date} (${reasons})`;
  }
} 