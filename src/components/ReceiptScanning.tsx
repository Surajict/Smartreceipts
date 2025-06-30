import React, { useState, useRef, useCallback } from 'react';
import Webcam from 'react-webcam';
import { 
  Camera, 
  Upload, 
  Edit3, 
  ArrowLeft, 
  Bell, 
  Settings, 
  Check, 
  X, 
  RotateCcw,
  AlertCircle,
  Calendar,
  MapPin,
  Package,
  Tag,
  Shield,
  Clock,
  CheckCircle,
  Store,
  FileText,
  Image,
  RefreshCw,
  Loader2,
  SwitchCamera
} from 'lucide-react';
import { supabase, getCurrentUser } from '../lib/supabase';

interface ReceiptScanningProps {
  onBackToDashboard: () => void;
}

interface FormData {
  purchaseDate: string;
  country: string;
  productDescription: string;
  brandName: string;
  modelNumber: string;
  warrantyPeriod: string;
  extendedWarranty: string;
  amount: string;
  storeName: string;
  purchaseLocation: string;
}

interface ToastMessage {
  type: 'success' | 'error' | 'info';
  message: string;
  id: string;
}

const ReceiptScanning: React.FC<ReceiptScanningProps> = ({ onBackToDashboard }) => {
  const [currentStep, setCurrentStep] = useState<'options' | 'camera' | 'upload' | 'manual' | 'preview' | 'success'>('options');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alertsCount] = useState(3);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [filePreview, setFilePreview] = useState<{ type: 'image' | 'pdf'; url: string; name: string } | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  
  // Camera specific states
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [retakeCount, setRetakeCount] = useState(0);
  
  const webcamRef = useRef<Webcam>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<FormData>({
    purchaseDate: '',
    country: '',
    productDescription: '',
    brandName: '',
    modelNumber: '',
    warrantyPeriod: '',
    extendedWarranty: '',
    amount: '',
    storeName: '',
    purchaseLocation: ''
  });

  const [formErrors, setFormErrors] = useState<Partial<FormData>>({});

  const countries = [
    'United States', 'Canada', 'United Kingdom', 'Australia', 'Germany', 
    'France', 'Japan', 'South Korea', 'Singapore', 'Other'
  ];

  const warrantyPeriods = [
    '6 months', '1 year', '2 years', '3 years', '4 years', '5 years', 'Lifetime'
  ];

  // Accepted file types
  const ACCEPTED_FILE_TYPES = {
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
    'application/pdf': ['.pdf']
  };

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  // Toast management
  const addToast = useCallback((type: ToastMessage['type'], message: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    const toast: ToastMessage = { type, message, id };
    setToasts(prev => [...prev, toast]);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Get available camera devices
  const getDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      setDevices(videoDevices);
      
      // Prefer back camera if available
      const backCamera = videoDevices.find(device => 
        device.label.toLowerCase().includes('back') || 
        device.label.toLowerCase().includes('rear') ||
        device.label.toLowerCase().includes('environment')
      );
      
      if (backCamera) {
        setSelectedDeviceId(backCamera.deviceId);
        setFacingMode('environment');
      } else if (videoDevices.length > 0) {
        setSelectedDeviceId(videoDevices[0].deviceId);
        setFacingMode('user');
      }
    } catch (error) {
      console.error('Error getting devices:', error);
    }
  }, []);

  // File validation function
  const validateFile = (file: File): { isValid: boolean; error?: string } => {
    // Check file type
    const acceptedTypes = Object.keys(ACCEPTED_FILE_TYPES);
    if (!acceptedTypes.includes(file.type)) {
      return {
        isValid: false,
        error: 'Only JPG, PNG, and PDF files are allowed'
      };
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return {
        isValid: false,
        error: 'File size must be less than 10MB'
      };
    }

    return { isValid: true };
  };

  // Generate unique receipt ID for filename
  const generateReceiptId = (): string => {
    return `receipt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  // Camera Functions
  const startCamera = useCallback(async () => {
    try {
      setError(null);
      setCameraError(null);
      setIsLoading(true);
      setCameraReady(false);

      // Check if camera is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported in this browser. Please try uploading an image instead.');
      }

      // Get available devices first
      await getDevices();
      
      setCurrentStep('camera');
      addToast('info', 'Initializing camera...');
      
    } catch (err: any) {
      console.error('Camera initialization error:', err);
      setIsLoading(false);
      
      if (err.name === 'NotAllowedError') {
        const errorMsg = 'Camera access denied. Please allow camera permissions in your browser settings and try again.';
        setCameraError(errorMsg);
        addToast('error', errorMsg);
      } else if (err.name === 'NotFoundError') {
        const errorMsg = 'No camera found on this device. Please try uploading an image instead.';
        setCameraError(errorMsg);
        addToast('error', errorMsg);
      } else if (err.name === 'NotSupportedError') {
        const errorMsg = 'Camera is not supported in this browser. Please try uploading an image instead.';
        setCameraError(errorMsg);
        addToast('error', errorMsg);
      } else {
        const errorMsg = err.message || 'Unable to access camera. Please check permissions or try uploading an image instead.';
        setCameraError(errorMsg);
        addToast('error', errorMsg);
      }
    }
  }, [getDevices, addToast]);

  // Handle camera ready
  const handleCameraReady = useCallback(() => {
    setCameraReady(true);
    setIsLoading(false);
    setCameraError(null);
    addToast('success', 'Camera ready! Position your receipt and tap capture.');
  }, [addToast]);

  // Handle camera error
  const handleCameraError = useCallback((error: string | DOMException) => {
    console.error('Camera error:', error);
    setCameraReady(false);
    setIsLoading(false);
    
    let errorMessage = 'Camera error occurred';
    
    if (typeof error === 'string') {
      errorMessage = error;
    } else if (error instanceof DOMException) {
      switch (error.name) {
        case 'NotAllowedError':
          errorMessage = 'Camera permission denied. Please allow camera access and try again.';
          break;
        case 'NotFoundError':
          errorMessage = 'No camera found. Please try uploading an image instead.';
          break;
        case 'NotSupportedError':
          errorMessage = 'Camera not supported in this browser. Please try uploading an image instead.';
          break;
        case 'OverconstrainedError':
          errorMessage = 'Camera constraints not supported. Trying alternative settings...';
          // Try switching to front camera
          setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
          return;
        default:
          errorMessage = `Camera error: ${error.message}`;
      }
    }
    
    setCameraError(errorMessage);
    addToast('error', errorMessage);
  }, [addToast]);

  // Capture image from webcam
  const captureImage = useCallback(() => {
    if (!webcamRef.current || !cameraReady) {
      addToast('error', 'Camera not ready. Please wait for camera to initialize.');
      return;
    }

    try {
      const imageSrc = webcamRef.current.getScreenshot({
        width: 1920,
        height: 1080,
        screenshotFormat: 'image/jpeg',
        screenshotQuality: 0.9
      });

      if (!imageSrc) {
        addToast('error', 'Failed to capture image. Please try again.');
        return;
      }

      setCapturedImage(imageSrc);
      
      // Create file preview
      setFilePreview({
        type: 'image',
        url: imageSrc,
        name: 'captured_receipt.jpg'
      });
      
      setCurrentStep('preview');
      setRetakeCount(prev => prev + 1);
      addToast('success', 'Image captured successfully!');
      
    } catch (error) {
      console.error('Capture error:', error);
      addToast('error', 'Failed to capture image. Please try again.');
    }
  }, [cameraReady, addToast]);

  // Switch camera (front/back)
  const switchCamera = useCallback(() => {
    if (devices.length > 1) {
      const currentIndex = devices.findIndex(device => device.deviceId === selectedDeviceId);
      const nextIndex = (currentIndex + 1) % devices.length;
      setSelectedDeviceId(devices[nextIndex].deviceId);
      
      // Update facing mode based on device label
      const nextDevice = devices[nextIndex];
      if (nextDevice.label.toLowerCase().includes('front') || nextDevice.label.toLowerCase().includes('user')) {
        setFacingMode('user');
      } else {
        setFacingMode('environment');
      }
      
      addToast('info', 'Switching camera...');
    } else {
      // Fallback: toggle facing mode
      setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
      addToast('info', 'Switching camera...');
    }
  }, [devices, selectedDeviceId, addToast]);

  // File Upload Functions
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const validation = validateFile(file);
      
      if (!validation.isValid) {
        setError(validation.error || 'Invalid file');
        addToast('error', validation.error || 'Invalid file');
        return;
      }

      setError(null);
      setUploadedFile(file);
      
      // Create file preview
      if (file.type === 'application/pdf') {
        setFilePreview({
          type: 'pdf',
          url: URL.createObjectURL(file),
          name: file.name
        });
        setCurrentStep('preview');
        addToast('success', 'PDF file selected successfully!');
      } else {
        const reader = new FileReader();
        reader.onload = (e) => {
          const imageUrl = e.target?.result as string;
          setCapturedImage(imageUrl);
          setFilePreview({
            type: 'image',
            url: imageUrl,
            name: file.name
          });
          setCurrentStep('preview');
          addToast('success', 'Image file selected successfully!');
        };
        reader.onerror = () => {
          setError('Failed to read the selected file');
          addToast('error', 'Failed to read the selected file');
        };
        reader.readAsDataURL(file);
      }
    }
  };

  // Form Validation
  const validateForm = (): boolean => {
    const errors: Partial<FormData> = {};
    
    if (!formData.purchaseDate) errors.purchaseDate = 'Purchase date is required';
    if (!formData.country) errors.country = 'Country is required';
    if (!formData.productDescription) errors.productDescription = 'Product description is required';
    if (!formData.brandName) errors.brandName = 'Brand name is required';
    if (!formData.warrantyPeriod) errors.warrantyPeriod = 'Warranty period is required';
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Supabase Integration with progress tracking
  const uploadFileToSupabase = async (file: File | string): Promise<string | null> => {
    try {
      const user = await getCurrentUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      let fileToUpload: File;
      let fileName: string;
      const receiptId = generateReceiptId();

      if (typeof file === 'string') {
        // Convert base64 to blob for captured images
        const response = await fetch(file);
        const blob = await response.blob();
        fileName = `${receiptId}.jpg`;
        fileToUpload = new File([blob], fileName, { type: 'image/jpeg' });
      } else {
        // Use uploaded file directly
        const fileExtension = file.name.split('.').pop() || 'jpg';
        fileName = `${receiptId}.${fileExtension}`;
        fileToUpload = file;
      }

      // Upload to receipt-images bucket with user-specific path
      const filePath = `${user.id}/${fileName}`;
      
      setUploadProgress(0);
      addToast('info', 'Uploading receipt...');
      
      const { data, error } = await supabase.storage
        .from('receipt-images')
        .upload(filePath, fileToUpload, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('Storage upload error:', error);
        throw error;
      }
      
      setUploadProgress(100);
      addToast('success', 'Receipt uploaded successfully!');
      return data.path;
    } catch (error) {
      console.error('Upload error:', error);
      addToast('error', 'Failed to upload receipt. Please try again.');
      throw error;
    }
  };

  const saveReceiptToDatabase = async (imagePath?: string) => {
    try {
      const user = await getCurrentUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const receiptData = {
        user_id: user.id,
        purchase_date: formData.purchaseDate,
        country: formData.country,
        product_description: formData.productDescription,
        brand_name: formData.brandName,
        model_number: formData.modelNumber || null,
        warranty_period: formData.warrantyPeriod,
        extended_warranty: formData.extendedWarranty || null,
        amount: formData.amount ? parseFloat(formData.amount) : null,
        image_url: imagePath || null,
        store_name: formData.storeName || null,
        purchase_location: formData.purchaseLocation || null
      };

      const { data, error } = await supabase
        .from('receipts')
        .insert([receiptData])
        .select()
        .single();

      if (error) {
        console.error('Database save error:', error);
        throw error;
      }

      addToast('success', 'Receipt saved to your library!');
      return data;
    } catch (error) {
      console.error('Save error:', error);
      addToast('error', 'Failed to save receipt data. Please try again.');
      throw error;
    }
  };

  // Handle Submissions
  const handleImageSubmit = async () => {
    if (!capturedImage && !uploadedFile) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Upload file to Supabase Storage
      const imagePath = await uploadFileToSupabase(uploadedFile || capturedImage!);
      
      if (imagePath) {
        // Save receipt record with file path
        await saveReceiptToDatabase(imagePath);
        setCurrentStep('success');
      }
    } catch (err: any) {
      console.error('Submit error:', err);
      setError(err.message || 'Failed to save receipt. Please try again.');
    } finally {
      setIsLoading(false);
      setUploadProgress(0);
    }
  };

  const handleManualSubmit = async () => {
    if (!validateForm()) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      await saveReceiptToDatabase();
      setCurrentStep('success');
    } catch (err: any) {
      console.error('Manual submit error:', err);
      setError(err.message || 'Failed to save receipt data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setCapturedImage(null);
    setUploadedFile(null);
    setFilePreview(null);
    setUploadProgress(0);
    setCameraError(null);
    setCameraReady(false);
    setRetakeCount(0);
    setFormData({
      purchaseDate: '',
      country: '',
      productDescription: '',
      brandName: '',
      modelNumber: '',
      warrantyPeriod: '',
      extendedWarranty: '',
      amount: '',
      storeName: '',
      purchaseLocation: ''
    });
    setFormErrors({});
    setError(null);
    setCurrentStep('options');
  };

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (filePreview?.url && filePreview.type === 'pdf') {
        URL.revokeObjectURL(filePreview.url);
      }
    };
  }, [filePreview]);

  // Get camera constraints
  const getVideoConstraints = () => {
    const constraints: MediaTrackConstraints = {
      width: { ideal: 1920, min: 640 },
      height: { ideal: 1080, min: 480 },
      facingMode: facingMode
    };

    if (selectedDeviceId) {
      constraints.deviceId = { exact: selectedDeviceId };
      // Remove facingMode when using specific device
      delete constraints.facingMode;
    }

    return constraints;
  };

  return (
    <div className="min-h-screen bg-background font-['Inter',sans-serif]">
      {/* Toast Container */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-center space-x-2 px-4 py-3 rounded-lg shadow-lg max-w-sm transform transition-all duration-300 ${
              toast.type === 'success' ? 'bg-green-500 text-white' :
              toast.type === 'error' ? 'bg-red-500 text-white' :
              'bg-blue-500 text-white'
            }`}
          >
            {toast.type === 'success' && <CheckCircle className="h-5 w-5" />}
            {toast.type === 'error' && <AlertCircle className="h-5 w-5" />}
            {toast.type === 'info' && <Clock className="h-5 w-5" />}
            <span className="text-sm font-medium flex-1">{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-white hover:text-gray-200 transition-colors duration-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

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

              {/* Settings */}
              <button className="p-2 text-text-secondary hover:text-text-primary transition-colors duration-200">
                <Settings className="h-6 w-6" />
              </button>

              {/* Back to Dashboard */}
              <button
                onClick={onBackToDashboard}
                className="flex items-center space-x-2 bg-white text-primary border-2 border-primary px-4 py-2 rounded-lg font-medium hover:bg-primary hover:text-white transition-all duration-200"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Back to Dashboard</span>
              </button>
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
            Choose how you'd like to capture your receipt information
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Scanning Options */}
        {currentStep === 'options' && (
          <div className="grid md:grid-cols-3 gap-8">
            <button
              onClick={startCamera}
              disabled={isLoading}
              className="group bg-gradient-to-br from-primary to-teal-600 p-8 rounded-2xl shadow-card hover:shadow-card-hover transition-all duration-300 transform hover:-translate-y-2 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex flex-col items-center text-center">
                <div className="bg-white/20 rounded-full p-6 mb-6 group-hover:bg-white/30 transition-colors duration-300">
                  {isLoading ? (
                    <Loader2 className="h-12 w-12 animate-spin" />
                  ) : (
                    <Camera className="h-12 w-12" />
                  )}
                </div>
                <h3 className="text-2xl font-bold mb-4">
                  {isLoading ? 'Starting Camera...' : 'Scan Image'}
                </h3>
                <p className="text-white/90 leading-relaxed">
                  Use your device camera to capture receipts directly. 
                  Supports both front and back cameras.
                </p>
              </div>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="group bg-gradient-to-br from-secondary to-purple-600 p-8 rounded-2xl shadow-card hover:shadow-card-hover transition-all duration-300 transform hover:-translate-y-2 text-white"
            >
              <div className="flex flex-col items-center text-center">
                <div className="bg-white/20 rounded-full p-6 mb-6 group-hover:bg-white/30 transition-colors duration-300">
                  <Upload className="h-12 w-12" />
                </div>
                <h3 className="text-2xl font-bold mb-4">Upload File</h3>
                <p className="text-white/90 leading-relaxed">
                  Select an existing file from your device. 
                  Supports JPG, PNG, and PDF formats.
                </p>
                <div className="mt-4 text-sm text-white/80">
                  <p>Accepted formats: JPG, PNG, PDF</p>
                  <p>Max size: 10MB</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => setCurrentStep('manual')}
              className="group bg-gradient-to-br from-accent-yellow to-yellow-500 p-8 rounded-2xl shadow-card hover:shadow-card-hover transition-all duration-300 transform hover:-translate-y-2 text-white"
            >
              <div className="flex flex-col items-center text-center">
                <div className="bg-white/20 rounded-full p-6 mb-6 group-hover:bg-white/30 transition-colors duration-300">
                  <Edit3 className="h-12 w-12" />
                </div>
                <h3 className="text-2xl font-bold mb-4">Manual Entry</h3>
                <p className="text-white/90 leading-relaxed">
                  Enter receipt details manually using our 
                  structured form for complete accuracy.
                </p>
              </div>
            </button>
          </div>
        )}

        {/* Camera View */}
        {currentStep === 'camera' && (
          <div className="bg-white rounded-2xl shadow-card p-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-text-primary mb-2">Position Your Receipt</h2>
              <p className="text-text-secondary">Make sure the entire receipt is visible and well-lit</p>
            </div>

            {/* Camera Error */}
            {cameraError && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                    <p className="text-sm text-red-700">{cameraError}</p>
                  </div>
                  <button
                    onClick={() => {
                      setCameraError(null);
                      startCamera();
                    }}
                    className="text-red-600 hover:text-red-800 transition-colors duration-200"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Camera Container */}
            <div className="relative bg-gray-100 rounded-lg overflow-hidden mb-6" style={{ aspectRatio: '4/3' }}>
              {!cameraError && (
                <Webcam
                  ref={webcamRef}
                  audio={false}
                  screenshotFormat="image/jpeg"
                  videoConstraints={getVideoConstraints()}
                  onUserMedia={handleCameraReady}
                  onUserMediaError={handleCameraError}
                  className="w-full h-full object-cover"
                  mirrored={facingMode === 'user'}
                />
              )}
              
              {/* Camera overlay */}
              <div className="absolute inset-4 border-2 border-primary border-dashed rounded-lg pointer-events-none"></div>
              
              {/* Camera status */}
              {isLoading && (
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                  <div className="text-center text-white">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                    <p>Initializing camera...</p>
                  </div>
                </div>
              )}
              
              {/* Camera controls */}
              {cameraReady && !cameraError && (
                <>
                  {/* Switch camera button */}
                  {devices.length > 1 && (
                    <button
                      onClick={switchCamera}
                      className="absolute top-4 right-4 bg-black bg-opacity-50 text-white rounded-full p-2 hover:bg-opacity-70 transition-colors duration-200"
                    >
                      <SwitchCamera className="h-5 w-5" />
                    </button>
                  )}
                  
                  {/* Capture button */}
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                    <button
                      onClick={captureImage}
                      className="bg-primary text-white rounded-full p-4 shadow-lg hover:bg-primary/90 transition-colors duration-200 transform hover:scale-105"
                    >
                      <Camera className="h-8 w-8" />
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Camera info */}
            {cameraReady && (
              <div className="text-center text-sm text-text-secondary mb-4">
                <p>Camera: {facingMode === 'environment' ? 'Back' : 'Front'}</p>
                {retakeCount > 0 && <p>Retakes: {retakeCount}</p>}
              </div>
            )}

            <div className="flex justify-center space-x-4">
              <button
                onClick={() => {
                  setCurrentStep('options');
                  setCameraError(null);
                  setCameraReady(false);
                }}
                className="flex items-center space-x-2 px-6 py-3 border-2 border-gray-300 text-text-secondary rounded-lg hover:border-gray-400 hover:text-text-primary transition-colors duration-200"
              >
                <X className="h-5 w-5" />
                <span>Cancel</span>
              </button>
              
              {cameraError && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center space-x-2 bg-secondary text-white px-6 py-3 rounded-lg hover:bg-secondary/90 transition-colors duration-200"
                >
                  <Upload className="h-5 w-5" />
                  <span>Upload Instead</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* File Preview */}
        {currentStep === 'preview' && filePreview && (
          <div className="bg-white rounded-2xl shadow-card p-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-text-primary mb-2">Review Your Receipt</h2>
              <p className="text-text-secondary">Make sure the file is clear and readable</p>
            </div>

            <div className="bg-gray-100 rounded-lg p-4 mb-6">
              {filePreview.type === 'image' ? (
                <img
                  src={filePreview.url}
                  alt="Receipt preview"
                  className="w-full max-h-96 object-contain rounded-lg"
                />
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <FileText className="h-16 w-16 text-text-secondary mb-4" />
                  <h3 className="text-lg font-medium text-text-primary mb-2">PDF Receipt</h3>
                  <p className="text-text-secondary text-sm">{filePreview.name}</p>
                  <button
                    onClick={() => window.open(filePreview.url, '_blank')}
                    className="mt-4 text-primary hover:text-primary/80 font-medium"
                  >
                    Open PDF to Preview
                  </button>
                </div>
              )}
            </div>

            {/* Upload Progress */}
            {isLoading && uploadProgress > 0 && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-text-primary">Uploading...</span>
                  <span className="text-sm text-text-secondary">{uploadProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              </div>
            )}

            <div className="flex justify-center space-x-4">
              <button
                onClick={() => {
                  setCapturedImage(null);
                  setUploadedFile(null);
                  setFilePreview(null);
                  setCurrentStep('options');
                }}
                className="flex items-center space-x-2 px-6 py-3 border-2 border-gray-300 text-text-secondary rounded-lg hover:border-gray-400 hover:text-text-primary transition-colors duration-200"
              >
                <RotateCcw className="h-5 w-5" />
                <span>Choose Different File</span>
              </button>
              <button
                onClick={handleImageSubmit}
                disabled={isLoading}
                className="flex items-center space-x-2 bg-primary text-white px-8 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check className="h-5 w-5" />
                    <span>Confirm & Save</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Manual Entry Form */}
        {currentStep === 'manual' && (
          <div className="bg-white rounded-2xl shadow-card p-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-text-primary mb-2">Enter Receipt Details</h2>
              <p className="text-text-secondary">Fill in the information from your receipt</p>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleManualSubmit(); }} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Purchase Date */}
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    <Calendar className="inline h-4 w-4 mr-1" />
                    Date of Purchase *
                  </label>
                  <input
                    type="date"
                    value={formData.purchaseDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, purchaseDate: e.target.value }))}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors duration-200 ${
                      formErrors.purchaseDate ? 'border-accent-red bg-red-50' : 'border-gray-300'
                    }`}
                  />
                  {formErrors.purchaseDate && (
                    <p className="mt-1 text-sm text-accent-red">{formErrors.purchaseDate}</p>
                  )}
                </div>

                {/* Country */}
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    <MapPin className="inline h-4 w-4 mr-1" />
                    Country of Purchase *
                  </label>
                  <select
                    value={formData.country}
                    onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors duration-200 ${
                      formErrors.country ? 'border-accent-red bg-red-50' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Select country</option>
                    {countries.map(country => (
                      <option key={country} value={country}>{country}</option>
                    ))}
                  </select>
                  {formErrors.country && (
                    <p className="mt-1 text-sm text-accent-red">{formErrors.country}</p>
                  )}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Store Name */}
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    <Store className="inline h-4 w-4 mr-1" />
                    Store Name
                  </label>
                  <input
                    type="text"
                    value={formData.storeName}
                    onChange={(e) => setFormData(prev => ({ ...prev, storeName: e.target.value }))}
                    placeholder="e.g., Apple Store, Best Buy"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors duration-200"
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
                    value={formData.purchaseLocation}
                    onChange={(e) => setFormData(prev => ({ ...prev, purchaseLocation: e.target.value }))}
                    placeholder="e.g., New York, NY or Online"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors duration-200"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Product Description */}
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    <Package className="inline h-4 w-4 mr-1" />
                    Product Description *
                  </label>
                  <input
                    type="text"
                    value={formData.productDescription}
                    onChange={(e) => setFormData(prev => ({ ...prev, productDescription: e.target.value }))}
                    placeholder="e.g., MacBook Pro 16-inch"
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors duration-200 ${
                      formErrors.productDescription ? 'border-accent-red bg-red-50' : 'border-gray-300'
                    }`}
                  />
                  {formErrors.productDescription && (
                    <p className="mt-1 text-sm text-accent-red">{formErrors.productDescription}</p>
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
                    value={formData.brandName}
                    onChange={(e) => setFormData(prev => ({ ...prev, brandName: e.target.value }))}
                    placeholder="e.g., Apple"
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors duration-200 ${
                      formErrors.brandName ? 'border-accent-red bg-red-50' : 'border-gray-300'
                    }`}
                  />
                  {formErrors.brandName && (
                    <p className="mt-1 text-sm text-accent-red">{formErrors.brandName}</p>
                  )}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Model Number */}
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Series/Model Number
                  </label>
                  <input
                    type="text"
                    value={formData.modelNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, modelNumber: e.target.value }))}
                    placeholder="e.g., A2485"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors duration-200"
                  />
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Amount
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                    placeholder="0.00"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors duration-200"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Warranty Period */}
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    <Shield className="inline h-4 w-4 mr-1" />
                    Warranty Period *
                  </label>
                  <select
                    value={formData.warrantyPeriod}
                    onChange={(e) => setFormData(prev => ({ ...prev, warrantyPeriod: e.target.value }))}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors duration-200 ${
                      formErrors.warrantyPeriod ? 'border-accent-red bg-red-50' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Select warranty period</option>
                    {warrantyPeriods.map(period => (
                      <option key={period} value={period}>{period}</option>
                    ))}
                  </select>
                  {formErrors.warrantyPeriod && (
                    <p className="mt-1 text-sm text-accent-red">{formErrors.warrantyPeriod}</p>
                  )}
                </div>

                {/* Extended Warranty */}
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    <Clock className="inline h-4 w-4 mr-1" />
                    Extended Warranty
                  </label>
                  <select
                    value={formData.extendedWarranty}
                    onChange={(e) => setFormData(prev => ({ ...prev, extendedWarranty: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors duration-200"
                  >
                    <option value="">No extended warranty</option>
                    <option value="1 year">1 year extended</option>
                    <option value="2 years">2 years extended</option>
                    <option value="3 years">3 years extended</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-center space-x-4 pt-6">
                <button
                  type="button"
                  onClick={() => setCurrentStep('options')}
                  className="flex items-center space-x-2 px-6 py-3 border-2 border-gray-300 text-text-secondary rounded-lg hover:border-gray-400 hover:text-text-primary transition-colors duration-200"
                >
                  <X className="h-5 w-5" />
                  <span>Cancel</span>
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex items-center space-x-2 bg-primary text-white px-8 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Check className="h-5 w-5" />
                      <span>Save Details</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Success State */}
        {currentStep === 'success' && (
          <div className="bg-white rounded-2xl shadow-card p-8 text-center">
            <div className="bg-green-100 rounded-full p-6 w-24 h-24 mx-auto mb-6">
              <CheckCircle className="h-12 w-12 text-green-600" />
            </div>
            <h2 className="text-3xl font-bold text-text-primary mb-4">
              Receipt Saved Successfully!
            </h2>
            <p className="text-xl text-text-secondary mb-8">
              Your receipt has been securely uploaded and processed. 
              Warranty tracking has been automatically set up.
            </p>
            <div className="flex justify-center space-x-4">
              <button
                onClick={resetForm}
                className="flex items-center space-x-2 border-2 border-primary text-primary px-6 py-3 rounded-lg font-medium hover:bg-primary hover:text-white transition-colors duration-200"
              >
                <Camera className="h-5 w-5" />
                <span>Scan Another Receipt</span>
              </button>
              <button
                onClick={onBackToDashboard}
                className="flex items-center space-x-2 bg-primary text-white px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors duration-200"
              >
                <ArrowLeft className="h-5 w-5" />
                <span>Back to Dashboard</span>
              </button>
            </div>
          </div>
        )}

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.pdf"
          onChange={handleFileUpload}
          className="hidden"
        />
      </main>
    </div>
  );
};

export default ReceiptScanning;