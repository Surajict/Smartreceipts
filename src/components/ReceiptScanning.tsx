import React, { useState, useRef, useCallback, useEffect } from 'react';
import { 
  Camera, 
  Upload, 
  ArrowLeft, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  X,
  Edit3,
  Save,
  FileText,
  Zap,
  Brain,
  Eye,
  User,
  LogOut,
  Bell
} from 'lucide-react';
import Webcam from 'react-webcam';
import { createWorker } from 'tesseract.js';
import { getCurrentUser, signOut, saveReceiptToDatabase, uploadReceiptImage } from '../lib/supabase';

interface ReceiptScanningProps {
  onBackToDashboard: () => void;
}

interface ReceiptData {
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
  image_url?: string;
  processing_method?: string;
  ocr_confidence?: number;
  extracted_text?: string;
}

interface ProcessingStep {
  id: string;
  label: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  details?: string;
}

const ReceiptScanning: React.FC<ReceiptScanningProps> = ({ onBackToDashboard }) => {
  const [user, setUser] = useState<any>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [alertsCount] = useState(3);
  const [captureMode, setCaptureMode] = useState<'camera' | 'upload' | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingSteps, setProcessingSteps] = useState<ProcessingStep[]>([]);
  const [extractedData, setExtractedData] = useState<ReceiptData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState<ReceiptData | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const webcamRef = useRef<Webcam>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const currentUser = await getCurrentUser();
    setUser(currentUser);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      window.location.href = '/';
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const updateProcessingStep = (stepId: string, status: ProcessingStep['status'], details?: string) => {
    setProcessingSteps(prev => prev.map(step => 
      step.id === stepId ? { ...step, status, details } : step
    ));
  };

  const initializeProcessingSteps = () => {
    const steps: ProcessingStep[] = [
      { id: 'upload', label: 'Uploading image to secure storage', status: 'pending' },
      { id: 'ocr', label: 'Extracting text using OCR technology', status: 'pending' },
      { id: 'ai', label: 'Processing with AI to structure data', status: 'pending' },
      { id: 'validation', label: 'Validating and organizing information', status: 'pending' }
    ];
    setProcessingSteps(steps);
  };

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      setCapturedImage(imageSrc);
      setCaptureMode(null);
    }
  }, [webcamRef]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setCapturedImage(e.target?.result as string);
        setCaptureMode(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const dataURLtoBlob = (dataURL: string): Blob => {
    const arr = dataURL.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  };

  const performOCR = async (imageData: string): Promise<{ text: string; confidence: number }> => {
    try {
      updateProcessingStep('ocr', 'processing', 'Initializing OCR engine...');
      
      const worker = await createWorker('eng');
      
      updateProcessingStep('ocr', 'processing', 'Analyzing receipt image...');
      
      const { data } = await worker.recognize(imageData);
      await worker.terminate();
      
      const confidence = data.confidence / 100; // Convert to 0-1 scale
      
      updateProcessingStep('ocr', 'completed', `Text extracted with ${Math.round(confidence * 100)}% confidence`);
      
      return {
        text: data.text,
        confidence: confidence
      };
    } catch (error) {
      console.error('OCR Error:', error);
      updateProcessingStep('ocr', 'error', 'OCR processing failed');
      throw new Error('Failed to extract text from image');
    }
  };

  const processWithGPT = async (extractedText: string): Promise<ReceiptData> => {
    try {
      updateProcessingStep('ai', 'processing', 'Sending data to AI for structuring...');
      
      const openaiApiKey = import.meta.env.VITE_OPENAI_API_KEY;
      
      if (!openaiApiKey) {
        throw new Error('OpenAI API key not configured');
      }

      const prompt = `You are a precise AI that extracts structured receipt details from raw text.
Given the following raw text from a receipt, extract the information and return ONLY valid JSON.
If a field is missing or unclear, set its value to null or a reasonable default.
Do not include any explanation or text outside the JSON.

Required JSON structure:
{
  "product_description": "Main product or service purchased",
  "brand_name": "Brand or manufacturer name",
  "store_name": "Store or merchant name",
  "purchase_location": "Store address or location",
  "purchase_date": "YYYY-MM-DD format",
  "amount": numeric value without currency symbol,
  "warranty_period": "warranty duration (e.g., '1 year', '2 years', '6 months')",
  "extended_warranty": "extended warranty if mentioned, else null",
  "model_number": "product model number if mentioned, else null",
  "country": "country where purchased (default to 'United States' if unclear)"
}

Raw receipt text:
${extractedText}`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiApiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'You are a helpful assistant that extracts structured data from receipts. Always respond with valid JSON only.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.1,
          max_tokens: 500
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('OpenAI API Error:', errorData);
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const gptResponse = data.choices[0]?.message?.content?.trim();

      if (!gptResponse) {
        throw new Error('Empty response from GPT');
      }

      updateProcessingStep('ai', 'processing', 'Parsing AI response...');

      // Extract JSON from the response (handle markdown formatting)
      let jsonStr = gptResponse;
      
      // Remove markdown code blocks if present
      if (jsonStr.includes('```')) {
        const jsonMatch = jsonStr.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
        if (jsonMatch) {
          jsonStr = jsonMatch[1];
        }
      }
      
      // Find JSON boundaries if no markdown
      if (!jsonStr.trim().startsWith('{')) {
        const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          jsonStr = jsonMatch[0];
        }
      }

      // Clean up common JSON issues
      jsonStr = jsonStr
        .replace(/,\s*}/g, '}')  // Remove trailing commas
        .replace(/,\s*]/g, ']')  // Remove trailing commas in arrays
        .replace(/([{,]\s*)(\w+):/g, '$1"$2":'); // Quote unquoted keys

      let parsedData: any;
      try {
        parsedData = JSON.parse(jsonStr);
      } catch (parseError) {
        console.error('JSON Parse Error:', parseError);
        console.error('Attempted to parse:', jsonStr);
        throw new Error('Invalid JSON response from AI');
      }

      // Validate and clean the parsed data
      const receiptData: ReceiptData = {
        product_description: String(parsedData.product_description || 'Unknown Product').trim(),
        brand_name: String(parsedData.brand_name || 'Unknown Brand').trim(),
        store_name: String(parsedData.store_name || '').trim(),
        purchase_location: String(parsedData.purchase_location || '').trim(),
        purchase_date: parsedData.purchase_date || new Date().toISOString().split('T')[0],
        amount: parsedData.amount && !isNaN(Number(parsedData.amount)) ? Number(parsedData.amount) : null,
        warranty_period: String(parsedData.warranty_period || '1 year').trim(),
        extended_warranty: parsedData.extended_warranty ? String(parsedData.extended_warranty).trim() : '',
        model_number: parsedData.model_number ? String(parsedData.model_number).trim() : '',
        country: String(parsedData.country || 'United States').trim()
      };

      updateProcessingStep('ai', 'completed', 'Data successfully structured by AI');
      return receiptData;

    } catch (error: any) {
      console.error('GPT Processing Error:', error);
      updateProcessingStep('ai', 'error', `AI processing failed: ${error.message}`);
      throw error;
    }
  };

  const enhancedFallbackParsing = (text: string): ReceiptData => {
    console.log('Using enhanced fallback parsing for text:', text);
    
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    // Enhanced amount detection patterns
    const amountPatterns = [
      /(?:total|amount|sum|grand total|final total)[\s:]*\$?(\d+\.?\d*)/i,
      /\$(\d+\.\d{2})\s*(?:total|final|grand)?/i,
      /(\d+\.\d{2})\s*(?:usd|dollars?|total)?$/i,
      /(?:^|\s)(\d+\.\d{2})(?:\s|$)/
    ];
    
    let amount: number | null = null;
    for (const pattern of amountPatterns) {
      for (const line of lines) {
        const match = line.match(pattern);
        if (match) {
          const value = parseFloat(match[1]);
          if (value > 0 && value < 10000) { // Reasonable range
            amount = value;
            break;
          }
        }
      }
      if (amount) break;
    }

    // Enhanced date detection
    const datePatterns = [
      /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/,
      /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/,
      /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2}),?\s+(\d{2,4})/i
    ];
    
    let purchaseDate = new Date().toISOString().split('T')[0];
    for (const pattern of datePatterns) {
      for (const line of lines) {
        const match = line.match(pattern);
        if (match) {
          try {
            let date: Date;
            if (pattern.source.includes('jan|feb')) {
              // Month name format
              const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
              const month = monthNames.indexOf(match[1].toLowerCase().substring(0, 3)) + 1;
              const day = parseInt(match[2]);
              let year = parseInt(match[3]);
              if (year < 100) year += 2000;
              date = new Date(year, month - 1, day);
            } else if (match[1].length === 4) {
              // YYYY-MM-DD format
              date = new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
            } else {
              // MM/DD/YYYY format
              let year = parseInt(match[3]);
              if (year < 100) year += 2000;
              date = new Date(year, parseInt(match[1]) - 1, parseInt(match[2]));
            }
            
            if (date.getTime() > 0 && date <= new Date()) {
              purchaseDate = date.toISOString().split('T')[0];
              break;
            }
          } catch (e) {
            continue;
          }
        }
      }
      if (purchaseDate !== new Date().toISOString().split('T')[0]) break;
    }

    // Enhanced store name detection
    let storeName = '';
    const storePatterns = [
      /^([A-Z][A-Z\s&]+)(?:\s+(?:STORE|SHOP|MARKET|MALL|CENTER))?$/,
      /^([A-Z][a-zA-Z\s&]+(?:STORE|SHOP|MARKET|MALL|CENTER))$/i,
      /^([A-Z][a-zA-Z\s&]{2,20})$/
    ];
    
    for (let i = 0; i < Math.min(5, lines.length); i++) {
      const line = lines[i];
      for (const pattern of storePatterns) {
        const match = line.match(pattern);
        if (match && match[1].length > 2 && match[1].length < 30) {
          storeName = match[1].trim();
          break;
        }
      }
      if (storeName) break;
    }

    // Enhanced brand detection with common brands
    const commonBrands = [
      'Apple', 'Samsung', 'Sony', 'LG', 'Dell', 'HP', 'Canon', 'Nikon', 'Nike', 'Adidas',
      'Microsoft', 'Google', 'Amazon', 'Best Buy', 'Target', 'Walmart', 'Costco', 'Home Depot',
      'Lowe\'s', 'Macy\'s', 'Nordstrom', 'Gap', 'Old Navy', 'H&M', 'Zara', 'Uniqlo'
    ];
    
    let brandName = 'Unknown Brand';
    const fullText = text.toLowerCase();
    
    for (const brand of commonBrands) {
      if (fullText.includes(brand.toLowerCase())) {
        brandName = brand;
        break;
      }
    }
    
    // If no common brand found, look for patterns
    if (brandName === 'Unknown Brand') {
      const brandPatterns = [
        /(?:brand|make|manufacturer)[\s:]+([A-Za-z]+)/i,
        /^([A-Z][a-z]+)\s+(?:model|product)/i
      ];
      
      for (const pattern of brandPatterns) {
        for (const line of lines) {
          const match = line.match(pattern);
          if (match && match[1].length > 2) {
            brandName = match[1];
            break;
          }
        }
        if (brandName !== 'Unknown Brand') break;
      }
    }

    // Enhanced product description
    let productDescription = 'Unknown Product';
    const productPatterns = [
      /(?:item|product|description)[\s:]+(.+)/i,
      /^([A-Za-z\s]+(?:phone|laptop|computer|camera|tv|monitor|tablet|watch|headphones|speaker))/i,
      /^([A-Za-z\s]{10,50})$/
    ];
    
    for (const pattern of productPatterns) {
      for (const line of lines) {
        const match = line.match(pattern);
        if (match && match[1].length > 5 && match[1].length < 100) {
          productDescription = match[1].trim();
          break;
        }
      }
      if (productDescription !== 'Unknown Product') break;
    }

    // Location detection
    let purchaseLocation = '';
    const locationPatterns = [
      /(\d+\s+[A-Za-z\s]+(?:street|st|avenue|ave|road|rd|blvd|boulevard|drive|dr|lane|ln|way|circle|cir|court|ct|place|pl))/i,
      /([A-Za-z\s]+,\s*[A-Z]{2}\s+\d{5})/,
      /([A-Za-z\s]+\s+\d{5})/
    ];
    
    for (const pattern of locationPatterns) {
      for (const line of lines) {
        const match = line.match(pattern);
        if (match) {
          purchaseLocation = match[1].trim();
          break;
        }
      }
      if (purchaseLocation) break;
    }

    // Model number detection
    let modelNumber = '';
    const modelPatterns = [
      /(?:model|part|item)[\s#:]+([A-Z0-9\-]+)/i,
      /([A-Z]{2,}\d{3,})/,
      /([A-Z]\d{4,})/
    ];
    
    for (const pattern of modelPatterns) {
      for (const line of lines) {
        const match = line.match(pattern);
        if (match && match[1].length > 3 && match[1].length < 20) {
          modelNumber = match[1];
          break;
        }
      }
      if (modelNumber) break;
    }

    return {
      product_description: productDescription,
      brand_name: brandName,
      store_name: storeName,
      purchase_location: purchaseLocation,
      purchase_date: purchaseDate,
      amount: amount,
      warranty_period: '1 year',
      extended_warranty: '',
      model_number: modelNumber,
      country: 'United States'
    };
  };

  const processReceipt = async () => {
    if (!capturedImage || !user) return;

    setIsProcessing(true);
    setError(null);
    initializeProcessingSteps();

    try {
      // Step 1: Upload image to Supabase storage
      updateProcessingStep('upload', 'processing', 'Converting image...');
      
      const imageBlob = dataURLtoBlob(capturedImage);
      const { data: uploadData, error: uploadError } = await uploadReceiptImage(imageBlob, user.id);
      
      if (uploadError) {
        updateProcessingStep('upload', 'error', uploadError.message);
        throw new Error(`Upload failed: ${uploadError.message}`);
      }
      
      updateProcessingStep('upload', 'completed', 'Image uploaded successfully');

      // Step 2: Perform OCR
      const { text: extractedText, confidence } = await performOCR(capturedImage);
      
      if (!extractedText || extractedText.trim().length < 10) {
        throw new Error('Could not extract sufficient text from image');
      }

      // Step 3: Process with GPT or fallback
      let receiptData: ReceiptData;
      let processingMethod = 'manual';
      
      try {
        receiptData = await processWithGPT(extractedText);
        processingMethod = 'gpt_structured';
        updateProcessingStep('validation', 'processing', 'Validating AI-extracted data...');
      } catch (gptError) {
        console.warn('GPT processing failed, using enhanced fallback:', gptError);
        updateProcessingStep('ai', 'error', 'AI processing failed, using enhanced parsing');
        
        receiptData = enhancedFallbackParsing(extractedText);
        processingMethod = 'fallback_parsing';
        updateProcessingStep('validation', 'processing', 'Validating parsed data...');
      }

      // Add metadata
      receiptData.image_url = uploadData?.url || '';
      receiptData.processing_method = processingMethod;
      receiptData.ocr_confidence = confidence;
      receiptData.extracted_text = extractedText;

      // Validate required fields
      if (!receiptData.product_description?.trim()) {
        receiptData.product_description = 'Receipt Item';
      }
      if (!receiptData.brand_name?.trim()) {
        receiptData.brand_name = 'Unknown Brand';
      }
      if (!receiptData.country?.trim()) {
        receiptData.country = 'United States';
      }

      updateProcessingStep('validation', 'completed', 'Data validation complete');

      setExtractedData(receiptData);
      setEditedData({ ...receiptData });

    } catch (error: any) {
      console.error('Processing error:', error);
      setError(error.message || 'Failed to process receipt');
      
      // Mark any pending steps as error
      setProcessingSteps(prev => prev.map(step => 
        step.status === 'pending' || step.status === 'processing' 
          ? { ...step, status: 'error', details: 'Processing interrupted' }
          : step
      ));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveReceipt = async () => {
    if (!editedData || !user) return;

    setIsSaving(true);
    setError(null);

    try {
      const { data, error: saveError } = await saveReceiptToDatabase(editedData, user.id);
      
      if (saveError) {
        throw new Error(saveError.message);
      }

      setSaveSuccess(true);
      
      // Reset after 3 seconds and go back to dashboard
      setTimeout(() => {
        onBackToDashboard();
      }, 2000);

    } catch (error: any) {
      console.error('Save error:', error);
      setError(error.message || 'Failed to save receipt');
    } finally {
      setIsSaving(false);
    }
  };

  const resetScanning = () => {
    setCapturedImage(null);
    setExtractedData(null);
    setEditedData(null);
    setIsEditing(false);
    setProcessingSteps([]);
    setError(null);
    setSaveSuccess(false);
  };

  const getProcessingMethodBadge = (method?: string) => {
    const badges = {
      'gpt_structured': { icon: Brain, label: 'AI Structured', color: 'bg-purple-100 text-purple-800' },
      'fallback_parsing': { icon: Zap, label: 'Smart Parsing', color: 'bg-blue-100 text-blue-800' },
      'ocr': { icon: Eye, label: 'OCR Only', color: 'bg-green-100 text-green-800' },
      'manual': { icon: Edit3, label: 'Manual Entry', color: 'bg-gray-100 text-gray-800' }
    };
    
    const badge = badges[method as keyof typeof badges] || badges.manual;
    const Icon = badge.icon;
    
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        <Icon className="h-3 w-3 mr-1" />
        {badge.label}
      </span>
    );
  };

  if (saveSuccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="bg-green-100 rounded-full p-4 w-16 h-16 mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-text-primary mb-2">Receipt Saved Successfully!</h2>
          <p className="text-text-secondary">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background font-['Inter',sans-serif]">
      {/* Header */}
      <header className="bg-white shadow-card border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <img 
                src="/Smart Receipt Logo.png" 
                alt="Smart Receipts Logo" 
                className="h-10 w-10 object-contain"
              />
              <span className="text-2xl font-bold bg-gradient-to-r from-teal-500 to-blue-600 bg-clip-text text-transparent">
                Smart Receipts
              </span>
            </div>

            {/* Header Actions */}
            <div className="flex items-center space-x-4">
              {/* Alerts */}
              <button className="relative p-2 text-text-secondary hover:text-text-primary transition-colors duration-200">
                <Bell className="h-6 w-6" />
                {alertsCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-accent-red text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                    {alertsCount}
                  </span>
                )}
              </button>

              {/* Back Button */}
              <button
                onClick={onBackToDashboard}
                className="flex items-center space-x-2 bg-white text-text-primary border-2 border-gray-300 hover:border-primary px-4 py-2 rounded-lg font-medium transition-all duration-200"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Back to Dashboard</span>
              </button>

              {/* User Menu */}
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200"
                >
                  <div className="bg-primary rounded-full p-2">
                    <User className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-sm font-medium text-text-primary hidden sm:inline">
                    {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}
                  </span>
                </button>

                {/* User Dropdown */}
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-card border border-gray-200 py-2 z-50">
                    <div className="px-4 py-2 border-b border-gray-200">
                      <p className="text-sm font-medium text-text-primary">
                        {user?.user_metadata?.full_name || 'User'}
                      </p>
                      <p className="text-xs text-text-secondary">{user?.email}</p>
                    </div>
                    <button
                      onClick={onBackToDashboard}
                      className="w-full text-left px-4 py-2 text-sm text-text-secondary hover:bg-gray-100 hover:text-text-primary transition-colors duration-200 flex items-center space-x-2"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      <span>Back to Dashboard</span>
                    </button>
                    <button
                      onClick={handleSignOut}
                      className="w-full text-left px-4 py-2 text-sm text-text-secondary hover:bg-gray-100 hover:text-text-primary transition-colors duration-200 flex items-center space-x-2"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-4">
            Scan Your Receipt
          </h1>
          <p className="text-xl text-text-secondary">
            Use AI-powered technology to instantly digitize and organize your receipts
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Capture Options */}
        {!capturedImage && !captureMode && (
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <button
              onClick={() => setCaptureMode('camera')}
              className="group bg-white p-8 rounded-2xl shadow-card hover:shadow-card-hover transition-all duration-300 transform hover:-translate-y-2 border border-gray-100"
            >
              <div className="text-center">
                <div className="bg-gradient-to-br from-primary/10 to-primary/20 rounded-full p-6 w-fit mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                  <Camera className="h-12 w-12 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-text-primary mb-2 group-hover:text-primary transition-colors duration-300">
                  Take Photo
                </h3>
                <p className="text-text-secondary">
                  Use your camera to capture a receipt photo
                </p>
              </div>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="group bg-white p-8 rounded-2xl shadow-card hover:shadow-card-hover transition-all duration-300 transform hover:-translate-y-2 border border-gray-100"
            >
              <div className="text-center">
                <div className="bg-gradient-to-br from-secondary/10 to-secondary/20 rounded-full p-6 w-fit mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                  <Upload className="h-12 w-12 text-secondary" />
                </div>
                <h3 className="text-xl font-bold text-text-primary mb-2 group-hover:text-secondary transition-colors duration-300">
                  Upload File
                </h3>
                <p className="text-text-secondary">
                  Select an image file from your device
                </p>
              </div>
            </button>
          </div>
        )}

        {/* Camera View */}
        {captureMode === 'camera' && (
          <div className="bg-white rounded-2xl shadow-card p-6 mb-8">
            <div className="text-center mb-4">
              <h3 className="text-xl font-bold text-text-primary mb-2">Position Your Receipt</h3>
              <p className="text-text-secondary">Make sure the receipt is clearly visible and well-lit</p>
            </div>
            
            <div className="relative max-w-md mx-auto">
              <Webcam
                ref={webcamRef}
                audio={false}
                screenshotFormat="image/jpeg"
                className="w-full rounded-lg"
                videoConstraints={{
                  facingMode: { ideal: "environment" }
                }}
              />
              
              <div className="flex justify-center space-x-4 mt-6">
                <button
                  onClick={() => setCaptureMode(null)}
                  className="flex items-center space-x-2 bg-gray-100 text-text-secondary px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors duration-200"
                >
                  <X className="h-4 w-4" />
                  <span>Cancel</span>
                </button>
                <button
                  onClick={capture}
                  className="flex items-center space-x-2 bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors duration-200"
                >
                  <Camera className="h-4 w-4" />
                  <span>Capture</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Captured Image Preview */}
        {capturedImage && !isProcessing && !extractedData && (
          <div className="bg-white rounded-2xl shadow-card p-6 mb-8">
            <div className="text-center mb-4">
              <h3 className="text-xl font-bold text-text-primary mb-2">Receipt Captured</h3>
              <p className="text-text-secondary">Review your image and process when ready</p>
            </div>
            
            <div className="max-w-md mx-auto">
              <img
                src={capturedImage}
                alt="Captured receipt"
                className="w-full rounded-lg shadow-md mb-6"
              />
              
              <div className="flex justify-center space-x-4">
                <button
                  onClick={resetScanning}
                  className="flex items-center space-x-2 bg-gray-100 text-text-secondary px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors duration-200"
                >
                  <X className="h-4 w-4" />
                  <span>Retake</span>
                </button>
                <button
                  onClick={processReceipt}
                  className="flex items-center space-x-2 bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors duration-200"
                >
                  <Brain className="h-4 w-4" />
                  <span>Process Receipt</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Processing Steps */}
        {isProcessing && (
          <div className="bg-white rounded-2xl shadow-card p-6 mb-8">
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-text-primary mb-2">Processing Your Receipt</h3>
              <p className="text-text-secondary">Please wait while we extract and organize the information</p>
            </div>
            
            <div className="space-y-4">
              {processingSteps.map((step) => (
                <div key={step.id} className="flex items-center space-x-4">
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    step.status === 'completed' ? 'bg-green-100' :
                    step.status === 'processing' ? 'bg-blue-100' :
                    step.status === 'error' ? 'bg-red-100' :
                    'bg-gray-100'
                  }`}>
                    {step.status === 'completed' && <CheckCircle className="h-5 w-5 text-green-600" />}
                    {step.status === 'processing' && <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />}
                    {step.status === 'error' && <AlertCircle className="h-5 w-5 text-red-600" />}
                    {step.status === 'pending' && <div className="w-3 h-3 bg-gray-400 rounded-full" />}
                  </div>
                  
                  <div className="flex-1">
                    <div className="font-medium text-text-primary">{step.label}</div>
                    {step.details && (
                      <div className="text-sm text-text-secondary">{step.details}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Extracted Data Form */}
        {extractedData && (
          <div className="bg-white rounded-2xl shadow-card p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-text-primary mb-2">Receipt Information</h3>
                <div className="flex items-center space-x-2">
                  <p className="text-text-secondary">Review and edit the extracted information</p>
                  {getProcessingMethodBadge(extractedData.processing_method)}
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                {!isEditing ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center space-x-2 bg-gray-100 text-text-secondary px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors duration-200"
                  >
                    <Edit3 className="h-4 w-4" />
                    <span>Edit</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setIsEditing(false)}
                    className="flex items-center space-x-2 bg-gray-100 text-text-secondary px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors duration-200"
                  >
                    <Eye className="h-4 w-4" />
                    <span>Preview</span>
                  </button>
                )}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Form Fields */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">Product Description *</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedData?.product_description || ''}
                      onChange={(e) => setEditedData(prev => prev ? { ...prev, product_description: e.target.value } : null)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="Enter product description"
                    />
                  ) : (
                    <div className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg">
                      {extractedData.product_description}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">Brand Name *</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedData?.brand_name || ''}
                      onChange={(e) => setEditedData(prev => prev ? { ...prev, brand_name: e.target.value } : null)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="Enter brand name"
                    />
                  ) : (
                    <div className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg">
                      {extractedData.brand_name}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">Store Name</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedData?.store_name || ''}
                      onChange={(e) => setEditedData(prev => prev ? { ...prev, store_name: e.target.value } : null)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="Enter store name"
                    />
                  ) : (
                    <div className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg">
                      {extractedData.store_name || 'Not specified'}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">Purchase Date *</label>
                  {isEditing ? (
                    <input
                      type="date"
                      value={editedData?.purchase_date || ''}
                      onChange={(e) => setEditedData(prev => prev ? { ...prev, purchase_date: e.target.value } : null)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  ) : (
                    <div className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg">
                      {new Date(extractedData.purchase_date).toLocaleDateString()}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">Amount</label>
                  {isEditing ? (
                    <input
                      type="number"
                      step="0.01"
                      value={editedData?.amount || ''}
                      onChange={(e) => setEditedData(prev => prev ? { ...prev, amount: e.target.value ? parseFloat(e.target.value) : null } : null)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="Enter amount"
                    />
                  ) : (
                    <div className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg">
                      {extractedData.amount ? `$${extractedData.amount.toFixed(2)}` : 'Not specified'}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">Warranty Period *</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedData?.warranty_period || ''}
                      onChange={(e) => setEditedData(prev => prev ? { ...prev, warranty_period: e.target.value } : null)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="e.g., 1 year, 2 years, 6 months"
                    />
                  ) : (
                    <div className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg">
                      {extractedData.warranty_period}
                    </div>
                  )}
                </div>
              </div>

              {/* Additional Fields */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">Purchase Location</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedData?.purchase_location || ''}
                      onChange={(e) => setEditedData(prev => prev ? { ...prev, purchase_location: e.target.value } : null)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="Enter store address or location"
                    />
                  ) : (
                    <div className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg">
                      {extractedData.purchase_location || 'Not specified'}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">Model Number</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedData?.model_number || ''}
                      onChange={(e) => setEditedData(prev => prev ? { ...prev, model_number: e.target.value } : null)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="Enter model number"
                    />
                  ) : (
                    <div className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg">
                      {extractedData.model_number || 'Not specified'}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">Extended Warranty</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedData?.extended_warranty || ''}
                      onChange={(e) => setEditedData(prev => prev ? { ...prev, extended_warranty: e.target.value } : null)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="Enter extended warranty details"
                    />
                  ) : (
                    <div className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg">
                      {extractedData.extended_warranty || 'None'}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">Country *</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedData?.country || ''}
                      onChange={(e) => setEditedData(prev => prev ? { ...prev, country: e.target.value } : null)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="Enter country"
                    />
                  ) : (
                    <div className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg">
                      {extractedData.country}
                    </div>
                  )}
                </div>

                {/* Processing Info */}
                {extractedData.ocr_confidence && (
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">OCR Confidence</label>
                    <div className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg">
                      {Math.round(extractedData.ocr_confidence * 100)}%
                    </div>
                  </div>
                )}

                {/* Receipt Image Preview */}
                {capturedImage && (
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">Receipt Image</label>
                    <img
                      src={capturedImage}
                      alt="Receipt"
                      className="w-full max-w-xs rounded-lg shadow-md"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-center space-x-4 mt-8">
              <button
                onClick={resetScanning}
                className="flex items-center space-x-2 bg-gray-100 text-text-secondary px-6 py-3 rounded-lg hover:bg-gray-200 transition-colors duration-200"
              >
                <X className="h-4 w-4" />
                <span>Start Over</span>
              </button>
              
              <button
                onClick={handleSaveReceipt}
                disabled={isSaving}
                className="flex items-center space-x-2 bg-primary text-white px-8 py-3 rounded-lg hover:bg-primary/90 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>Save Receipt</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          className="hidden"
        />
      </main>

      {/* Click outside to close user menu */}
      {showUserMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowUserMenu(false)}
        />
      )}
    </div>
  );
};

export default ReceiptScanning;