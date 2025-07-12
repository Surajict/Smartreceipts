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

type CaptureMode = 'normal' | 'long';
type InputMode = 'capture' | 'upload' | 'manual';

const ReceiptScanning: React.FC<ReceiptScanningProps> = ({ onBackToDashboard }) => {
  const [currentStep, setCurrentStep] = useState<'input' | 'processing' | 'item-selection' | 'form' | 'success'>('input');
  const [inputMode, setInputMode] = useState<InputMode>('capture');
  const [captureMode, setCaptureMode] = useState<CaptureMode>('normal');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [ocrEngine, setOcrEngine] = useState<OCREngine>('tesseract');
  const [ocrConfidence, setOcrConfidence] = useState<number | null>(null);
  const [extractedText, setExtractedText] = useState<string>('');
  const [processingMethod, setProcessingMethod] = useState<string>('manual');
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const webcamRef = useRef<Webcam>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
      } catch (error) {
        console.error('Error loading user:', error);
      }
    };
    loadUser();
  }, []);

  const handleCapture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      setCapturedImage(imageSrc);
      processImage(imageSrc, 'capture');
    }
  }, []);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setCapturedImage(result);
        processImage(result, 'upload', file);
      };
      reader.readAsDataURL(file);
    }
  };

  const processImage = async (imageData: string, method: 'capture' | 'upload', file?: File) => {
    setCurrentStep('processing');
    setIsProcessing(true);
    setError(null);
    setProcessingStep('Preparing image...');

    try {
      let uploadedImageUrl: string | null = null;

      // Upload image to Supabase Storage
      if (file) {
        setProcessingStep('Uploading image...');
        const uploadResult = await uploadReceiptImage(file, user.id);
        if (uploadResult.error) {
          throw new Error(`Failed to upload image: ${uploadResult.error.message}`);
        }
        uploadedImageUrl = uploadResult.data?.url || null;
        setImageUrl(uploadedImageUrl);
      }

      // Test OpenAI connection
      setProcessingStep('Testing AI connection...');
      const openAIWorking = await testOpenAIConnection();
      
      if (!openAIWorking) {
        console.warn('OpenAI API not available, proceeding with basic extraction');
      }

      // Perform OCR
      setProcessingStep('Extracting text from image...');
      const ocrResult = await OCRService.extractText(imageData, ocrEngine);
      
      setExtractedText(ocrResult.text);
      setOcrConfidence(ocrResult.confidence);

      if (!ocrResult.text || ocrResult.text.trim().length < 10) {
        throw new Error('Could not extract sufficient text from the image. Please try with a clearer image.');
      }

      // Extract receipt data with GPT
      setProcessingStep('Extracting receipt data...');
      
      if (openAIWorking) {
        try {
          const result = await extractReceiptDataWithGPT(ocrResult.text);
          setExtractedData(result);
          setProcessingMethod('gpt_structured');
          setCurrentStep('form');
          setIsProcessing(false);
          return;
        } catch (gptError) {
          console.warn('GPT extraction failed, proceeding to manual entry:', gptError);
        }
      }

      // If GPT fails or is not available, proceed to manual entry
      setExtractedData({
        product_description: '',
        brand_name: '',
        store_name: '',
        purchase_location: '',
        purchase_date: new Date().toISOString().split('T')[0],
        amount: null,
        warranty_period: '1 year',
        extended_warranty: '',
        model_number: '',
        country: 'United States'
      });
      setProcessingMethod('manual');
      setCurrentStep('form');

    } catch (error) {
      console.error('Processing error:', error);
      setError(error instanceof Error ? error.message : 'An error occurred while processing the image');
      setCurrentStep('input');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFormSubmit = async (formData: ExtractedData) => {
    setIsProcessing(true);
    setError(null);

    try {
      const receiptData = {
        ...formData,
        image_url: imageUrl,
        processing_method: processingMethod,
        ocr_confidence: ocrConfidence,
        extracted_text: extractedText
      };

      const saveResult = await saveReceiptToDatabase(receiptData, user.id);
      if (saveResult.error) {
        throw new Error(saveResult.error.message);
      }
      
      setSuccess(true);
      setCurrentStep('success');
    } catch (error) {
      console.error('Save error:', error);
      setError(error instanceof Error ? error.message : 'Failed to save receipt');
    } finally {
      setIsProcessing(false);
    }
  };

  const resetForm = () => {
    setCurrentStep('input');
    setCapturedImage(null);
    setUploadedFile(null);
    setExtractedData(null);
    setError(null);
    setSuccess(false);
    setOcrConfidence(null);
    setExtractedText('');
    setProcessingMethod('manual');
    setImageUrl(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <button
              onClick={onBackToDashboard}
              className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to Dashboard
            </button>
            
            <h1 className="text-xl font-semibold text-gray-900">Smart Receipt Scanner</h1>
            
            <div className="flex items-center space-x-4">
              {user && (
                <div className="flex items-center space-x-2">
                  <User className="w-5 h-5 text-gray-500" />
                  <span className="text-sm text-gray-700">{user.email}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentStep === 'input' && (
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Scan Your Receipt</h2>
              <p className="text-gray-600">Choose how you'd like to add your receipt</p>
            </div>

            {/* Input Mode Selection */}
            <div className="flex justify-center mb-8">
              <div className="bg-gray-100 rounded-lg p-1 flex">
                <button
                  onClick={() => setInputMode('capture')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    inputMode === 'capture'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Camera className="w-4 h-4 inline mr-2" />
                  Camera
                </button>
                <button
                  onClick={() => setInputMode('upload')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    inputMode === 'upload'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Upload className="w-4 h-4 inline mr-2" />
                  Upload
                </button>
                <button
                  onClick={() => setInputMode('manual')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    inputMode === 'manual'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Edit3 className="w-4 h-4 inline mr-2" />
                  Manual
                </button>
              </div>
            </div>

            {/* Camera Mode */}
            {inputMode === 'capture' && (
              <div className="space-y-6">
                <div className="bg-black rounded-lg overflow-hidden">
                  <Webcam
                    ref={webcamRef}
                    audio={false}
                    screenshotFormat="image/jpeg"
                    className="w-full h-64 object-cover"
                  />
                </div>
                <div className="flex justify-center">
                  <button
                    onClick={handleCapture}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center"
                  >
                    <Camera className="w-5 h-5 mr-2" />
                    Capture Receipt
                  </button>
                </div>
              </div>
            )}

            {/* Upload Mode */}
            {inputMode === 'upload' && (
              <div className="space-y-6">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 transition-colors"
                >
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-2">Click to upload a receipt image</p>
                  <p className="text-sm text-gray-500">PNG, JPG, or PDF up to 10MB</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            )}

            {/* Manual Mode */}
            {inputMode === 'manual' && (
              <div className="text-center">
                <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-6">Enter receipt details manually</p>
                <button
                  onClick={() => {
                    setExtractedData({
                      product_description: '',
                      brand_name: '',
                      store_name: '',
                      purchase_location: '',
                      purchase_date: '',
                      amount: null,
                      warranty_period: '',
                      extended_warranty: '',
                      model_number: '',
                      country: 'US'
                    });
                    setProcessingMethod('manual');
                    setCurrentStep('form');
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  Start Manual Entry
                </button>
              </div>
            )}

            {error && (
              <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
                <AlertCircle className="w-5 h-5 text-red-500 mr-3" />
                <p className="text-red-700">{error}</p>
              </div>
            )}
          </div>
        )}

        {currentStep === 'processing' && (
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <Loader2 className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-spin" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Processing Receipt</h2>
            <p className="text-gray-600 mb-4">{processingStep}</p>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
            </div>
          </div>
        )}

        {currentStep === 'form' && extractedData && (
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Review Receipt Details</h2>
              <p className="text-gray-600">Please review and edit the extracted information</p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleFormSubmit(extractedData);
              }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Product Description *
                  </label>
                  <input
                    type="text"
                    value={extractedData.product_description}
                    onChange={(e) => setExtractedData({ ...extractedData, product_description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Brand Name
                  </label>
                  <input
                    type="text"
                    value={extractedData.brand_name}
                    onChange={(e) => setExtractedData({ ...extractedData, brand_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Store Name
                  </label>
                  <input
                    type="text"
                    value={extractedData.store_name}
                    onChange={(e) => setExtractedData({ ...extractedData, store_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Purchase Location
                  </label>
                  <input
                    type="text"
                    value={extractedData.purchase_location}
                    onChange={(e) => setExtractedData({ ...extractedData, purchase_location: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Purchase Date *
                  </label>
                  <input
                    type="date"
                    value={extractedData.purchase_date}
                    onChange={(e) => setExtractedData({ ...extractedData, purchase_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Amount
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={extractedData.amount || ''}
                    onChange={(e) => setExtractedData({ ...extractedData, amount: e.target.value ? parseFloat(e.target.value) : null })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Model Number
                  </label>
                  <input
                    type="text"
                    value={extractedData.model_number}
                    onChange={(e) => setExtractedData({ ...extractedData, model_number: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Country *
                  </label>
                  <select
                    value={extractedData.country}
                    onChange={(e) => setExtractedData({ ...extractedData, country: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="US">United States</option>
                    <option value="CA">Canada</option>
                    <option value="UK">United Kingdom</option>
                    <option value="AU">Australia</option>
                    <option value="DE">Germany</option>
                    <option value="FR">France</option>
                    <option value="JP">Japan</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Warranty Period
                  </label>
                  <input
                    type="text"
                    value={extractedData.warranty_period}
                    onChange={(e) => setExtractedData({ ...extractedData, warranty_period: e.target.value })}
                    placeholder="e.g., 12 months, 2 years"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Extended Warranty
                  </label>
                  <input
                    type="text"
                    value={extractedData.extended_warranty}
                    onChange={(e) => setExtractedData({ ...extractedData, extended_warranty: e.target.value })}
                    placeholder="e.g., 24 months, 3 years"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex justify-between pt-6">
                <button
                  type="button"
                  onClick={() => setCurrentStep('input')}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Receipt
                    </>
                  )}
                </button>
              </div>
            </form>

            {error && (
              <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
                <AlertCircle className="w-5 h-5 text-red-500 mr-3" />
                <p className="text-red-700">{error}</p>
              </div>
            )}
          </div>
        )}

        {currentStep === 'success' && (
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Receipt Saved Successfully!</h2>
            <p className="text-gray-600 mb-6">Your receipt has been added to your library.</p>
            <div className="flex justify-center space-x-4">
              <button
                onClick={resetForm}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                Scan Another Receipt
              </button>
              <button
                onClick={onBackToDashboard}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReceiptScanning;