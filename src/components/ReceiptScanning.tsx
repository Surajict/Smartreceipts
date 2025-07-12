import React, { useState, useRef, useCallback, useEffect } from 'react';
import Webcam from 'react-webcam';
import { 
  Camera, 
  Upload, 
  ArrowLeft, 
  X, 
  Check, 
  AlertCircle, 
  Loader2, 
  FileText,
  Zap,
  Brain,
  Eye,
  Save,
  RefreshCw,
  User,
  LogOut,
  Bell,
  ShoppingCart,
  Package,
  DollarSign,
  Hash,
  Edit3,
  RotateCcw,
  Plus,
  Maximize2,
  Settings
} from 'lucide-react';
import { getCurrentUser, signOut, saveReceiptToDatabase, uploadReceiptImage, testOpenAIConnection, extractReceiptDataWithGPT } from '../lib/supabase';
import { AIService, ExtractedItem, StoreInfo } from '../services/aiService';
import { OCRService, OCREngine } from '../services/ocrService';

interface ReceiptScanningProps {
  onBackToDashboard: () => void;
}

interface ExtractedData {
  product_description: string;
  brand_name: string;
  store_name: string;
  purchase_location: string;
  purchase_date: string;
  amount: number | null;
  warranty_period: string;
  extended_warranty: string;
  model_number: string;
  country: string;
}

interface ExtractedItem {
  product_description: string;
  brand_name: string;
  model_number: string | null;
  price: number | null;
  quantity: number;
  warranty_period_months: number | null;
  extended_warranty_months: number | null;
}

interface ExtractedStoreInfo {
  store_name: string | null;
  purchase_location: string | null;
  purchase_date: string;
  total_amount: number | null;
  country: string;
}

interface MultiItemExtractionResult {
  items: ExtractedItem[];
  store_info: ExtractedStoreInfo;
}

type CaptureMode = 'normal' | 'long';
type InputMode = 'capture' | 'upload' | 'manual';

const ReceiptScanning: React.FC<ReceiptScanningProps> = ({ onBackToDashboard }) => {
  // ... rest of the component code ...
  return (
    // ... JSX code ...
  );
};

export default ReceiptScanning;