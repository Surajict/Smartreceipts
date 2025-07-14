import React, { useState, useRef, useCallback, useEffect } from 'react';
import { 
  Camera, 
  Upload, 
  ArrowLeft, 
  RotateCcw, 
  Check, 
  X, 
  Loader2, 
  AlertCircle,
  FileText,
  Zap,
  Brain,
  User,
  Edit3,
  Save,
  Eye,
  EyeOff,
  RefreshCw
} from 'lucide-react';
import Webcam from 'react-webcam';
import { getCurrentUser, extractReceiptDataWithGPT, uploadReceiptImage } from '../lib/supabase';
import { MultiProductReceiptService } from '../services/multiProductReceiptService';
import { OCRService, OCRResult } from '../services/ocrService';
import { PerplexityValidationService, ValidationResult } from '../services/perplexityValidationService';
import NotificationDropdown from './NotificationDropdown';
import Footer from './Footer';

interface ReceiptScanningProps {
  onBackToDashboard: () => void;
}

type ScanMode = 'camera' | 'upload' | 'manual';
type ProcessingStep = 'capture' | 'ocr' | 'validation' | 'extraction' | 'saving' | 'complete';

interface ProcessingState {
  step: ProcessingStep;
  progress: number;
  message: string;
  error?: string;
}

const ReceiptScanning: React.FC<ReceiptScanningProps> = ({ onBackToDashboard }) => {
  const [user, setUser] = useState<any>(null);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [scanMode, setScanMode] = useState<ScanMode>('camera');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingState, setProcessingState] = useState<ProcessingState>({
    step: 'capture',
    progress: 0,
    message: 'Ready to scan'
  });
  const [extractedData, setExtractedData] = useState<any>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [showValidationDetails, setShowValidationDetails] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState<any>(null);
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

  const webcamRef = useRef<Webcam>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
        if (currentUser.user_metadata?.avatar_url) {
          setProfilePicture(currentUser.user_metadata.avatar_url);
        }
      }
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  const updateProcessingState = (step: ProcessingStep, progress: number, message: string, error?: string) => {
    setProcessingState({ step, progress, message, error });
  };

  const capturePhoto = useCallback(() => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      setCapturedImage(imageSrc);
    }
  }, [webcamRef]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setCapturedImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    setExtractedData(null);
    setValidationResult(null);
    setOcrResult(null);
    setProcessingState({
      step: 'capture',
      progress: 0,
      message: 'Ready to scan'
    });
  };

  const processReceipt = async () => {
    if (!capturedImage || !user) return;

    setIsProcessing(true);
    setExtractedData(null);
    setValidationResult(null);
    setOcrResult(null);

    try {
      // Step 1: OCR Processing
      updateProcessingState('ocr', 20, 'Extracting text from receipt...');
      
      const ocrResult = await OCRService.extractText(capturedImage, 'google-cloud-vision', (progress, step) => {
        updateProcessingState('ocr', 20 + (progress * 0.3), step);
      });

      setOcrResult(ocrResult);

      if (ocrResult.error) {
        throw new Error(`Text extraction failed: ${ocrResult.error}`);
      }

      if (!ocrResult.text.trim()) {
        throw new Error('No text found in the image. Please ensure the receipt is clear and well-lit.');
      }

      // Step 2: AI Data Extraction
      updateProcessingState('extraction', 50, 'Analyzing receipt with AI...');
      
      const extractionResult = await extractReceiptDataWithGPT(ocrResult.text);
      
      if (extractionResult.error) {
        throw new Error(`AI extraction failed: ${extractionResult.error.message}`);
      }

      if (!extractionResult.data) {
        throw new Error('Failed to extract receipt data. Please try manual entry.');
      }

      setExtractedData(extractionResult.data);

      // Step 3: Validation (Optional)
      updateProcessingState('validation', 70, 'Validating extracted data...');
      
      try {
        const validation = await PerplexityValidationService.validateReceiptData(extractionResult.data);
        setValidationResult(validation);
        
        if (validation.success) {
          setExtractedData(validation.validatedData);
          updateProcessingState('validation', 90, 'Data validated and improved!');
        } else {
          updateProcessingState('validation', 90, 'Validation skipped - using original data');
        }
      } catch (validationError) {
        console.warn('Validation failed, using original data:', validationError);
        updateProcessingState('validation', 90, 'Validation skipped - using original data');
      }

      updateProcessingState('complete', 100, 'Receipt processed successfully!');

    } catch (error: any) {
      console.error('Receipt processing error:', error);
      updateProcessingState('capture', 0, 'Processing failed', error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const saveReceipt = async () => {
    if (!extractedData || !user || !capturedImage) return;

    setIsProcessing(true);
    updateProcessingState('saving', 95, 'Saving receipt to your library...');

    try {
      // Upload image first
      const imageBlob = await fetch(capturedImage).then(r => r.blob());
      const uploadResult = await uploadReceiptImage(imageBlob, user.id);
      
      if (uploadResult.error) {
        throw new Error(`Image upload failed: ${uploadResult.error.message}`);
      }

      // Save receipt data
      const dataToSave = isEditing ? editedData : extractedData;
      const saveResult = await MultiProductReceiptService.saveReceipt(
        dataToSave,
        user.id,
        uploadResult.data?.url,
        'gpt_structured',
        ocrResult?.confidence,
        ocrResult?.text
      );

      if (!saveResult.success) {
        throw new Error(saveResult.error || 'Failed to save receipt');
      }

      updateProcessingState('complete', 100, 'Receipt saved successfully!');
      
      // Reset after a delay
      setTimeout(() => {
        retakePhoto();
        setIsEditing(false);
        setEditedData(null);
      }, 2000);

    } catch (error: any) {
      console.error('Save error:', error);
      updateProcessingState('saving', 0, 'Save failed', error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const startEditing = () => {
    setIsEditing(true);
    setEditedData({ ...extractedData });
  };

  const saveEdits = () => {
    setExtractedData({ ...editedData });
    setIsEditing(false);
  };

  const cancelEdits = () => {
    setEditedData(null);
    setIsEditing(false);
  };

  const handleManualEntry = () => {
    const manualData = {
      store_name: '',
      purchase_date: new Date().toISOString().split('T')[0],
      purchase_location: '',
      country: 'United States',
      warranty_period: '1 year',
      extended_warranty: '',
      total_amount: 0,
      product_description: '',
      brand_name: '',
      model_number: '',
      amount: 0
    };
    
    setExtractedData(manualData);
    setIsEditing(true);
    setEditedData({ ...manualData });
    setScanMode('manual');
  };

  const renderValidationBadge = (field: any) => {
    if (!validationResult || !validationResult.success) return null;

    const confidence = field.confidence;
    const changed = field.changed;

    if (confidence === 0) {
      return (
        <span className="ml-2 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
          Skipped
        </span>
      );
    }

    if (changed) {
      return (
        <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
          Improved ({confidence}%)
        </span>
      );
    } else {
      return (
        <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
          Verified ({confidence}%)
        </span>
      );
    }
  };

  const renderDataField = (label: string, value: string, field: string, validationField?: any) => {
    const currentValue = isEditing ? editedData?.[field] || '' : value;
    
    return (
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-2 flex items-center">
          {label}
          {validationField && renderValidationBadge(validationField)}
        </label>
        {isEditing ? (
          <input
            type={field === 'purchase_date' ? 'date' : field === 'amount' || field === 'total_amount' ? 'number' : 'text'}
            step={field === 'amount' || field === 'total_amount' ? '0.01' : undefined}
            value={currentValue}
            onChange={(e) => setEditedData(prev => ({ 
              ...prev, 
              [field]: field === 'amount' || field === 'total_amount' ? parseFloat(e.target.value) || 0 : e.target.value 
            }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        ) : (
          <p className="text-text-primary bg-gray-50 px-3 py-2 rounded-lg">
            {field === 'amount' || field === 'total_amount' 
              ? `$${parseFloat(value || '0').toFixed(2)}`
              : value || 'Not specified'
            }
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background font-['Inter',sans-serif]">
      {/* Header */}
      <header className="bg-white shadow-card border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={onBackToDashboard}
                className="flex items-center space-x-2 text-text-secondary hover:text-text-primary transition-colors duration-200"
              >
                <ArrowLeft className="h-5 w-5" />
                <span>Back to Dashboard</span>
              </button>
              <div className="h-6 w-px bg-gray-300"></div>
              <h1 className="text-2xl font-bold text-text-primary">Scan Receipt</h1>
            </div>
            <div className="flex items-center space-x-4">
              {/* Notifications */}
              {user && <NotificationDropdown userId={user.id} />}
              {/* User Avatar */}
              <div className="w-8 h-8 rounded-full overflow-hidden bg-primary flex items-center justify-center">
                {profilePicture ? (
                  <img
                    src={profilePicture}
                    alt="Profile"
                    className="w-full h-full object-cover"
                    onError={() => setProfilePicture(null)}
                  />
                ) : (
                  <User className="h-4 w-4 text-white" />
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Scan Mode Selection */}
        {!capturedImage && !extractedData && (
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-text-primary mb-4">
              How would you like to add your receipt?
            </h2>
            <p className="text-xl text-text-secondary mb-8">
              Choose the method that works best for you
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              <button
                onClick={() => setScanMode('camera')}
                className={`p-8 rounded-2xl border-2 transition-all duration-200 ${
                  scanMode === 'camera'
                    ? 'border-primary bg-primary/5 shadow-card-hover'
                    : 'border-gray-200 hover:border-gray-300 hover:shadow-card'
                }`}
              >
                <Camera className="h-12 w-12 text-primary mx-auto mb-4" />
                <h3 className="text-lg font-bold text-text-primary mb-2">Take Photo</h3>
                <p className="text-text-secondary">Use your camera to capture the receipt</p>
              </button>

              <button
                onClick={() => setScanMode('upload')}
                className={`p-8 rounded-2xl border-2 transition-all duration-200 ${
                  scanMode === 'upload'
                    ? 'border-primary bg-primary/5 shadow-card-hover'
                    : 'border-gray-200 hover:border-gray-300 hover:shadow-card'
                }`}
              >
                <Upload className="h-12 w-12 text-secondary mx-auto mb-4" />
                <h3 className="text-lg font-bold text-text-primary mb-2">Upload Image</h3>
                <p className="text-text-secondary">Select a receipt image from your device</p>
              </button>

              <button
                onClick={handleManualEntry}
                className={`p-8 rounded-2xl border-2 transition-all duration-200 ${
                  scanMode === 'manual'
                    ? 'border-primary bg-primary/5 shadow-card-hover'
                    : 'border-gray-200 hover:border-gray-300 hover:shadow-card'
                }`}
              >
                <FileText className="h-12 w-12 text-accent-purple mx-auto mb-4" />
                <h3 className="text-lg font-bold text-text-primary mb-2">Manual Entry</h3>
                <p className="text-text-secondary">Enter receipt details manually</p>
              </button>
            </div>
          </div>
        )}

        {/* Camera Interface */}
        {scanMode === 'camera' && !capturedImage && !extractedData && (
          <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6 mb-8">
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-text-primary mb-2">Position Your Receipt</h3>
              <p className="text-text-secondary">Make sure the entire receipt is visible and well-lit</p>
            </div>

            <div className="relative max-w-md mx-auto">
              <Webcam
                ref={webcamRef}
                audio={false}
                screenshotFormat="image/jpeg"
                className="w-full rounded-lg border border-gray-300"
                videoConstraints={{
                  facingMode: 'environment'
                }}
              />
              
              <div className="absolute inset-0 border-2 border-dashed border-primary rounded-lg pointer-events-none opacity-50"></div>
            </div>

            <div className="text-center mt-6">
              <button
                onClick={capturePhoto}
                className="bg-primary text-white px-8 py-4 rounded-lg hover:bg-primary/90 transition-colors duration-200 shadow-card hover:shadow-card-hover"
              >
                <Camera className="h-5 w-5 inline mr-2" />
                Capture Receipt
              </button>
            </div>
          </div>
        )}

        {/* Upload Interface */}
        {scanMode === 'upload' && !capturedImage && !extractedData && (
          <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-8 mb-8">
            <div className="text-center">
              <Upload className="h-16 w-16 text-secondary mx-auto mb-4" />
              <h3 className="text-xl font-bold text-text-primary mb-2">Upload Receipt Image</h3>
              <p className="text-text-secondary mb-6">Select a clear image of your receipt</p>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              
              <button
                onClick={() => fileInputRef.current?.click()}
                className="bg-secondary text-white px-8 py-4 rounded-lg hover:bg-secondary/90 transition-colors duration-200 shadow-card hover:shadow-card-hover"
              >
                Choose Image File
              </button>
            </div>
          </div>
        )}

        {/* Captured Image Preview */}
        {capturedImage && !extractedData && (
          <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6 mb-8">
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-text-primary mb-2">Receipt Captured</h3>
              <p className="text-text-secondary">Review the image and process when ready</p>
            </div>

            <div className="max-w-md mx-auto mb-6">
              <img
                src={capturedImage}
                alt="Captured receipt"
                className="w-full rounded-lg border border-gray-300"
              />
            </div>

            <div className="flex justify-center space-x-4">
              <button
                onClick={retakePhoto}
                className="flex items-center space-x-2 px-6 py-3 border border-gray-300 text-text-secondary rounded-lg hover:bg-gray-50 transition-colors duration-200"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Retake</span>
              </button>
              
              <button
                onClick={processReceipt}
                disabled={isProcessing}
                className="flex items-center space-x-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors duration-200 disabled:opacity-50"
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4" />
                )}
                <span>{isProcessing ? 'Processing...' : 'Process Receipt'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Processing Status */}
        {isProcessing && (
          <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6 mb-8">
            <div className="text-center">
              <div className="mb-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
              </div>
              <h3 className="text-lg font-bold text-text-primary mb-2">{processingState.message}</h3>
              <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${processingState.progress}%` }}
                ></div>
              </div>
              <p className="text-sm text-text-secondary">{processingState.progress}% complete</p>
              
              {processingState.error && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center">
                    <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                    <p className="text-red-700">{processingState.error}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Extracted Data Display */}
        {extractedData && !isProcessing && (
          <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-text-primary mb-2">
                  {extractedData.products ? 'Multi-Product Receipt' : 'Receipt Details'}
                </h3>
                <p className="text-text-secondary">
                  {isEditing ? 'Edit the details below' : 'Review and confirm the extracted information'}
                </p>
              </div>
              
              <div className="flex items-center space-x-2">
                {validationResult && (
                  <button
                    onClick={() => setShowValidationDetails(!showValidationDetails)}
                    className="flex items-center space-x-2 px-3 py-2 bg-blue-100 text-blue-800 rounded-lg hover:bg-blue-200 transition-colors duration-200"
                  >
                    <Brain className="h-4 w-4" />
                    <span>AI Validation</span>
                    {showValidationDetails ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                )}
                
                {!isEditing ? (
                  <button
                    onClick={startEditing}
                    className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-text-primary rounded-lg hover:bg-gray-200 transition-colors duration-200"
                  >
                    <Edit3 className="h-4 w-4" />
                    <span>Edit</span>
                  </button>
                ) : (
                  <div className="flex space-x-2">
                    <button
                      onClick={cancelEdits}
                      className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-text-secondary rounded-lg hover:bg-gray-50 transition-colors duration-200"
                    >
                      <X className="h-4 w-4" />
                      <span>Cancel</span>
                    </button>
                    <button
                      onClick={saveEdits}
                      className="flex items-center space-x-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors duration-200"
                    >
                      <Save className="h-4 w-4" />
                      <span>Save</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Validation Details */}
            {showValidationDetails && validationResult && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-800 mb-3">AI Validation Results</h4>
                {validationResult.success ? (
                  <div className="space-y-2 text-sm">
                    <p className="text-blue-700">
                      ✅ Data has been validated and improved using AI. Fields marked as "Improved" were corrected, 
                      while "Verified" fields were confirmed as accurate.
                    </p>
                    <div className="grid grid-cols-2 gap-4 mt-3">
                      <div>
                        <span className="font-medium">Product:</span> {validationResult.validationDetails.productDescription.confidence}% confidence
                      </div>
                      <div>
                        <span className="font-medium">Brand:</span> {validationResult.validationDetails.brand.confidence}% confidence
                      </div>
                      <div>
                        <span className="font-medium">Store:</span> {validationResult.validationDetails.storeName.confidence}% confidence
                      </div>
                      <div>
                        <span className="font-medium">Warranty:</span> {validationResult.validationDetails.warrantyPeriod.confidence}% confidence
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-yellow-700">
                    ⚠️ {validationResult.error || 'Validation was skipped. Original extracted data is being used.'}
                  </p>
                )}
              </div>
            )}

            {/* Receipt Data */}
            <div className="space-y-6">
              {/* Store Information */}
              <div>
                <h4 className="font-bold text-text-primary mb-4">Store Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {renderDataField(
                    'Store Name', 
                    extractedData.store_name, 
                    'store_name',
                    validationResult?.validationDetails.storeName
                  )}
                  {renderDataField('Purchase Location', extractedData.purchase_location, 'purchase_location')}
                  {renderDataField('Purchase Date', extractedData.purchase_date, 'purchase_date')}
                  {renderDataField('Country', extractedData.country, 'country')}
                </div>
              </div>

              {/* Multi-Product Receipt */}
              {extractedData.products && extractedData.products.length > 0 ? (
                <div>
                  <h4 className="font-bold text-text-primary mb-4">Products ({extractedData.products.length} items)</h4>
                  <div className="space-y-4">
                    {extractedData.products.map((product: any, index: number) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4">
                        <h5 className="font-medium text-text-primary mb-3">Product {index + 1}</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {renderDataField('Product Description', product.product_description, `products.${index}.product_description`)}
                          {renderDataField('Brand', product.brand_name, `products.${index}.brand_name`)}
                          {renderDataField('Model Number', product.model_number, `products.${index}.model_number`)}
                          {renderDataField('Amount', product.amount?.toString(), `products.${index}.amount`)}
                          {renderDataField('Warranty Period', product.warranty_period, `products.${index}.warranty_period`)}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4">
                    {renderDataField('Total Amount', extractedData.total_amount?.toString(), 'total_amount')}
                  </div>
                </div>
              ) : (
                /* Single Product Receipt */
                <div>
                  <h4 className="font-bold text-text-primary mb-4">Product Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {renderDataField(
                      'Product Description', 
                      extractedData.product_description, 
                      'product_description',
                      validationResult?.validationDetails.productDescription
                    )}
                    {renderDataField(
                      'Brand Name', 
                      extractedData.brand_name, 
                      'brand_name',
                      validationResult?.validationDetails.brand
                    )}
                    {renderDataField('Model Number', extractedData.model_number, 'model_number')}
                    {renderDataField('Amount', extractedData.amount?.toString(), 'amount')}
                    {renderDataField(
                      'Warranty Period', 
                      extractedData.warranty_period, 
                      'warranty_period',
                      validationResult?.validationDetails.warrantyPeriod
                    )}
                    {renderDataField('Extended Warranty', extractedData.extended_warranty, 'extended_warranty')}
                  </div>
                </div>
              )}
            </div>

            {/* OCR Information */}
            {ocrResult && showAdvancedOptions && (
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-text-secondary mb-2">OCR Information</h4>
                <div className="text-sm text-text-secondary space-y-1">
                  <p>Engine: {ocrResult.engine}</p>
                  <p>Confidence: {Math.round(ocrResult.confidence * 100)}%</p>
                  <p>Processing Time: {ocrResult.processingTime}ms</p>
                  {ocrResult.text && (
                    <details className="mt-2">
                      <summary className="cursor-pointer hover:text-text-primary">View extracted text</summary>
                      <pre className="mt-2 p-2 bg-white rounded text-xs overflow-auto max-h-32">
                        {ocrResult.text}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-6 border-t border-gray-200">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                  className="text-text-secondary hover:text-text-primary transition-colors duration-200 text-sm"
                >
                  {showAdvancedOptions ? 'Hide' : 'Show'} Advanced Options
                </button>
              </div>
              
              <div className="flex space-x-4">
                <button
                  onClick={retakePhoto}
                  className="flex items-center space-x-2 px-6 py-3 border border-gray-300 text-text-secondary rounded-lg hover:bg-gray-50 transition-colors duration-200"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>Start Over</span>
                </button>
                
                <button
                  onClick={saveReceipt}
                  disabled={isProcessing}
                  className="flex items-center space-x-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors duration-200 disabled:opacity-50"
                >
                  {isProcessing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  <span>{isProcessing ? 'Saving...' : 'Save Receipt'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tips */}
        {!extractedData && (
          <div className="bg-gradient-feature rounded-2xl p-6 border border-gray-100">
            <h3 className="text-lg font-bold text-text-primary mb-4">📸 Tips for Best Results</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-text-secondary">
              <div className="space-y-2">
                <p>• Ensure good lighting</p>
                <p>• Keep the receipt flat</p>
                <p>• Include the entire receipt</p>
              </div>
              <div className="space-y-2">
                <p>• Avoid shadows and glare</p>
                <p>• Hold the camera steady</p>
                <p>• Make sure text is readable</p>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default ReceiptScanning;