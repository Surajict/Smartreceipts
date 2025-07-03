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
      console.warn('OpenAI API key not found, using fallback parsing');
      updateProcessingStep('gpt', 'completed', 'Using fallback text parsing');
      const fallbackData = parseFallback(text);
      generateDynamicForm({ 
        ...fallbackData, 
        extracted_text: text, 
        processing_method: 'fallback_parsing' 
      });
      return;
    }

    try {
      const systemPrompt = `You are a receipt data extraction expert. Extract structured information from receipt text and return ONLY a valid JSON object with these exact field names:

{
  "product_description": "main product or service purchased (required)",
  "brand_name": "brand or manufacturer name (required)",
  "store_name": "store or merchant name",
  "purchase_location": "store location, address, or city",
  "purchase_date": "date in YYYY-MM-DD format (required)",
  "amount": "total amount as number without currency symbols",
  "warranty_period": "warranty period like '1 year', '6 months', '2 years' (required)",
  "extended_warranty": "extended warranty details if mentioned",
  "model_number": "product model number or SKU if available",
  "country": "country where purchased (default to 'United States' if not clear)"
}

IMPORTANT RULES:
1. Return ONLY the JSON object, no other text
2. Use empty string "" for missing text fields
3. Use null for missing numeric fields
4. For warranty_period, if not explicitly mentioned, use "1 year" as default
5. For country, if not mentioned, use "United States"
6. Extract the most relevant product from the receipt
7. Be precise with dates - convert to YYYY-MM-DD format
8. For amounts, extract the total/final amount paid

Receipt text to process:
${text}`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiApiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: systemPrompt }
          ],
          temperature: 0.1,
          max_tokens: 800
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const result = await response.json();
      const gptResponse = result.choices[0].message.content.trim();
      
      console.log('GPT Response:', gptResponse);
      
      try {
        // Clean the response to extract JSON
        let jsonString = gptResponse;
        
        // Remove any markdown formatting
        if (jsonString.includes('```json')) {
          jsonString = jsonString.replace(/```json\s*/, '').replace(/```\s*$/, '');
        } else if (jsonString.includes('```')) {
          jsonString = jsonString.replace(/```\s*/, '').replace(/```\s*$/, '');
        }
        
        // Find JSON object boundaries
        const jsonStart = jsonString.indexOf('{');
        const jsonEnd = jsonString.lastIndexOf('}') + 1;
        
        if (jsonStart !== -1 && jsonEnd > jsonStart) {
          jsonString = jsonString.substring(jsonStart, jsonEnd);
        }
        
        const structuredData = JSON.parse(jsonString);
        
        // Validate and clean the extracted data
        const cleanedData = {
          product_description: structuredData.product_description || '',
          brand_name: structuredData.brand_name || '',
          store_name: structuredData.store_name || '',
          purchase_location: structuredData.purchase_location || '',
          purchase_date: structuredData.purchase_date || new Date().toISOString().split('T')[0],
          amount: structuredData.amount && !isNaN(Number(structuredData.amount)) ? Number(structuredData.amount) : null,
          warranty_period: structuredData.warranty_period || '1 year',
          extended_warranty: structuredData.extended_warranty || '',
          model_number: structuredData.model_number || '',
          country: structuredData.country || 'United States'
        };
        
        console.log('Cleaned structured data from GPT:', cleanedData);
        updateProcessingStep('gpt', 'completed', 'Data structured successfully with AI');
        generateDynamicForm({ 
          ...cleanedData, 
          extracted_text: text, 
          processing_method: 'gpt_structured' 
        });
      } catch (parseError) {
        console.error('Failed to parse GPT response:', parseError);
        console.log('Raw GPT response that failed to parse:', gptResponse);
        updateProcessingStep('gpt', 'error', 'Failed to parse AI response');
        const fallbackData = parseFallback(text);
        generateDynamicForm({ 
          ...fallbackData, 
          extracted_text: text, 
          processing_method: 'fallback_parsing' 
        });
      }
    } catch (error) {
      console.error('GPT processing error:', error);
      updateProcessingStep('gpt', 'error', 'AI processing failed');
      const fallbackData = parseFallback(text);
      generateDynamicForm({ 
        ...fallbackData, 
        extracted_text: text, 
        processing_method: 'fallback_parsing' 
      });
    }
  };

  const parseFallback = (text: string): ExtractedData => {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line);
    const data: ExtractedData = {};

    console.log('Using fallback parsing for text:', text);

    // Simple pattern matching for common receipt elements
    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      
      // Look for amounts (more comprehensive patterns)
      const amountPatterns = [
        /total[:\s]*\$?(\d+\.?\d*)/i,
        /amount[:\s]*\$?(\d+\.?\d*)/i,
        /\$(\d+\.\d{2})/,
        /(\d+\.\d{2})/
      ];
      
      for (const pattern of amountPatterns) {
        const amountMatch = line.match(pattern);
        if (amountMatch && !data.amount) {
          const amount = parseFloat(amountMatch[1]);
          if (amount > 0 && amount < 10000) { // Reasonable range
            data.amount = amount;
            break;
          }
        }
      }
      
      // Look for dates (multiple formats)
      const datePatterns = [
        /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/,
        /(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})/,
        /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2},?\s+\d{4}/i
      ];
      
      for (const pattern of datePatterns) {
        const dateMatch = line.match(pattern);
        if (dateMatch && !data.purchase_date) {
          const date = new Date(dateMatch[1]);
          if (!isNaN(date.getTime()) && date.getFullYear() > 2000) {
            data.purchase_date = date.toISOString().split('T')[0];
            break;
          }
        }
      }
      
      // Look for store names (usually at the top, avoid common receipt words)
      const avoidWords = ['receipt', 'invoice', 'total', 'subtotal', 'tax', 'date', 'time'];
      if (!data.store_name && lines.indexOf(line) < 5 && line.length > 3 && line.length < 50) {
        const hasAvoidWord = avoidWords.some(word => lowerLine.includes(word));
        if (!hasAvoidWord && !/^\d+$/.test(line) && !/^[\d\s\-\(\)]+$/.test(line)) {
          data.store_name = line;
        }
      }
    }

    // Set defaults for required fields
    if (!data.country) data.country = 'United States';
    if (!data.warranty_period) data.warranty_period = '1 year';
    if (!data.purchase_date) data.purchase_date = new Date().toISOString().split('T')[0];

    console.log('Fallback parsing result:', data);
    return data;
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
    updateProcessingStep('form', 'completed', 'Form ready for review');
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
            Choose how you'd like to add your receipt data with secure Supabase integration
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
                  Capture or upload receipt images for automatic data extraction
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