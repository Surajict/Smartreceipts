import React, { useState, useRef, useCallback } from 'react';
import { 
  ArrowLeft, 
  Camera, 
  Upload, 
  FileText, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  X,
  Edit3,
  Save,
  RefreshCw,
  Eye,
  EyeOff,
  Calendar,
  DollarSign,
  Tag,
  Store,
  MapPin,
  Shield,
  User,
  LogOut,
  Bell,
  RotateCcw,
  Maximize,
  ScanLine
} from 'lucide-react';
import Webcam from 'react-webcam';
import Tesseract from 'tesseract.js';
import { 
  getCurrentUser, 
  signOut, 
  saveReceiptToDatabase, 
  uploadReceiptImage 
} from '../lib/supabase';

interface ReceiptScanningProps {
  onBackToDashboard: () => void;
}

interface ExtractedData {
  product_description?: string;
  brand_name?: string;
  store_name?: string;
  purchase_location?: string;
  purchase_date?: string;
  amount?: number;
  warranty_period?: string;
  extended_warranty?: string;
  model_number?: string;
  country?: string;
  processing_method?: string;
  ocr_confidence?: number;
  extracted_text?: string;
  image_url?: string;
}

interface ProcessingStep {
  id: string;
  name: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  message?: string;
}

const ReceiptScanning: React.FC<ReceiptScanningProps> = ({ onBackToDashboard }) => {
  const [user, setUser] = useState<any>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [alertsCount] = useState(3);
  
  // Main mode selection
  const [selectedMode, setSelectedMode] = useState<'scan-upload' | 'manual' | null>(null);
  
  // Scanning states
  const [scanningMode, setScanningMode] = useState<'camera' | 'upload' | 'panoramic' | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [isPanoramicMode, setIsPanoramicMode] = useState(false);
  const [panoramicImages, setPanoramicImages] = useState<string[]>([]);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  
  // Processing states
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingSteps, setProcessingSteps] = useState<ProcessingStep[]>([]);
  const [extractedText, setExtractedText] = useState<string>('');
  const [structuredData, setStructuredData] = useState<ExtractedData>({});
  const [showExtractedText, setShowExtractedText] = useState(false);
  
  // Form states
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<ExtractedData>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  
  const webcamRef = useRef<Webcam>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await getCurrentUser();
        if (!currentUser) {
          console.error('No authenticated user found');
          onBackToDashboard();
          return;
        }
        console.log('Loaded user for receipt scanning:', currentUser.id);
        setUser(currentUser);
      } catch (error) {
        console.error('Error loading user:', error);
        onBackToDashboard();
      }
    };
    loadUser();
  }, [onBackToDashboard]);

  const handleSignOut = async () => {
    try {
      await signOut();
      window.location.href = '/';
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const updateProcessingStep = (stepId: string, status: ProcessingStep['status'], message?: string) => {
    setProcessingSteps(prev => prev.map(step => 
      step.id === stepId ? { ...step, status, message } : step
    ));
  };

  const initializeProcessingSteps = () => {
    const steps: ProcessingStep[] = [
      { id: 'upload', name: 'Uploading image to secure storage', status: 'pending' },
      { id: 'ocr', name: 'Extracting text from image', status: 'pending' },
      { id: 'gpt', name: 'Structuring data with AI', status: 'pending' },
      { id: 'form', name: 'Preparing editable form', status: 'pending' }
    ];
    setProcessingSteps(steps);
  };

  const processWithTesseract = async (imageSource: string | File) => {
    updateProcessingStep('ocr', 'processing');
    
    try {
      console.log('Starting Tesseract OCR processing...');
      const { data: { text, confidence } } = await Tesseract.recognize(
        imageSource,
        'eng',
        {
          logger: m => {
            if (m.status === 'recognizing text') {
              updateProcessingStep('ocr', 'processing', `${Math.round(m.progress * 100)}% complete`);
            }
          }
        }
      );
      
      console.log('Extracted text:', text);
      console.log('OCR confidence:', confidence);
      
      setExtractedText(text);
      setStructuredData(prev => ({ 
        ...prev, 
        extracted_text: text, 
        ocr_confidence: confidence / 100,
        processing_method: 'ocr'
      }));
      
      updateProcessingStep('ocr', 'completed', `Text extracted with ${Math.round(confidence)}% confidence`);
      
      if (text.trim()) {
        await processWithGPT(text);
      } else {
        updateProcessingStep('ocr', 'error', 'No text found in image');
        generateDynamicForm({ extracted_text: text, processing_method: 'manual' });
      }
    } catch (error) {
      console.error('Tesseract error:', error);
      updateProcessingStep('ocr', 'error', 'Failed to extract text');
      generateDynamicForm({ processing_method: 'manual' });
    }
  };

  const processWithGPT = async (text: string) => {
    updateProcessingStep('gpt', 'processing');
    
    // Check if OpenAI API key is available
    const openaiApiKey = import.meta.env.VITE_OPENAI_API_KEY;
    
    if (!openaiApiKey) {
      console.warn('OpenAI API key not found, using enhanced fallback parsing');
      updateProcessingStep('gpt', 'completed', 'Using enhanced fallback text parsing');
      const fallbackData = parseReceiptWithEnhancedFallback(text);
      generateDynamicForm({ 
        ...fallbackData, 
        extracted_text: text, 
        processing_method: 'fallback_parsing' 
      });
      return;
    }

    try {
      // Enhanced GPT prompt with strict formatting requirements
      const systemPrompt = `You are an expert receipt data extraction AI. Your task is to extract structured information from receipt text and return ONLY a valid JSON object.

CRITICAL INSTRUCTIONS:
1. Return ONLY the JSON object - no explanations, no markdown, no additional text
2. Use these EXACT field names (case-sensitive)
3. All text fields must be strings, amounts must be numbers
4. If a field cannot be determined, use empty string "" for text or null for numbers

REQUIRED JSON STRUCTURE:
{
  "product_description": "main product or service purchased",
  "brand_name": "brand or manufacturer name", 
  "store_name": "store or merchant name",
  "purchase_location": "store address or city",
  "purchase_date": "date in YYYY-MM-DD format",
  "amount": number_without_currency_symbols,
  "warranty_period": "warranty duration like '1 year' or '6 months'",
  "extended_warranty": "extended warranty details if any",
  "model_number": "product model/SKU if available",
  "country": "country where purchased"
}

EXTRACTION RULES:
- For product_description: Extract the main item purchased, be specific
- For brand_name: Look for manufacturer/brand names (Apple, Samsung, etc.)
- For store_name: Extract merchant name (Best Buy, Amazon, etc.)
- For purchase_location: Extract store address, city, or location
- For purchase_date: Convert any date format to YYYY-MM-DD
- For amount: Extract total amount as number only (no $, currency symbols)
- For warranty_period: Look for warranty terms, default to "1 year" if unclear
- For model_number: Extract product model, SKU, or part number
- For country: Default to "United States" if not specified

IMPORTANT:
- Be precise with amounts - extract the final total paid
- For dates, ensure YYYY-MM-DD format (e.g., "2024-01-15")
- For warranty, use common formats: "1 year", "2 years", "6 months"
- If multiple products, focus on the main/most expensive item

Receipt text to process:
${text}`;

      console.log('Sending request to OpenAI with enhanced prompt...');

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
              content: 'You are a precise receipt data extraction expert. Return only valid JSON with the exact structure requested.' 
            },
            { 
              role: 'user', 
              content: systemPrompt 
            }
          ],
          temperature: 0.1,
          max_tokens: 1000,
          top_p: 0.9
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenAI API error:', response.status, errorText);
        throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      
      if (!result.choices || !result.choices[0] || !result.choices[0].message) {
        throw new Error('Invalid response structure from OpenAI');
      }

      const gptResponse = result.choices[0].message.content.trim();
      console.log('Raw GPT Response:', gptResponse);
      
      try {
        // Enhanced JSON extraction and cleaning
        const cleanedData = extractAndValidateJSON(gptResponse, text);
        
        console.log('Successfully parsed and validated GPT data:', cleanedData);
        updateProcessingStep('gpt', 'completed', 'Data structured successfully with AI');
        generateDynamicForm({ 
          ...cleanedData, 
          extracted_text: text, 
          processing_method: 'gpt_structured' 
        });
      } catch (parseError) {
        console.error('Failed to parse GPT response:', parseError);
        console.log('Raw GPT response that failed to parse:', gptResponse);
        updateProcessingStep('gpt', 'error', 'AI parsing failed, using fallback');
        
        // Use enhanced fallback parsing
        const fallbackData = parseReceiptWithEnhancedFallback(text);
        generateDynamicForm({ 
          ...fallbackData, 
          extracted_text: text, 
          processing_method: 'fallback_parsing' 
        });
      }
    } catch (error: any) {
      console.error('GPT processing error:', error);
      updateProcessingStep('gpt', 'error', `AI processing failed: ${error.message}`);
      
      // Use enhanced fallback parsing
      const fallbackData = parseReceiptWithEnhancedFallback(text);
      generateDynamicForm({ 
        ...fallbackData, 
        extracted_text: text, 
        processing_method: 'fallback_parsing' 
      });
    }
  };

  const extractAndValidateJSON = (gptResponse: string, originalText: string): ExtractedData => {
    let jsonString = gptResponse.trim();
    
    // Remove markdown formatting
    if (jsonString.includes('```json')) {
      jsonString = jsonString.replace(/```json\s*/g, '').replace(/```\s*$/g, '');
    } else if (jsonString.includes('```')) {
      jsonString = jsonString.replace(/```\s*/g, '').replace(/```\s*$/g, '');
    }
    
    // Find JSON object boundaries
    const jsonStart = jsonString.indexOf('{');
    const jsonEnd = jsonString.lastIndexOf('}') + 1;
    
    if (jsonStart === -1 || jsonEnd <= jsonStart) {
      throw new Error('No valid JSON object found in response');
    }
    
    jsonString = jsonString.substring(jsonStart, jsonEnd);
    
    // Parse JSON
    let parsedData;
    try {
      parsedData = JSON.parse(jsonString);
    } catch (e) {
      // Try to fix common JSON issues
      jsonString = jsonString
        .replace(/,\s*}/g, '}')  // Remove trailing commas
        .replace(/,\s*]/g, ']')  // Remove trailing commas in arrays
        .replace(/([{,]\s*)(\w+):/g, '$1"$2":')  // Quote unquoted keys
        .replace(/:\s*'([^']*)'/g, ': "$1"');  // Replace single quotes with double quotes
      
      try {
        parsedData = JSON.parse(jsonString);
      } catch (e2) {
        throw new Error(`JSON parsing failed: ${e2.message}`);
      }
    }
    
    // Validate and clean the extracted data
    const cleanedData: ExtractedData = {
      product_description: validateAndCleanString(parsedData.product_description),
      brand_name: validateAndCleanString(parsedData.brand_name),
      store_name: validateAndCleanString(parsedData.store_name),
      purchase_location: validateAndCleanString(parsedData.purchase_location),
      purchase_date: validateAndCleanDate(parsedData.purchase_date),
      amount: validateAndCleanAmount(parsedData.amount),
      warranty_period: validateAndCleanString(parsedData.warranty_period) || '1 year',
      extended_warranty: validateAndCleanString(parsedData.extended_warranty),
      model_number: validateAndCleanString(parsedData.model_number),
      country: validateAndCleanString(parsedData.country) || 'United States'
    };
    
    // Validate required fields and apply fallbacks if needed
    if (!cleanedData.product_description) {
      const fallbackProduct = extractProductFromText(originalText);
      cleanedData.product_description = fallbackProduct || 'Product';
    }
    
    if (!cleanedData.brand_name) {
      const fallbackBrand = extractBrandFromText(originalText);
      cleanedData.brand_name = fallbackBrand || 'Unknown Brand';
    }
    
    if (!cleanedData.purchase_date) {
      const fallbackDate = extractDateFromText(originalText);
      cleanedData.purchase_date = fallbackDate || new Date().toISOString().split('T')[0];
    }
    
    return cleanedData;
  };

  const validateAndCleanString = (value: any): string => {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
    return '';
  };

  const validateAndCleanDate = (value: any): string => {
    if (typeof value === 'string' && value.trim()) {
      const date = new Date(value.trim());
      if (!isNaN(date.getTime()) && date.getFullYear() > 2000 && date <= new Date()) {
        return date.toISOString().split('T')[0];
      }
    }
    return '';
  };

  const validateAndCleanAmount = (value: any): number | null => {
    if (typeof value === 'number' && value > 0 && value < 1000000) {
      return Math.round(value * 100) / 100; // Round to 2 decimal places
    }
    if (typeof value === 'string') {
      const numValue = parseFloat(value.replace(/[^0-9.]/g, ''));
      if (!isNaN(numValue) && numValue > 0 && numValue < 1000000) {
        return Math.round(numValue * 100) / 100;
      }
    }
    return null;
  };

  const parseReceiptWithEnhancedFallback = (text: string): ExtractedData => {
    console.log('Using enhanced fallback parsing for text:', text);
    
    const lines = text.split('\n').map(line => line.trim()).filter(line => line);
    const data: ExtractedData = {};

    // Enhanced amount extraction with multiple patterns
    const amountPatterns = [
      /(?:total|amount|sum|grand\s*total|final)[:\s]*\$?(\d+\.?\d*)/i,
      /\$(\d+\.\d{2})(?!\d)/g,
      /(\d+\.\d{2})\s*(?:total|usd|dollars?)/i,
      /(?:^|\s)(\d{1,4}\.\d{2})(?:\s|$)/g
    ];
    
    const amounts: number[] = [];
    for (const pattern of amountPatterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        const amount = parseFloat(match[1]);
        if (amount > 0 && amount < 10000) {
          amounts.push(amount);
        }
      }
    }
    
    if (amounts.length > 0) {
      // Use the largest reasonable amount (likely the total)
      data.amount = Math.max(...amounts);
    }
    
    // Enhanced date extraction
    data.purchase_date = extractDateFromText(text);
    
    // Enhanced store name extraction
    data.store_name = extractStoreFromText(lines);
    
    // Enhanced product extraction
    data.product_description = extractProductFromText(text);
    
    // Enhanced brand extraction
    data.brand_name = extractBrandFromText(text);
    
    // Extract location information
    data.purchase_location = extractLocationFromText(text);
    
    // Extract model number
    data.model_number = extractModelFromText(text);
    
    // Set defaults for required fields
    data.country = data.country || 'United States';
    data.warranty_period = data.warranty_period || '1 year';
    data.purchase_date = data.purchase_date || new Date().toISOString().split('T')[0];
    
    console.log('Enhanced fallback parsing result:', data);
    return data;
  };

  const extractDateFromText = (text: string): string => {
    const datePatterns = [
      /(\d{4}[-\/]\d{1,2}[-\/]\d{1,2})/,
      /(\d{1,2}[-\/]\d{1,2}[-\/]\d{4})/,
      /(\d{1,2}[-\/]\d{1,2}[-\/]\d{2})/,
      /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2},?\s+\d{4}/i,
      /\d{1,2}\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{4}/i
    ];
    
    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match) {
        const date = new Date(match[1] || match[0]);
        if (!isNaN(date.getTime()) && date.getFullYear() > 2000 && date <= new Date()) {
          return date.toISOString().split('T')[0];
        }
      }
    }
    return '';
  };

  const extractStoreFromText = (lines: string[]): string => {
    const storeIndicators = ['store', 'shop', 'market', 'inc', 'llc', 'corp', 'ltd'];
    const avoidWords = ['receipt', 'invoice', 'total', 'subtotal', 'tax', 'date', 'time', 'thank', 'you'];
    
    // Check first few lines for store name
    for (let i = 0; i < Math.min(5, lines.length); i++) {
      const line = lines[i];
      if (line.length > 2 && line.length < 50) {
        const lowerLine = line.toLowerCase();
        const hasAvoidWord = avoidWords.some(word => lowerLine.includes(word));
        const hasStoreIndicator = storeIndicators.some(word => lowerLine.includes(word));
        
        if (!hasAvoidWord && (hasStoreIndicator || i < 3)) {
          if (!/^\d+$/.test(line) && !/^[\d\s\-\(\)]+$/.test(line)) {
            return line;
          }
        }
      }
    }
    return '';
  };

  const extractProductFromText = (text: string): string => {
    const productPatterns = [
      /(?:item|product|description)[:\s]+([^\n\r]+)/i,
      /^([A-Za-z][A-Za-z0-9\s]{5,30})(?:\s+\$|\s+\d+\.\d{2})/m
    ];
    
    for (const pattern of productPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    
    // Fallback: look for lines that might be products
    const lines = text.split('\n').map(line => line.trim()).filter(line => line);
    for (const line of lines) {
      if (line.length > 5 && line.length < 50 && 
          /[A-Za-z]/.test(line) && 
          !line.toLowerCase().includes('total') &&
          !line.toLowerCase().includes('tax') &&
          !line.toLowerCase().includes('receipt')) {
        return line;
      }
    }
    
    return '';
  };

  const extractBrandFromText = (text: string): string => {
    const commonBrands = [
      'apple', 'samsung', 'google', 'microsoft', 'sony', 'lg', 'hp', 'dell', 'lenovo',
      'nike', 'adidas', 'amazon', 'walmart', 'target', 'best buy', 'costco', 'home depot',
      'starbucks', 'mcdonalds', 'subway', 'dominos', 'pizza hut', 'kfc', 'taco bell'
    ];
    
    const lowerText = text.toLowerCase();
    for (const brand of commonBrands) {
      if (lowerText.includes(brand)) {
        return brand.charAt(0).toUpperCase() + brand.slice(1);
      }
    }
    
    // Look for brand patterns
    const brandPatterns = [
      /(?:brand|manufacturer)[:\s]+([^\n\r]+)/i,
      /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:inc|corp|ltd|llc)/i
    ];
    
    for (const pattern of brandPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    
    return '';
  };

  const extractLocationFromText = (text: string): string => {
    const locationPatterns = [
      /(?:address|location)[:\s]+([^\n\r]+)/i,
      /\d+\s+[A-Za-z\s]+(?:st|street|ave|avenue|rd|road|blvd|boulevard|dr|drive)/i,
      /([A-Za-z\s]+,\s*[A-Z]{2}\s*\d{5})/
    ];
    
    for (const pattern of locationPatterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1] ? match[1].trim() : match[0].trim();
      }
    }
    return '';
  };

  const extractModelFromText = (text: string): string => {
    const modelPatterns = [
      /(?:model|sku|part\s*#|item\s*#)[:\s]+([A-Za-z0-9\-]+)/i,
      /([A-Z]{2,}\d{3,})/,
      /([A-Za-z]+\d{3,}[A-Za-z]*)/
    ];
    
    for (const pattern of modelPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    return '';
  };

  const generateDynamicForm = (data: ExtractedData) => {
    updateProcessingStep('form', 'processing');
    setStructuredData(data);
    
    // Ensure we have default values for required fields
    const formDataWithDefaults = {
      product_description: data.product_description || '',
      brand_name: data.brand_name || '',
      store_name: data.store_name || '',
      purchase_location: data.purchase_location || '',
      purchase_date: data.purchase_date || new Date().toISOString().split('T')[0],
      amount: data.amount || 0,
      warranty_period: data.warranty_period || '1 year',
      extended_warranty: data.extended_warranty || '',
      model_number: data.model_number || '',
      country: data.country || 'United States',
      processing_method: data.processing_method || 'manual',
      ocr_confidence: data.ocr_confidence || null,
      extracted_text: data.extracted_text || '',
      image_url: data.image_url || null
    };
    
    setFormData(formDataWithDefaults);
    updateProcessingStep('form', 'completed', 'Form ready for review and editing');
    setShowForm(true);
    setIsProcessing(false);
  };

  const handleCapture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      if (isPanoramicMode) {
        setPanoramicImages(prev => [...prev, imageSrc]);
      } else {
        setCapturedImage(imageSrc);
        setShowCamera(false);
        startProcessing(imageSrc);
      }
    }
  }, [webcamRef, isPanoramicMode]);

  const handlePanoramicComplete = () => {
    if (panoramicImages.length > 0) {
      // For now, use the first image for processing
      // In a real implementation, you might want to stitch images together
      setCapturedImage(panoramicImages[0]);
      setShowCamera(false);
      setIsPanoramicMode(false);
      startProcessing(panoramicImages[0]);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setSaveError('Please select a valid image file');
        return;
      }
      
      // Validate file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        setSaveError('File size must be less than 10MB');
        return;
      }
      
      setUploadedFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageSrc = e.target?.result as string;
        setCapturedImage(imageSrc);
        startProcessing(file);
      };
      reader.readAsDataURL(file);
    }
  };

  const startProcessing = async (imageSource: string | File) => {
    console.log('Starting processing with image source:', typeof imageSource);
    setIsProcessing(true);
    setSaveError(null);
    initializeProcessingSteps();

    // First upload the image to Supabase storage
    if (user) {
      updateProcessingStep('upload', 'processing');
      
      try {
        let fileToUpload: File;
        if (typeof imageSource === 'string') {
          // Convert base64 to file
          const response = await fetch(imageSource);
          const blob = await response.blob();
          fileToUpload = new File([blob], 'captured-receipt.jpg', { type: 'image/jpeg' });
        } else {
          fileToUpload = imageSource;
        }

        const { data: uploadData, error: uploadError } = await uploadReceiptImage(
          fileToUpload, 
          user.id
        );

        if (uploadError) {
          console.warn('Image upload failed:', uploadError);
          updateProcessingStep('upload', 'error', 'Image upload failed, continuing without storage');
        } else {
          console.log('Image uploaded successfully:', uploadData);
          updateProcessingStep('upload', 'completed', 'Image uploaded securely');
          setStructuredData(prev => ({ ...prev, image_url: uploadData.url }));
        }
      } catch (uploadErr) {
        console.warn('Image upload error:', uploadErr);
        updateProcessingStep('upload', 'error', 'Image upload failed, continuing without storage');
      }
    }

    // Continue with OCR processing
    await processWithTesseract(imageSource);
  };

  const startManualEntry = () => {
    setSelectedMode('manual');
    generateDynamicForm({ processing_method: 'manual' });
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!formData.product_description?.trim()) {
      errors.product_description = 'Product description is required';
    }
    
    if (!formData.brand_name?.trim()) {
      errors.brand_name = 'Brand name is required';
    }
    
    if (!formData.purchase_date) {
      errors.purchase_date = 'Purchase date is required';
    } else {
      // Validate date is not in the future
      const purchaseDate = new Date(formData.purchase_date);
      const today = new Date();
      if (purchaseDate > today) {
        errors.purchase_date = 'Purchase date cannot be in the future';
      }
    }
    
    if (!formData.warranty_period?.trim()) {
      errors.warranty_period = 'Warranty period is required';
    }
    
    if (!formData.country?.trim()) {
      errors.country = 'Country is required';
    }

    if (formData.amount && formData.amount < 0) {
      errors.amount = 'Amount cannot be negative';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFormSubmission = async () => {
    if (!validateForm() || !user) {
      console.error('Form validation failed or no user');
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      console.log('Starting receipt submission for user:', user.id);
      
      // Save receipt to database using the enhanced function
      const { data, error } = await saveReceiptToDatabase(formData, user.id);

      if (error) {
        throw new Error(error.message);
      }

      console.log('Receipt saved successfully:', data);
      setSaveSuccess(true);
      
      // Reset form after successful save
      setTimeout(() => {
        resetScanning();
      }, 3000);

    } catch (error: any) {
      console.error('Save error:', error);
      setSaveError(error.message || 'Failed to save receipt. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const resetScanning = () => {
    setSelectedMode(null);
    setScanningMode(null);
    setShowCamera(false);
    setIsPanoramicMode(false);
    setPanoramicImages([]);
    setCapturedImage(null);
    setUploadedFile(null);
    setIsProcessing(false);
    setProcessingSteps([]);
    setExtractedText('');
    setStructuredData({});
    setShowForm(false);
    setFormData({});
    setFormErrors({});
    setSaveSuccess(false);
    setSaveError(null);
    setShowExtractedText(false);
  };

  const handleInputChange = (field: keyof ExtractedData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const getStepIcon = (status: ProcessingStep['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'processing':
        return <Loader2 className="h-5 w-5 text-primary animate-spin" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <div className="h-5 w-5 rounded-full border-2 border-gray-300" />;
    }
  };

  // Show loading if no user
  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-text-secondary">Loading...</p>
        </div>
      </div>
    );
  }

  if (saveSuccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-card p-8 text-center">
          <div className="bg-green-100 rounded-full p-4 w-16 h-16 mx-auto mb-6">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-text-primary mb-4">
            Receipt Saved Successfully!
          </h2>
          <p className="text-text-secondary mb-6">
            Your receipt has been processed and securely saved to your library with full Supabase integration.
          </p>
          <div className="space-y-4">
            <button
              onClick={resetScanning}
              className="w-full bg-primary text-white py-3 px-4 rounded-lg font-medium hover:bg-primary/90 transition-colors duration-200"
            >
              Add Another Receipt
            </button>
            <button
              onClick={onBackToDashboard}
              className="w-full border border-gray-300 text-text-secondary py-3 px-4 rounded-lg font-medium hover:bg-gray-50 transition-colors duration-200"
            >
              Back to Dashboard
            </button>
          </div>
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
            Add Your Receipt
          </h1>
          <p className="text-xl text-text-secondary">
            Choose how you'd like to add your receipt data with enhanced AI processing
          </p>
        </div>

        {/* Error Message */}
        {saveError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
              <p className="text-sm text-red-700">{saveError}</p>
            </div>
          </div>
        )}

        {/* Main Mode Selection */}
        {!selectedMode && !showForm && (
          <div className="grid md:grid-cols-2 gap-8 mb-8">
            {/* Scan & Upload Section */}
            <div className="bg-white rounded-2xl shadow-card p-8 border border-gray-100">
              <div className="text-center mb-6">
                <div className="bg-gradient-to-br from-primary/10 to-secondary/10 rounded-full p-6 w-fit mx-auto mb-4">
                  <ScanLine className="h-12 w-12 text-primary" />
                </div>
                <h3 className="text-2xl font-bold text-text-primary mb-2">
                  Scan & Upload
                </h3>
                <p className="text-text-secondary">
                  Capture or upload receipt images for automatic data extraction with enhanced AI
                </p>
              </div>

              <div className="space-y-4">
                <button
                  onClick={() => {
                    setSelectedMode('scan-upload');
                    setScanningMode('camera');
                    setShowCamera(true);
                  }}
                  className="w-full flex items-center justify-center space-x-3 bg-primary text-white py-4 px-6 rounded-lg font-medium hover:bg-primary/90 transition-colors duration-200"
                >
                  <Camera className="h-5 w-5" />
                  <span>Take Photo</span>
                </button>

                <button
                  onClick={() => {
                    setSelectedMode('scan-upload');
                    setScanningMode('panoramic');
                    setShowCamera(true);
                    setIsPanoramicMode(true);
                  }}
                  className="w-full flex items-center justify-center space-x-3 bg-secondary text-white py-4 px-6 rounded-lg font-medium hover:bg-secondary/90 transition-colors duration-200"
                >
                  <Maximize className="h-5 w-5" />
                  <span>Panoramic Capture</span>
                </button>

                <button
                  onClick={() => {
                    setSelectedMode('scan-upload');
                    setScanningMode('upload');
                    fileInputRef.current?.click();
                  }}
                  className="w-full flex items-center justify-center space-x-3 border-2 border-primary text-primary py-4 px-6 rounded-lg font-medium hover:bg-primary hover:text-white transition-colors duration-200"
                >
                  <Upload className="h-5 w-5" />
                  <span>Upload File</span>
                </button>
              </div>
            </div>

            {/* Manual Entry Section */}
            <div className="bg-white rounded-2xl shadow-card p-8 border border-gray-100">
              <div className="text-center mb-6">
                <div className="bg-gradient-to-br from-accent-yellow/10 to-accent-yellow/20 rounded-full p-6 w-fit mx-auto mb-4">
                  <FileText className="h-12 w-12 text-accent-yellow" />
                </div>
                <h3 className="text-2xl font-bold text-text-primary mb-2">
                  Manual Entry
                </h3>
                <p className="text-text-secondary">
                  Enter receipt details manually using our comprehensive form
                </p>
              </div>

              <button
                onClick={startManualEntry}
                className="w-full flex items-center justify-center space-x-3 bg-accent-yellow text-text-primary py-4 px-6 rounded-lg font-medium hover:bg-accent-yellow/90 transition-colors duration-200"
              >
                <Edit3 className="h-5 w-5" />
                <span>Start Manual Entry</span>
              </button>

              <div className="mt-4 text-center">
                <p className="text-sm text-text-secondary">
                  Perfect for receipts that are hard to scan or when you prefer manual input
                </p>
              </div>
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

        {/* Camera View */}
        {showCamera && (
          <div className="bg-white rounded-2xl shadow-card p-6 mb-8">
            <div className="text-center mb-4">
              <h3 className="text-xl font-bold text-text-primary mb-2">
                {isPanoramicMode ? 'Panoramic Capture Mode' : 'Position Your Receipt'}
              </h3>
              <p className="text-text-secondary">
                {isPanoramicMode 
                  ? 'Take multiple photos to capture a large receipt. Tap capture for each section.'
                  : 'Make sure the receipt is clearly visible and well-lit'
                }
              </p>
            </div>
            
            <div className="relative max-w-md mx-auto">
              <Webcam
                ref={webcamRef}
                audio={false}
                screenshotFormat="image/jpeg"
                className="w-full rounded-lg"
                videoConstraints={{
                  facingMode: 'environment'
                }}
              />
              
              {/* Panoramic Images Preview */}
              {isPanoramicMode && panoramicImages.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm text-text-secondary mb-2">
                    Captured {panoramicImages.length} image(s)
                  </p>
                  <div className="flex space-x-2 overflow-x-auto">
                    {panoramicImages.map((img, index) => (
                      <img
                        key={index}
                        src={img}
                        alt={`Panoramic ${index + 1}`}
                        className="w-16 h-16 object-cover rounded border"
                      />
                    ))}
                  </div>
                </div>
              )}
              
              <div className="flex justify-center space-x-4 mt-4">
                <button
                  onClick={handleCapture}
                  className="bg-primary text-white px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors duration-200 flex items-center space-x-2"
                >
                  <Camera className="h-5 w-5" />
                  <span>{isPanoramicMode ? 'Capture Section' : 'Capture'}</span>
                </button>
                
                {isPanoramicMode && panoramicImages.length > 0 && (
                  <button
                    onClick={handlePanoramicComplete}
                    className="bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 transition-colors duration-200 flex items-center space-x-2"
                  >
                    <CheckCircle className="h-5 w-5" />
                    <span>Complete</span>
                  </button>
                )}
                
                <button
                  onClick={() => {
                    setShowCamera(false);
                    setSelectedMode(null);
                    setScanningMode(null);
                    setIsPanoramicMode(false);
                    setPanoramicImages([]);
                  }}
                  className="border border-gray-300 text-text-secondary px-6 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors duration-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Processing Steps */}
        {isProcessing && (
          <div className="bg-white rounded-2xl shadow-card p-6 mb-8">
            <h3 className="text-xl font-bold text-text-primary mb-6">Processing Your Receipt</h3>
            
            <div className="space-y-4">
              {processingSteps.map((step, index) => (
                <div key={step.id} className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    {getStepIcon(step.status)}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-text-primary">{step.name}</div>
                    {step.message && (
                      <div className="text-sm text-text-secondary">{step.message}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Captured Image Preview */}
        {capturedImage && !isProcessing && (
          <div className="bg-white rounded-2xl shadow-card p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-text-primary">Captured Receipt</h3>
              <button
                onClick={resetScanning}
                className="text-text-secondary hover:text-text-primary transition-colors duration-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="max-w-md mx-auto">
              <img
                src={capturedImage}
                alt="Captured receipt"
                className="w-full rounded-lg border border-gray-200"
              />
            </div>

            {/* Show Extracted Text Toggle */}
            {extractedText && (
              <div className="mt-4 text-center">
                <button
                  onClick={() => setShowExtractedText(!showExtractedText)}
                  className="text-primary hover:text-primary/80 font-medium text-sm flex items-center space-x-2 mx-auto"
                >
                  {showExtractedText ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  <span>{showExtractedText ? 'Hide' : 'Show'} Extracted Text</span>
                </button>
                
                {showExtractedText && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg text-left">
                    <pre className="text-sm text-text-secondary whitespace-pre-wrap font-mono">
                      {extractedText}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Dynamic Form */}
        {showForm && (
          <div className="bg-white rounded-2xl shadow-card p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-text-primary">
                {selectedMode === 'manual' ? 'Manual Receipt Entry' : 'Review & Edit Receipt Details'}
              </h3>
              <div className="flex items-center space-x-2">
                {structuredData.processing_method && (
                  <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                    {structuredData.processing_method.replace('_', ' ')}
                  </span>
                )}
                <button
                  onClick={resetScanning}
                  className="text-text-secondary hover:text-text-primary transition-colors duration-200"
                >
                  <RefreshCw className="h-5 w-5" />
                </button>
              </div>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleFormSubmission(); }} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Product Description */}
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    <FileText className="inline h-4 w-4 mr-1" />
                    Product Description *
                  </label>
                  <input
                    type="text"
                    value={formData.product_description || ''}
                    onChange={(e) => handleInputChange('product_description', e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors duration-200 ${
                      formErrors.product_description ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                    placeholder="Enter product description"
                  />
                  {formErrors.product_description && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.product_description}</p>
                  )}
                </div>

                {/* Brand Name */}
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    <Tag className="inline h-4 w-4 mr-1" />
                    Brand Name *
                  </label>
                  <input
                    type="text"
                    value={formData.brand_name || ''}
                    onChange={(e) => handleInputChange('brand_name', e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors duration-200 ${
                      formErrors.brand_name ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                    placeholder="Enter brand name"
                  />
                  {formErrors.brand_name && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.brand_name}</p>
                  )}
                </div>

                {/* Store Name */}
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    <Store className="inline h-4 w-4 mr-1" />
                    Store Name
                  </label>
                  <input
                    type="text"
                    value={formData.store_name || ''}
                    onChange={(e) => handleInputChange('store_name', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors duration-200"
                    placeholder="Enter store name"
                  />
                </div>

                {/* Purchase Location */}
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    <MapPin className="inline h-4 w-4 mr-1" />
                    Purchase Location
                  </label>
                  <input
                    type="text"
                    value={formData.purchase_location || ''}
                    onChange={(e) => handleInputChange('purchase_location', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors duration-200"
                    placeholder="Enter store location"
                  />
                </div>

                {/* Purchase Date */}
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    <Calendar className="inline h-4 w-4 mr-1" />
                    Purchase Date *
                  </label>
                  <input
                    type="date"
                    value={formData.purchase_date || ''}
                    onChange={(e) => handleInputChange('purchase_date', e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors duration-200 ${
                      formErrors.purchase_date ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                  />
                  {formErrors.purchase_date && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.purchase_date}</p>
                  )}
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    <DollarSign className="inline h-4 w-4 mr-1" />
                    Amount
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.amount || ''}
                    onChange={(e) => handleInputChange('amount', parseFloat(e.target.value) || 0)}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors duration-200 ${
                      formErrors.amount ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                    placeholder="0.00"
                  />
                  {formErrors.amount && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.amount}</p>
                  )}
                </div>

                {/* Model Number */}
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Model Number
                  </label>
                  <input
                    type="text"
                    value={formData.model_number || ''}
                    onChange={(e) => handleInputChange('model_number', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors duration-200"
                    placeholder="Enter model number"
                  />
                </div>

                {/* Country */}
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Country *
                  </label>
                  <input
                    type="text"
                    value={formData.country || ''}
                    onChange={(e) => handleInputChange('country', e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors duration-200 ${
                      formErrors.country ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                    placeholder="Enter country"
                  />
                  {formErrors.country && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.country}</p>
                  )}
                </div>
              </div>

              {/* Warranty Fields */}
              <div className="border-t border-gray-200 pt-6">
                <h4 className="text-lg font-semibold text-text-primary mb-4 flex items-center">
                  <Shield className="h-5 w-5 mr-2" />
                  Warranty Information
                </h4>
                
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Warranty Period */}
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      Warranty Period *
                    </label>
                    <input
                      type="text"
                      value={formData.warranty_period || ''}
                      onChange={(e) => handleInputChange('warranty_period', e.target.value)}
                      className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors duration-200 ${
                        formErrors.warranty_period ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                      placeholder="e.g., 1 year, 6 months"
                    />
                    {formErrors.warranty_period && (
                      <p className="mt-1 text-sm text-red-600">{formErrors.warranty_period}</p>
                    )}
                  </div>

                  {/* Extended Warranty */}
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      Extended Warranty
                    </label>
                    <input
                      type="text"
                      value={formData.extended_warranty || ''}
                      onChange={(e) => handleInputChange('extended_warranty', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors duration-200"
                      placeholder="Enter extended warranty details"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={resetScanning}
                  className="px-6 py-3 border border-gray-300 text-text-secondary rounded-lg font-medium hover:bg-gray-50 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Saving to Supabase...</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-5 w-5" />
                      <span>Save Receipt</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
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