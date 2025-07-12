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
import { getCurrentUser, signOut, saveReceiptToDatabase, uploadReceiptImage, testOpenAIConnection, extractReceiptDataWithGPT, extractMultipleItemsFromReceipt } from '../lib/supabase';
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
  const [currentStep, setCurrentStep] = useState<'input' | 'processing' | 'item-selection' | 'form' | 'success'>('input');
  const [inputMode, setInputMode] = useState<InputMode>('capture');
  const [captureMode, setCaptureMode] = useState<CaptureMode>('normal');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [extractedItems, setExtractedItems] = useState<ExtractedItem[]>([]);
  const [storeInfo, setStoreInfo] = useState<ExtractedStoreInfo | null>(null);
  const [selectedItem, setSelectedItem] = useState<ExtractedItem | null>(null);
  const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(null);
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
        uploadedImageUrl = await uploadReceiptImage(file, user.id);
        setImageUrl(uploadedImageUrl);
      }

      // Test OpenAI connection
      setProcessingStep('Testing AI connection...');
      const openAIWorking = await testOpenAIConnection();
      
      if (!openAIWorking) {
        throw new Error('OpenAI API is not available. Please check your API key configuration.');
      }

      // Perform OCR
      setProcessingStep('Extracting text from image...');
      const ocrService = new OCRService();
      const ocrResult = await ocrService.extractText(imageData, ocrEngine);
      
      setExtractedText(ocrResult.text);
      setOcrConfidence(ocrResult.confidence);

      if (!ocrResult.text || ocrResult.text.trim().length < 10) {
        throw new Error('Could not extract sufficient text from the image. Please try with a clearer image.');
      }

      // Try multi-item extraction first
      setProcessingStep('Analyzing receipt for multiple items...');
      try {
        const { data: multiItemResult, error: multiItemError } = await AIService.extractMultipleItems(ocrResult.text);
        
        if (multiItemError) {
          throw new Error(multiItemError);
        }
        
        if (multiItemResult && multiItemResult.items && multiItemResult.items.length > 0) {
          setExtractedItems(multiItemResult.items);
          setStoreInfo(multiItemResult.store_info);
          setProcessingMethod('ai_multi_item_gpt_structured');
          
          if (multiItemResult.items.length === 1) {
            // Single item - proceed directly to form
            const item = multiItemResult.items[0];
            setSelectedItem(item);
            setSelectedItemIndex(0);
            
            // Convert to ExtractedData format
            const extractedData: ExtractedData = {
              product_description: item.product_description || '',
              brand_name: item.brand_name || '',
              model_number: item.model_number || '',
              amount: item.price,
              warranty_period: item.warranty_period_months ? `${item.warranty_period_months} months` : '',
              extended_warranty: item.extended_warranty_months ? `${item.extended_warranty_months} months` : '',
              store_name: multiItemResult.store_info.store_name || '',
              purchase_location: multiItemResult.store_info.purchase_location || '',
              purchase_date: multiItemResult.store_info.purchase_date || '',
              country: multiItemResult.store_info.country || 'US'
            };
            
            setExtractedData(extractedData);
            setCurrentStep('form');
          } else {
            // Multiple items - show selection screen
            setCurrentStep('item-selection');
          }
          
          setIsProcessing(false);
          return;
        }
      } catch (multiItemError) {
        console.warn('Multi-item extraction failed, falling back to single item:', multiItemError);
      }

      // Fallback to single item extraction
      setProcessingStep('Extracting receipt data...');
      const result = await extractReceiptDataWithGPT(ocrResult.text);
      
      if (result) {
        setExtractedData(result);
        setProcessingMethod('gpt_structured');
        setCurrentStep('form');
      } else {
        throw new Error('Could not extract receipt data. Please try manual entry.');
      }

    } catch (error) {
      console.error('Processing error:', error);
      setError(error instanceof Error ? error.message : 'An error occurred while processing the image');
      setCurrentStep('input');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleItemSelection = (item: ExtractedItem, index: number) => {
    setSelectedItem(item);
    setSelectedItemIndex(index);
    
    // Convert to ExtractedData format
    const extractedData: ExtractedData = {
      product_description: item.product_description || '',
      brand_name: item.brand_name || '',
      model_number: item.model_number || '',
      amount: item.price,
      warranty_period: item.warranty_period_months ? `${item.warranty_period_months} months` : '',
      extended_warranty: item.extended_warranty_months ? `${item.extended_warranty_months} months` : '',
      store_name: storeInfo?.store_name || '',
      purchase_location: storeInfo?.purchase_location || '',
      purchase_date: storeInfo?.purchase_date || '',
      country: storeInfo?.country || 'US'
    };
    
    setExtractedData(extractedData);
    setCurrentStep('form');
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
        extracted_text: extractedText,
        selected_item_index: selectedItemIndex,
        total_items_found: extractedItems.length || 1
      };

      await saveReceiptToDatabase(receiptData, user.id);
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
    setExtractedItems([]);
    setStoreInfo(null);
    setSelectedItem(null);
    setSelectedItemIndex(null);
    setError(null);
    setSuccess(false);
    setOcrConfidence(null);
    setExtractedText('');
    setProcessingMethod('manual');
    setImageUrl(null);
  };

  const formatPrice = (price: number | null): string => {
    if (price === null || price === undefined) return 'N/A';
    return `$${price.toFixed(2)}`;
  };

  const formatWarranty = (months: number | null): string => {
    if (!months) return 'N/A';
    if (months < 12) return `${months} month${months !== 1 ? 's' : ''}`;
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    if (remainingMonths === 0) return `${years} year${years !== 1 ? 's' : ''}`;
    return `${years}y ${remainingMonths}m`;
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

        {currentStep === 'item-selection' && (
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Select Item from Receipt</h2>
              <p className="text-gray-600">We found {extractedItems.length} items on your receipt. Please select the one you want to track:</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {extractedItems.map((item, index) => (
                <div
                  key={index}
                  className="border border-gray-200 rounded-lg p-6 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group"
                  onClick={() => handleItemSelection(item, index)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
                        {item.product_description || 'Unknown Product'}
                      </h3>
                      {item.brand_name && (
                        <p className="text-sm text-gray-600 mb-2">{item.brand_name}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg text-gray-900">{formatPrice(item.price)}</p>
                      {item.quantity > 1 && (
                        <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 text-sm text-gray-600">
                    {item.model_number && (
                      <div className="flex items-center">
                        <Hash className="w-4 h-4 mr-2" />
                        <span>Model: {item.model_number}</span>
                      </div>
                    )}
                    {item.warranty_period_months && (
                      <div className="flex items-center">
                        <Package className="w-4 h-4 mr-2" />
                        <span>Warranty: {formatWarranty(item.warranty_period_months)}</span>
                      </div>
                    )}
                  </div>

                  <button className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium transition-colors group-hover:bg-blue-700">
                    Select This Item
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-8 text-center">
              <button
                onClick={() => setCurrentStep('input')}
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-4 h-4 inline mr-2" />
                Back to Scanner
              </button>
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
                  onClick={() => setCurrentStep(extractedItems.length > 1 ? 'item-selection' : 'input')}
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