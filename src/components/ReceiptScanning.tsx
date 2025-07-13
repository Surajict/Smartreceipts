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
  Edit3,
  RotateCcw,
  Plus,
  Maximize2,
  Settings
} from 'lucide-react';
import { getCurrentUser, signOut, uploadReceiptImage, testOpenAIConnection, extractReceiptDataWithGPT } from '../lib/supabase';
import { OCRService, OCREngine } from '../services/ocrService';
import { MultiProductReceiptService } from '../services/multiProductReceiptService';
import { ExtractedReceiptData } from '../types/receipt';
import NotificationDropdown from './NotificationDropdown';

interface ReceiptScanningProps {
  onBackToDashboard: () => void;
}

// Use the imported type instead of local interface
type ExtractedData = ExtractedReceiptData;

type CaptureMode = 'normal' | 'long';
type InputMode = 'capture' | 'upload' | 'manual';

const ReceiptScanning: React.FC<ReceiptScanningProps> = ({ onBackToDashboard }) => {
  const [user, setUser] = useState<any>(null);
  const [inputMode, setInputMode] = useState<InputMode>('capture');
  const [captureMode, setCaptureMode] = useState<CaptureMode>('normal');
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
  const [openaiAvailable, setOpenaiAvailable] = useState<boolean | null>(null);
  const [showExtractedForm, setShowExtractedForm] = useState(false);
  
  // OCR Engine - Always uses Google Cloud Vision
  const selectedOCREngine: OCREngine = 'google-cloud-vision';
  
  // Long receipt capture states
  const [isCapturingLong, setIsCapturingLong] = useState(false);
  const [captureProgress, setCaptureProgress] = useState(0);
  const [capturedFrames, setCapturedFrames] = useState<string[]>([]);
  const [longCaptureInstructions, setLongCaptureInstructions] = useState('');
  
  const webcamRef = useRef<Webcam>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const captureIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const frameCountRef = useRef(0);

  useEffect(() => {
    loadUser();
    checkOpenAIAvailability();
    setPreferredOCREngine();
  }, []);

  const setPreferredOCREngine = async () => {
    try {
      const preferredEngine = await OCRService.getPreferredEngine();
      // selectedOCREngine is now a constant, no need to set it
      console.log('Using OCR engine:', preferredEngine);
    } catch (error) {
      console.warn('Failed to check OCR engine:', error);
      // Always use 'google-cloud-vision'
    }
  };

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

  const startLongCapture = useCallback(() => {
    if (!webcamRef.current) return;
    
    setIsCapturingLong(true);
    setCaptureProgress(0);
    setCapturedFrames([]);
    frameCountRef.current = 0;
    setLongCaptureInstructions('Hold and slowly move camera across the receipt...');
    
    // Capture frames every 200ms while button is held
    captureIntervalRef.current = setInterval(() => {
      const imageSrc = webcamRef.current?.getScreenshot();
      if (imageSrc) {
        setCapturedFrames(prev => [...prev, imageSrc]);
        frameCountRef.current += 1;
        setCaptureProgress(Math.min((frameCountRef.current / 15) * 100, 100)); // Max 15 frames
        
        if (frameCountRef.current >= 15) {
          stopLongCapture();
        }
      }
    }, 200);
  }, [webcamRef]);

  const stopLongCapture = useCallback(() => {
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current);
      captureIntervalRef.current = null;
    }
    
    setIsCapturingLong(false);
    setLongCaptureInstructions('Processing captured frames...');
    
    // Combine frames into a single long image (simplified approach)
    if (capturedFrames.length > 0) {
      // For now, use the middle frame as the best capture
      // In a real implementation, you'd stitch the frames together
      const bestFrame = capturedFrames[Math.floor(capturedFrames.length / 2)];
      setCapturedImage(bestFrame);
      setShowCamera(false);
      setCapturedFrames([]);
      setCaptureProgress(0);
      setLongCaptureInstructions('');
    }
  }, [capturedFrames]);

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
    const result = await OCRService.extractText(
      imageSource,
      selectedOCREngine,
      (progress, step) => {
        setOcrProgress(progress);
        setProcessingStep(step);
      }
    );

    if (result.error) {
      throw new Error(result.error);
    }

    console.log(`OCR Engine: ${result.engine}`);
    console.log('OCR Confidence:', result.confidence);
    console.log('Processing Time:', `${result.processingTime}ms`);
    console.log('Extracted text:', result.text);

    return result.text;
  };

  const fallbackDataExtraction = (text: string): ExtractedData => {
    console.log('Using fallback data extraction');
    
    // Simple pattern matching for common receipt elements
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    // Try to find amount
    const amountPattern = /\$?(\d+\.?\d*)/g;
    const amounts = text.match(amountPattern);
    const amount = amounts ? parseFloat(amounts[amounts.length - 1].replace('$', '')) : undefined;
    
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
      total_amount: amount || 0,
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
      // Step 1: Perform OCR
      const text = await performOCR(uploadedFile || capturedImage!);
      setExtractedText(text);

      if (!text.trim()) {
        throw new Error('No text could be extracted from the image');
      }

      // Step 2: Structure data with GPT or fallback
      let structuredData: ExtractedData;

      try {
        if (openaiAvailable) {
          setProcessingStep('Processing with AI...');
          const { data: gptData, error: gptError } = await extractReceiptDataWithGPT(text);
          
          if (gptError) {
            throw new Error(gptError.message);
          }
          
          // Cast to ExtractedReceiptData - the service will handle the validation
          structuredData = gptData as ExtractedReceiptData;
        } else {
          throw new Error('OpenAI not available');
        }
      } catch (gptError) {
        console.warn('GPT processing failed, using fallback:', gptError);
        setProcessingStep('Using fallback processing...');
        structuredData = fallbackDataExtraction(text);
      }

      setExtractedData(structuredData);
      setShowExtractedForm(true);
      setProcessingStep('Data extracted successfully! Please review and edit as needed.');

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
    setShowExtractedForm(false);
    setCapturedFrames([]);
    setCaptureProgress(0);
    setLongCaptureInstructions('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const cancelAndRetry = () => {
    setShowExtractedForm(false);
    setExtractedData(null);
    setExtractedText('');
    setError(null);
    setProcessingStep('');
  };

  const updateExtractedData = (field: keyof ExtractedData, value: string | number | null | any) => {
    if (extractedData) {
      setExtractedData({
        ...extractedData,
        [field]: value
      });
    }
  };

  const saveReceiptData = async () => {
    if (!extractedData || !user) {
      setError('No data to save');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      let imageUrl = undefined;
      // Upload image if we have one
      if (capturedImage || uploadedFile) {
        setProcessingStep('Uploading image...');
        const imageFile = uploadedFile || dataURLtoBlob(capturedImage!);
        const { data: uploadData, error: uploadError } = await uploadReceiptImage(imageFile, user.id);
        if (uploadError || !uploadData?.url) {
          setError('Failed to upload image. Please try again.');
          setIsProcessing(false);
          return;
        } else {
          imageUrl = uploadData.url;
        }
      } else {
        setError('No image found. Please capture or upload a receipt image.');
        setIsProcessing(false);
        return;
      }

      setProcessingStep('Saving receipt...');
      const processingMethod = inputMode === 'manual' ? 'manual' : (extractedText ? 'gpt_structured' : 'manual');
      const ocrConfidence = extractedText ? 0.85 : undefined;

      // Use the new MultiProductReceiptService
      const result = await MultiProductReceiptService.saveReceipt(
        extractedData,
        user.id,
        imageUrl,
        processingMethod,
        ocrConfidence,
        extractedText || undefined
      );

      if (!result.receipts || result.receipts.length === 0) {
        throw new Error(result.error || 'Failed to save receipt');
      }

      setSuccess(true);
      const isMultiProduct = result.receipts.length > 1;
      setProcessingStep(
        isMultiProduct 
          ? `Multi-product receipt saved successfully! (${result.receipts.length} products)`
          : 'Receipt saved successfully!'
      );
      setShowExtractedForm(false);

    } catch (err: any) {
      console.error('Save error:', err);
      setError(err.message || 'Failed to save receipt');
    } finally {
      setIsProcessing(false);
    }
  };

  const startManualEntry = () => {
    setInputMode('manual');
    setExtractedData({
      product_description: '',
      brand_name: '',
      store_name: '',
      purchase_location: '',
      purchase_date: new Date().toISOString().split('T')[0],
      amount: undefined,
      total_amount: 0,
      warranty_period: '1 year',
      extended_warranty: '',
      model_number: '',
      country: 'United States'
    });
    setShowExtractedForm(true);
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
              {/* Notifications */}
              {user && <NotificationDropdown userId={user.id} />}
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
            Add Your Receipt
          </h1>
          <p className="text-xl text-text-secondary">
            Capture, upload, or manually enter your receipt details
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
                <h2 className="text-xl font-bold text-text-primary">
                  {captureMode === 'long' ? 'Capture Long Receipt' : 'Capture Receipt'}
                </h2>
                <button
                  onClick={() => setShowCamera(false)}
                  className="text-text-secondary hover:text-text-primary transition-colors duration-200"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="p-6">
                {/* Capture Mode Toggle */}
                <div className="flex justify-center mb-4">
                  <div className="bg-gray-100 rounded-lg p-1 flex">
                    <button
                      onClick={() => setCaptureMode('normal')}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                        captureMode === 'normal'
                          ? 'bg-white text-primary shadow-sm'
                          : 'text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      Normal
                    </button>
                    <button
                      onClick={() => setCaptureMode('long')}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                        captureMode === 'long'
                          ? 'bg-white text-primary shadow-sm'
                          : 'text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      Long Receipt
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <Webcam
                    ref={webcamRef}
                    audio={false}
                    screenshotFormat="image/jpeg"
                    className="w-full rounded-lg"
                    videoConstraints={{
                      facingMode: 'environment',
                      width: captureMode === 'long' ? 1920 : 1280,
                      height: captureMode === 'long' ? 1080 : 720
                    }}
                  />
                  
                  {captureMode === 'long' && (
                    <div className="absolute inset-0 border-2 border-dashed border-primary rounded-lg pointer-events-none">
                      <div className="absolute top-2 left-2 bg-primary text-white px-2 py-1 rounded text-xs">
                        Long Receipt Mode - Hold button and move slowly
                      </div>
                      {isCapturingLong && (
                        <div className="absolute bottom-2 left-2 right-2">
                          <div className="bg-black bg-opacity-50 text-white px-3 py-2 rounded text-sm">
                            {longCaptureInstructions}
                          </div>
                          <div className="w-full bg-gray-300 rounded-full h-2 mt-2">
                            <div 
                              className="bg-primary h-2 rounded-full transition-all duration-200"
                              style={{ width: `${captureProgress}%` }}
                            ></div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="flex justify-center mt-6">
                  {captureMode === 'normal' ? (
                    <button
                      onClick={capture}
                      className="bg-primary text-white px-8 py-4 rounded-full font-medium hover:bg-primary/90 transition-colors duration-200 flex items-center space-x-2"
                    >
                      <Camera className="h-5 w-5" />
                      <span>Capture</span>
                    </button>
                  ) : (
                    <button
                      onMouseDown={startLongCapture}
                      onMouseUp={stopLongCapture}
                      onTouchStart={startLongCapture}
                      onTouchEnd={stopLongCapture}
                      disabled={isCapturingLong && captureProgress >= 100}
                      className={`px-8 py-4 rounded-full font-medium transition-colors duration-200 flex items-center space-x-2 ${
                        isCapturingLong 
                          ? 'bg-accent-red text-white' 
                          : 'bg-primary text-white hover:bg-primary/90'
                      }`}
                    >
                      <Maximize2 className="h-5 w-5" />
                      <span>
                        {isCapturingLong ? 'Capturing...' : 'Hold to Capture Long Receipt'}
                      </span>
                    </button>
                  )}
                </div>

                {captureMode === 'long' && (
                  <div className="mt-4 text-center">
                    <p className="text-sm text-text-secondary">
                      Hold the button and slowly move your camera across the entire length of the receipt
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Input Method Selection */}
        {!capturedImage && !showExtractedForm && (
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {/* Camera Capture */}
            <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6">
              <div className="text-center">
                <div className="bg-gradient-to-br from-primary/10 to-primary/20 rounded-xl p-4 w-fit mx-auto mb-4">
                  <Camera className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-bold text-text-primary mb-2">Take Photo</h3>
                <p className="text-text-secondary text-sm mb-4">
                  Use your camera to capture the receipt
                </p>
                <button
                  onClick={() => {
                    setInputMode('capture');
                    setShowCamera(true);
                  }}
                  className="w-full bg-primary text-white py-3 px-4 rounded-lg font-medium hover:bg-primary/90 transition-colors duration-200"
                >
                  Open Camera
                </button>
              </div>
            </div>

            {/* File Upload */}
            <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6">
              <div className="text-center">
                <div className="bg-gradient-to-br from-secondary/10 to-secondary/20 rounded-xl p-4 w-fit mx-auto mb-4">
                  <Upload className="h-8 w-8 text-secondary" />
                </div>
                <h3 className="text-lg font-bold text-text-primary mb-2">Upload Image</h3>
                <p className="text-text-secondary text-sm mb-4">
                  Select an image file from your device
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  onClick={() => {
                    setInputMode('upload');
                    fileInputRef.current?.click();
                  }}
                  className="w-full bg-secondary text-white py-3 px-4 rounded-lg font-medium hover:bg-secondary/90 transition-colors duration-200"
                >
                  Choose File
                </button>
              </div>
            </div>

            {/* Manual Entry */}
            <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6">
              <div className="text-center">
                <div className="bg-gradient-to-br from-accent-yellow/10 to-accent-yellow/20 rounded-xl p-4 w-fit mx-auto mb-4">
                  <Edit3 className="h-8 w-8 text-accent-yellow" />
                </div>
                <h3 className="text-lg font-bold text-text-primary mb-2">Manual Entry</h3>
                <p className="text-text-secondary text-sm mb-4">
                  Enter receipt details manually
                </p>
                <button
                  onClick={startManualEntry}
                  className="w-full bg-accent-yellow text-white py-3 px-4 rounded-lg font-medium hover:bg-accent-yellow/90 transition-colors duration-200"
                >
                  Enter Manually
                </button>
              </div>
            </div>
          </div>
        )}

        {/* OCR Engine Selection - Removed since there's only one option */}

        {/* Image Preview and Processing */}
        {capturedImage && !showExtractedForm && (
          <div className="grid lg:grid-cols-2 gap-8 mb-8">
            {/* Left Column - Image Preview */}
            <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6">
              <h2 className="text-xl font-bold text-text-primary mb-6">Receipt Image</h2>
              
              <div className="relative mb-6">
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

              <div className="flex space-x-3">
                <button
                  onClick={processReceipt}
                  disabled={isProcessing}
                  className="flex-1 bg-primary text-white p-4 rounded-xl font-medium hover:bg-primary/90 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
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
                
                <button
                  onClick={resetForm}
                  className="px-4 py-2 border border-gray-300 text-text-secondary rounded-xl hover:bg-gray-50 transition-colors duration-200"
                >
                  <RotateCcw className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Right Column - Processing Status */}
            <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6">
              <h2 className="text-xl font-bold text-text-primary mb-6">Processing Status</h2>
              
              {isProcessing && (
                <div className="space-y-4 mb-6">
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
        )}

        {/* Extracted Data Form */}
        {showExtractedForm && extractedData && (
          <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-text-primary">
                {inputMode === 'manual' ? 'Enter Receipt Details' : 'Review & Edit Details'}
              </h2>
              <div className="flex items-center space-x-2">
                <button
                  onClick={cancelAndRetry}
                  className="flex items-center space-x-2 text-text-secondary hover:text-text-primary transition-colors duration-200 px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <X className="h-4 w-4" />
                  <span>Cancel</span>
                </button>
                <button
                  onClick={resetForm}
                  className="flex items-center space-x-2 text-text-secondary hover:text-text-primary transition-colors duration-200 px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>Start Over</span>
                </button>
              </div>
            </div>

            {inputMode !== 'manual' && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-700">
                  Please review the extracted information below and make any necessary corrections before saving.
                </p>
              </div>
            )}

            {/* Check if this is a multi-product receipt */}
            {extractedData.products && extractedData.products.length > 0 ? (
              /* Multi-Product Receipt Form */
              <div className="space-y-8">
                {/* Receipt Header Information */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-green-800 mb-2">
                    Multi-Product Receipt Detected! 🎉
                  </h3>
                  <p className="text-sm text-green-700">
                    Found {extractedData.products.length} products on this receipt. Total amount: ${extractedData.total_amount?.toFixed(2) || '0.00'}
                  </p>
                </div>

                {/* Store Information */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-text-primary mb-4">Store Information</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-2">
                        Store Name
                      </label>
                      <input
                        type="text"
                        value={extractedData.store_name || ''}
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
                        value={extractedData.purchase_location || ''}
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
                        Total Amount
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={extractedData.total_amount || ''}
                        onChange={(e) => updateExtractedData('total_amount', e.target.value ? parseFloat(e.target.value) : null)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors duration-200"
                        placeholder="Enter total amount"
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
                  </div>
                </div>

                {/* Products List */}
                <div>
                  <h3 className="text-lg font-semibold text-text-primary mb-4">Products</h3>
                  <div className="space-y-4">
                    {extractedData.products.map((product, index) => (
                      <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-md font-medium text-text-primary">Product {index + 1}</h4>
                          <span className="text-sm text-text-secondary">${product.amount?.toFixed(2) || '0.00'}</span>
                        </div>
                        
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-text-primary mb-2">
                              Product Description *
                            </label>
                            <input
                              type="text"
                              value={product.product_description || ''}
                              onChange={(e) => {
                                const updatedProducts = [...extractedData.products!];
                                updatedProducts[index] = { ...product, product_description: e.target.value };
                                updateExtractedData('products', updatedProducts);
                              }}
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
                              value={product.brand_name || ''}
                              onChange={(e) => {
                                const updatedProducts = [...extractedData.products!];
                                updatedProducts[index] = { ...product, brand_name: e.target.value };
                                updateExtractedData('products', updatedProducts);
                              }}
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors duration-200"
                              placeholder="Enter brand name"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-text-primary mb-2">
                              Model Number
                            </label>
                            <input
                              type="text"
                              value={product.model_number || ''}
                              onChange={(e) => {
                                const updatedProducts = [...extractedData.products!];
                                updatedProducts[index] = { ...product, model_number: e.target.value };
                                updateExtractedData('products', updatedProducts);
                              }}
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors duration-200"
                              placeholder="Enter model number"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-text-primary mb-2">
                              Amount
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={product.amount || ''}
                              onChange={(e) => {
                                const updatedProducts = [...extractedData.products!];
                                updatedProducts[index] = { ...product, amount: e.target.value ? parseFloat(e.target.value) : 0 };
                                updateExtractedData('products', updatedProducts);
                              }}
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors duration-200"
                              placeholder="Enter amount"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              /* Single Product Receipt Form */
              <div className="grid md:grid-cols-2 gap-6">
                {/* Product Information */}
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Product Description *
                  </label>
                  <input
                    type="text"
                    value={extractedData.product_description || ''}
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
                    value={extractedData.brand_name || ''}
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
                    value={extractedData.store_name || ''}
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
                    value={extractedData.purchase_location || ''}
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
                    value={extractedData.model_number || ''}
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
                    value={extractedData.extended_warranty || ''}
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
            )}

            {/* Action Buttons */}
            <div className="mt-8 flex justify-end space-x-4">
              <button
                onClick={cancelAndRetry}
                className="px-6 py-3 border border-gray-300 text-text-secondary rounded-lg hover:bg-gray-50 transition-colors duration-200 flex items-center space-x-2"
              >
                <X className="h-4 w-4" />
                <span>Cancel</span>
              </button>
              
              <button
                onClick={saveReceiptData}
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