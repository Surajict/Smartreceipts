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
  Bell
} from 'lucide-react';
import Webcam from 'react-webcam';
import Tesseract from 'tesseract.js';
import { getCurrentUser, supabase, signOut } from '../lib/supabase';

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
  
  // Scanning states
  const [scanningMode, setScanningMode] = useState<'camera' | 'upload' | null>(null);
  const [showCamera, setShowCamera] = useState(false);
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
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    };
    loadUser();
  }, []);

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
      { id: 'ocr', name: 'Extracting text from image', status: 'pending' },
      { id: 'gpt', name: 'Structuring data with AI', status: 'pending' },
      { id: 'form', name: 'Preparing editable form', status: 'pending' }
    ];
    setProcessingSteps(steps);
  };

  const processWithTesseract = async (imageSource: string | File) => {
    updateProcessingStep('ocr', 'processing');
    
    try {
      const { data: { text } } = await Tesseract.recognize(
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
      setExtractedText(text);
      updateProcessingStep('ocr', 'completed', 'Text extracted successfully');
      
      if (text.trim()) {
        await processWithGPT(text);
      } else {
        updateProcessingStep('ocr', 'error', 'No text found in image');
        generateDynamicForm({});
      }
    } catch (error) {
      console.error('Tesseract error:', error);
      updateProcessingStep('ocr', 'error', 'Failed to extract text');
      generateDynamicForm({});
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
      generateDynamicForm(fallbackData);
      return;
    }

    try {
      const systemPrompt = `You are a reliable AI that extracts structured receipt details from plain text.
Extract the following fields and return ONLY valid JSON with these exact field names:

{
  "product_description": "main product or service purchased",
  "brand_name": "brand or manufacturer name",
  "store_name": "store or merchant name",
  "purchase_location": "store location or address",
  "purchase_date": "date in YYYY-MM-DD format",
  "amount": "total amount as number (no currency symbols)",
  "warranty_period": "warranty period (e.g., '1 year', '6 months')",
  "extended_warranty": "extended warranty if mentioned",
  "model_number": "product model number if available",
  "country": "country where purchased"
}

Return only the JSON object. If a field is not found, use empty string or null.`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiApiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: text }
          ],
          temperature: 0,
          max_tokens: 500
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const result = await response.json();
      const gptResponse = result.choices[0].message.content;
      
      try {
        const structuredData = JSON.parse(gptResponse);
        console.log('Structured data:', structuredData);
        updateProcessingStep('gpt', 'completed', 'Data structured successfully');
        generateDynamicForm(structuredData);
      } catch (parseError) {
        console.error('Failed to parse GPT response:', parseError);
        updateProcessingStep('gpt', 'error', 'Failed to parse AI response');
        const fallbackData = parseFallback(text);
        generateDynamicForm(fallbackData);
      }
    } catch (error) {
      console.error('GPT processing error:', error);
      updateProcessingStep('gpt', 'error', 'AI processing failed');
      const fallbackData = parseFallback(text);
      generateDynamicForm(fallbackData);
    }
  };

  const parseFallback = (text: string): ExtractedData => {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line);
    const data: ExtractedData = {};

    // Simple pattern matching for common receipt elements
    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      
      // Look for amounts
      const amountMatch = line.match(/\$?(\d+\.?\d*)/);
      if (amountMatch && !data.amount) {
        data.amount = parseFloat(amountMatch[1]);
      }
      
      // Look for dates
      const dateMatch = line.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/);
      if (dateMatch && !data.purchase_date) {
        const date = new Date(dateMatch[1]);
        if (!isNaN(date.getTime())) {
          data.purchase_date = date.toISOString().split('T')[0];
        }
      }
      
      // Look for store names (usually at the top)
      if (!data.store_name && lines.indexOf(line) < 3 && line.length > 3) {
        data.store_name = line;
      }
    }

    return data;
  };

  const generateDynamicForm = (data: ExtractedData) => {
    updateProcessingStep('form', 'processing');
    setStructuredData(data);
    setFormData({
      product_description: data.product_description || '',
      brand_name: data.brand_name || '',
      store_name: data.store_name || '',
      purchase_location: data.purchase_location || '',
      purchase_date: data.purchase_date || '',
      amount: data.amount || 0,
      warranty_period: data.warranty_period || '1 year',
      extended_warranty: data.extended_warranty || '',
      model_number: data.model_number || '',
      country: data.country || 'United States'
    });
    updateProcessingStep('form', 'completed', 'Form ready for review');
    setShowForm(true);
    setIsProcessing(false);
  };

  const handleCapture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      setCapturedImage(imageSrc);
      setShowCamera(false);
      startProcessing(imageSrc);
    }
  }, [webcamRef]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
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
    setIsProcessing(true);
    initializeProcessingSteps();
    await processWithTesseract(imageSource);
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
    }
    
    if (!formData.warranty_period?.trim()) {
      errors.warranty_period = 'Warranty period is required';
    }
    
    if (!formData.country?.trim()) {
      errors.country = 'Country is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFormSubmission = async () => {
    if (!validateForm() || !user) return;

    setIsSaving(true);
    setSaveError(null);

    try {
      // Upload image to Supabase storage if we have one
      let imageUrl = null;
      if (uploadedFile || capturedImage) {
        const fileName = `${user.id}/${Date.now()}-receipt.jpg`;
        
        let fileToUpload: File;
        if (uploadedFile) {
          fileToUpload = uploadedFile;
        } else if (capturedImage) {
          // Convert base64 to file
          const response = await fetch(capturedImage);
          const blob = await response.blob();
          fileToUpload = new File([blob], 'captured-receipt.jpg', { type: 'image/jpeg' });
        } else {
          throw new Error('No image to upload');
        }

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('receipt-images')
          .upload(fileName, fileToUpload);

        if (uploadError) {
          console.error('Image upload error:', uploadError);
        } else {
          const { data: urlData } = supabase.storage
            .from('receipt-images')
            .getPublicUrl(fileName);
          imageUrl = urlData.publicUrl;
        }
      }

      // Insert receipt data
      const receiptData = {
        user_id: user.id,
        product_description: formData.product_description,
        brand_name: formData.brand_name,
        store_name: formData.store_name || null,
        purchase_location: formData.purchase_location || null,
        purchase_date: formData.purchase_date,
        amount: formData.amount || null,
        warranty_period: formData.warranty_period,
        extended_warranty: formData.extended_warranty || null,
        model_number: formData.model_number || null,
        country: formData.country,
        image_url: imageUrl,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('receipts')
        .insert([receiptData]);

      if (error) {
        throw error;
      }

      console.log('Receipt saved successfully:', data);
      setSaveSuccess(true);
      
      // Reset form after successful save
      setTimeout(() => {
        resetScanning();
      }, 2000);

    } catch (error: any) {
      console.error('Save error:', error);
      setSaveError(error.message || 'Failed to save receipt');
    } finally {
      setIsSaving(false);
    }
  };

  const resetScanning = () => {
    setScanningMode(null);
    setShowCamera(false);
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

  const formatFieldName = (field: string) => {
    return field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
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
            Your receipt has been processed and saved to your library.
          </p>
          <div className="space-y-4">
            <button
              onClick={resetScanning}
              className="w-full bg-primary text-white py-3 px-4 rounded-lg font-medium hover:bg-primary/90 transition-colors duration-200"
            >
              Scan Another Receipt
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
            Scan Your Receipt
          </h1>
          <p className="text-xl text-text-secondary">
            Capture or upload your receipt to automatically extract and organize the data
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

        {/* Scanning Options */}
        {!scanningMode && !showForm && (
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <button
              onClick={() => {
                setScanningMode('camera');
                setShowCamera(true);
              }}
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
              onClick={() => {
                setScanningMode('upload');
                fileInputRef.current?.click();
              }}
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
                  facingMode: 'environment'
                }}
              />
              
              <div className="flex justify-center space-x-4 mt-4">
                <button
                  onClick={handleCapture}
                  className="bg-primary text-white px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors duration-200 flex items-center space-x-2"
                >
                  <Camera className="h-5 w-5" />
                  <span>Capture</span>
                </button>
                <button
                  onClick={() => {
                    setShowCamera(false);
                    setScanningMode(null);
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
              <h3 className="text-xl font-bold text-text-primary">Review & Edit Receipt Details</h3>
              <button
                onClick={resetScanning}
                className="text-text-secondary hover:text-text-primary transition-colors duration-200"
              >
                <RefreshCw className="h-5 w-5" />
              </button>
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
                    value={formData.amount || ''}
                    onChange={(e) => handleInputChange('amount', parseFloat(e.target.value) || 0)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors duration-200"
                    placeholder="0.00"
                  />
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
                      <span>Saving...</span>
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