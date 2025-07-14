export interface Receipt {
  id: string;
  user_id: string;
  purchase_date: string;
  country: string;
  product_description: string | null;
  brand_name: string | null;
  model_number: string | null;
  warranty_period: string | null;
  extended_warranty: string | null;
  amount: number | null; // Individual product amount
  receipt_total: number | null; // Original receipt total (duplicated for multi-product)
  image_path: string | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
  store_name: string | null;
  purchase_location: string | null;
  processing_method: string | null;
  ocr_confidence: number | null;
  extracted_text: string | null;
  embedding: number[] | null;
  
  // New fields for multi-product receipt support
  receipt_group_id: string | null; // UUID linking products from same receipt
  is_group_receipt: boolean; // TRUE if part of multi-product receipt
}

export interface ReceiptGroup {
  receipt_group_id: string;
  receipts: Receipt[];
  total_amount: number;
  product_count: number;
  store_name: string | null;
  purchase_date: string;
  image_url: string | null;
}

export interface ExtractedReceiptData {
  store_name: string;
  purchase_date: string;
  purchase_location: string;
  country: string;
  extended_warranty: string;
  
  // For multi-product receipts
  products?: ExtractedProduct[];
  total_amount: number;
  
  // For single-product receipts (backward compatibility)
  warranty_period?: string;
  
  // For single-product receipts (backward compatibility)
  product_description?: string;
  brand_name?: string;
  model_number?: string;
  amount?: number;
}

export interface ExtractedProduct {
  product_description: string;
  brand_name: string;
  model_number: string;
  amount: number;
  warranty_period: string; // Made required since each product needs its own warranty
  category?: string;
}

export interface ReceiptScanResult {
  success: boolean;
  receipts: Receipt[]; // Array of receipts (single item for single-product, multiple for multi-product)
  receipt_group_id?: string; // Present for multi-product receipts
  error?: string;
  processing_method: 'manual' | 'ocr' | 'gpt_structured' | 'fallback_parsing';
  ocr_confidence?: number;
} 