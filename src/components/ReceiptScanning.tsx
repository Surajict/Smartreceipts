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
  Bell
} from 'lucide-react';
import { getCurrentUser, signOut, saveReceiptToDatabase, uploadReceiptImage, testOpenAIConnection, extractReceiptDataWithGPT } from '../lib/supabase';
import { createWorker } from 'tesseract.js';

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

const ReceiptScanning: React.FC<ReceiptScanningProps> = ({ onBackToDashboard }) => {
  const [user, setUser] = useState<any>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState('');
  const [extractedText, setExtractedText] = useState('');
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [alertsCount] = useState(3);
  const [openaiAvailable, setOpenaiAvailable] = useState<boolean | null>(null);
  
  const webcamRef = useRef<Webcam>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadUser();
    checkOpenAIAvailability();
  }, []);

  const loadUser = async () => {
    const currentUser = await getCurrentUser();
    setUser(currentUser);
  };

  const checkOpenAIAvailability = async () => {
    const available = await testOpenAIConnection();
    setOpenaiAvailable(available);
    if (!available) {
      console.warn('OpenAI API not available - AI features will be limited');
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      window.location.href = '/';
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      setCapturedImage(imageSrc);
      setShowCamera(false);
    }
  }, [webcamRef]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setCapturedImage(e.target?.result as string);
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

  const performOCR = async (imageSource: string | File): Promise<string> => {
    setProcessingStep('Initializing OCR engine...');
    setOcrProgress(10);

    const worker = await createWorker('eng');
    
    setProcessingStep('Analyzing receipt image...');
    setOcrProgress(30);

    try {
      const { data: { text, confidence } } = await worker.recognize(imageSource);
      
      setProcessingStep('Extracting text from receipt...');
      setOcrProgress(80);
      
      console.log('OCR Confidence:', confidence);
      console.log('Extracted text:', text);
      
      await worker.terminate();
      setOcrProgress(100);
      
      return text;
    } catch (error) {
      await worker.terminate();
      throw error;
    }
  };

  const fallbackDataExtraction = (text: string): ExtractedData => {
    console.log('Using fallback data extraction');
    
    // Simple pattern matching for common receipt elements
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    // Try to find amount
    const amountPattern = /\$?(\d+\.?\d*)/g;
    const amounts = text.match(amountPattern);
    const amount = amounts ? parseFloat(amounts[amounts.length - 1].replace('$', '')) : null;
    
    // Try to find date
    const datePattern = /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/g;
    const dateMatch = text.match(datePattern);
    let purchaseDate = new Date().toISOString().split('T')[0];
    if (dateMatch) {
      const date = new Date(dateMatch[0]);
      if (!isNaN(date.getTime())) {
        purchaseDate = date.toISOString().split('T')[0];
      }
    }
    
    // Extract potential store name (usually first few lines)
    const storeName = lines[0] || 'Unknown Store';
    
    return {
      product_description: 'Receipt Item',
      brand_name: 'Unknown Brand',
      store_name: storeName,
      purchase_location: 'Unknown Location',
      purchase_date: purchaseDate,
      amount: amount,
      warranty_period: '1 year',
      extended_warranty: '',
      model_number: '',
      country: 'United States'
    };
  };

  const processReceipt = async () => {
    if (!capturedImage && !uploadedFile) {
      setError('Please capture or upload an image first');
      return;
    }

    if (!user) {
      setError('User not authenticated');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setSuccess(false);
    setOcrProgress(0);

    try {
      // Step 1: Upload image to storage
      setProcessingStep('Uploading image...');
      const imageFile = uploadedFile || dataURLtoBlob(capturedImage!);
      
      const { data: uploadData, error: uploadError } = await uploadReceiptImage(imageFile, user.id);
      
      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      // Step 2: Perform OCR
      const text = await performOCR(uploadedFile || capturedImage!);
      setExtractedText(text);

      if (!text.trim()) {
        throw new Error('No text could be extracted from the image');
      }

      // Step 3: Structure data with GPT or fallback
      let structuredData: ExtractedData;
      let processingMethod = 'manual';

      try {
        if (openaiAvailable) {
          setProcessingStep('Processing with AI...');
          const { data: gptData, error: gptError } = await extractReceiptDataWithGPT(text);
          
          if (gptError) {
            throw new Error(gptError.message);
          }
          
          structuredData = gptData!;
          processingMethod = 'gpt_structured';
        } else {
          throw new Error('OpenAI not available');
        }
      } catch (gptError) {
        console.warn('GPT processing failed, using fallback:', gptError);
        setProcessingStep('Using fallback processing...');
        structuredData = fallbackDataExtraction(text);
        processingMethod = 'fallback_parsing';
      }

      setExtractedData(structuredData);

      // Step 4: Save to database
      setProcessingStep('Saving receipt...');
      const receiptData = {
        ...structuredData,
        image_url: uploadData?.url,
        processing_method: processingMethod,
        ocr_confidence: 0.85, // Mock confidence score
        extracted_text: text
      };

      const { error: saveError } = await saveReceiptToDatabase(receiptData, user.id);

      if (saveError) {
        throw new Error(`Save failed: ${saveError.message}`);
      }

      setSuccess(true);
      setProcessingStep('Receipt saved successfully!');

    } catch (err: any) {
      console.error('Processing error:', err);
      setError(err.message || 'Failed to process receipt');
    } finally {
      setIsProcessing(false);
    }
  };

  const resetForm = () => {
    setCapturedImage(null);
    setUploadedFile(null);
    setExtractedText('');
    setExtractedData(null);
    setError(null);
    setSuccess(false);
    setOcrProgress(0);
    setProcessingStep('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const updateExtractedData = (field: keyof ExtractedData, value: string | number | null) => {
    if (extractedData) {
      setExtractedData({
        ...extractedData,
        [field]: value
      });
    }
  };

  const saveManualData = async () => {
    if (!extractedData || !user) {
      setError('No data to save');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      let imageUrl = null;
      
      if (capturedImage) {
        const { data: uploadData, error: uploadError } = await uploadReceiptImage(dataURLtoBlob(capturedImage), user.id);
        if (uploadError) {
          console.warn('Failed to upload image:', uploadError);
        } else {
          imageUrl = uploadData?.url;
        }
      }

      const receiptData = {
        ...extractedData,
        image_url: imageUrl,
        processing_method: 'manual',
        ocr_confidence: null,
        extracted_text: extractedText
      };

      const { error: saveError } = await saveReceiptToDatabase(receiptData, user.id);

      if (saveError) {
        throw new Error(`Save failed: ${saveError.message}`);
      }

      setSuccess(true);
    } catch (err: any) {
      console.error('Save error:', err);
      setError(err.message || 'Failed to save receipt');
    } finally {
      setIsProcessing(false);
    }
  };

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
            Capture or upload your receipt and let AI extract the details automatically
          </p>
        </div>

        {/* OpenAI Status Warning */}
        {openaiAvailable === false && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-yellow-600 mr-2" />
              <p className="text-sm text-yellow-700">
                OpenAI API not available. AI features will be limited. Manual data entry will be required.
              </p>
            </div>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center">
              <Check className="h-5 w-5 text-green-600 mr-2" />
              <p className="text-sm text-green-700">Receipt saved successfully!</p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Camera Modal */}
        {showCamera && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-card max-w-2xl w-full">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-text-primary">Capture Receipt</h2>
                <button
                  onClick={() => setShowCamera(false)}
                  className="text-text-secondary hover:text-text-primary transition-colors duration-200"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="p-6">
                <div className="relative">
                  <Webcam
                    ref={webcamRef}
                    audio={false}
                    screenshotFormat="image/jpeg"
                    className="w-full rounded-lg"
                    videoConstraints={{
                      facingMode: 'environment'
                    }}
                  />
                </div>
                
                <div className="flex justify-center mt-6">
                  <button
                    onClick={capture}
                    className="bg-primary text-white px-8 py-4 rounded-full font-medium hover:bg-primary/90 transition-colors duration-200 flex items-center space-x-2"
                  >
                    <Camera className="h-5 w-5" />
                    <span>Capture</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Column - Image Capture/Upload */}
          <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6">
            <h2 className="text-xl font-bold text-text-primary mb-6">1. Capture or Upload Receipt</h2>
            
            {!capturedImage ? (
              <div className="space-y-4">
                {/* Camera Capture */}
                <button
                  onClick={() => setShowCamera(true)}
                  className="w-full bg-gradient-to-r from-primary to-secondary text-white p-6 rounded-xl font-medium hover:from-primary/90 hover:to-secondary/90 transition-all duration-200 flex items-center justify-center space-x-3"
                >
                  <Camera className="h-6 w-6" />
                  <span>Take Photo</span>
                </button>

                {/* File Upload */}
                <div className="relative">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full border-2 border-dashed border-gray-300 hover:border-primary p-6 rounded-xl transition-colors duration-200 flex items-center justify-center space-x-3 text-text-secondary hover:text-primary"
                  >
                    <Upload className="h-6 w-6" />
                    <span>Upload Image</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Image Preview */}
                <div className="relative">
                  <img
                    src={capturedImage}
                    alt="Receipt"
                    className="w-full rounded-lg shadow-md"
                  />
                  <button
                    onClick={resetForm}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2 hover:bg-red-600 transition-colors duration-200"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Process Button */}
                <button
                  onClick={processReceipt}
                  disabled={isProcessing}
                  className="w-full bg-primary text-white p-4 rounded-xl font-medium hover:bg-primary/90 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="h-5 w-5" />
                      <span>Process Receipt</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Right Column - Processing Status & Results */}
          <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6">
            <h2 className="text-xl font-bold text-text-primary mb-6">2. Processing Status</h2>
            
            {isProcessing && (
              <div className="space-y-4">
                {/* Progress Bar */}
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${ocrProgress}%` }}
                  ></div>
                </div>
                
                {/* Current Step */}
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <span className="text-text-secondary">{processingStep}</span>
                </div>
              </div>
            )}

            {/* Processing Steps */}
            <div className="space-y-3">
              <div className={`flex items-center space-x-3 p-3 rounded-lg ${extractedText ? 'bg-green-50 border border-green-200' : 'bg-gray-50'}`}>
                <div className={`rounded-full p-1 ${extractedText ? 'bg-green-500' : 'bg-gray-300'}`}>
                  {extractedText ? <Check className="h-3 w-3 text-white" /> : <Eye className="h-3 w-3 text-white" />}
                </div>
                <span className={`text-sm ${extractedText ? 'text-green-700' : 'text-text-secondary'}`}>
                  OCR Text Extraction
                </span>
              </div>

              <div className={`flex items-center space-x-3 p-3 rounded-lg ${extractedData ? 'bg-green-50 border border-green-200' : 'bg-gray-50'}`}>
                <div className={`rounded-full p-1 ${extractedData ? 'bg-green-500' : 'bg-gray-300'}`}>
                  {extractedData ? <Check className="h-3 w-3 text-white" /> : <Brain className="h-3 w-3 text-white" />}
                </div>
                <span className={`text-sm ${extractedData ? 'text-green-700' : 'text-text-secondary'}`}>
                  AI Data Structuring
                </span>
              </div>

              <div className={`flex items-center space-x-3 p-3 rounded-lg ${success ? 'bg-green-50 border border-green-200' : 'bg-gray-50'}`}>
                <div className={`rounded-full p-1 ${success ? 'bg-green-500' : 'bg-gray-300'}`}>
                  {success ? <Check className="h-3 w-3 text-white" /> : <Save className="h-3 w-3 text-white" />}
                </div>
                <span className={`text-sm ${success ? 'text-green-700' : 'text-text-secondary'}`}>
                  Save to Database
                </span>
              </div>
            </div>

            {/* Extracted Text Preview */}
            {extractedText && (
              <div className="mt-6">
                <h3 className="font-medium text-text-primary mb-2">Extracted Text:</h3>
                <div className="bg-gray-50 p-3 rounded-lg max-h-32 overflow-y-auto">
                  <pre className="text-xs text-text-secondary whitespace-pre-wrap">{extractedText}</pre>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Extracted Data Form */}
        {extractedData && (
          <div className="mt-8 bg-white rounded-2xl shadow-card border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-text-primary">3. Review & Edit Details</h2>
              <div className="flex items-center space-x-2">
                <button
                  onClick={resetForm}
                  className="flex items-center space-x-2 text-text-secondary hover:text-text-primary transition-colors duration-200"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>Start Over</span>
                </button>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Product Information */}
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Product Description *
                </label>
                <input
                  type="text"
                  value={extractedData.product_description}
                  onChange={(e) => updateExtractedData('product_description', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors duration-200"
                  placeholder="Enter product description"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Brand Name *
                </label>
                <input
                  type="text"
                  value={extractedData.brand_name}
                  onChange={(e) => updateExtractedData('brand_name', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors duration-200"
                  placeholder="Enter brand name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Store Name
                </label>
                <input
                  type="text"
                  value={extractedData.store_name}
                  onChange={(e) => updateExtractedData('store_name', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors duration-200"
                  placeholder="Enter store name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Purchase Location
                </label>
                <input
                  type="text"
                  value={extractedData.purchase_location}
                  onChange={(e) => updateExtractedData('purchase_location', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors duration-200"
                  placeholder="Enter purchase location"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Purchase Date *
                </label>
                <input
                  type="date"
                  value={extractedData.purchase_date}
                  onChange={(e) => updateExtractedData('purchase_date', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors duration-200"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Amount
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={extractedData.amount || ''}
                  onChange={(e) => updateExtractedData('amount', e.target.value ? parseFloat(e.target.value) : null)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors duration-200"
                  placeholder="Enter amount"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Warranty Period *
                </label>
                <input
                  type="text"
                  value={extractedData.warranty_period}
                  onChange={(e) => updateExtractedData('warranty_period', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors duration-200"
                  placeholder="e.g., 1 year, 6 months"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Model Number
                </label>
                <input
                  type="text"
                  value={extractedData.model_number}
                  onChange={(e) => updateExtractedData('model_number', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors duration-200"
                  placeholder="Enter model number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Extended Warranty
                </label>
                <input
                  type="text"
                  value={extractedData.extended_warranty}
                  onChange={(e) => updateExtractedData('extended_warranty', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors duration-200"
                  placeholder="Enter extended warranty details"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Country *
                </label>
                <input
                  type="text"
                  value={extractedData.country}
                  onChange={(e) => updateExtractedData('country', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors duration-200"
                  placeholder="Enter country"
                />
              </div>
            </div>

            {/* Save Button */}
            <div className="mt-8 flex justify-end">
              <button
                onClick={saveManualData}
                disabled={isProcessing || success}
                className="bg-primary text-white px-8 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : success ? (
                  <>
                    <Check className="h-5 w-5" />
                    <span>Saved</span>
                  </>
                ) : (
                  <>
                    <Save className="h-5 w-5" />
                    <span>Save Receipt</span>
                  </>
                )}
              </button>
            </div>
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