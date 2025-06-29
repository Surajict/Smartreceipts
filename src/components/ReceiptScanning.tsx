import React, { useState, useRef, useCallback } from 'react';
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
  Store
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

const ReceiptScanning: React.FC<ReceiptScanningProps> = ({ onBackToDashboard }) => {
  const [currentStep, setCurrentStep] = useState<'options' | 'camera' | 'upload' | 'manual' | 'preview' | 'success'>('options');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alertsCount] = useState(3);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
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

  // Camera Functions
  const startCamera = useCallback(async () => {
    try {
      setError(null);
      setIsLoading(true);

      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported in this browser');
      }

      // Request camera permission with fallback options
      let stream: MediaStream;
      
      try {
        // Try with back camera first (mobile)
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            facingMode: { ideal: 'environment' },
            width: { ideal: 1920, min: 640 },
            height: { ideal: 1080, min: 480 }
          } 
        });
      } catch (backCameraError) {
        console.warn('Back camera not available, trying front camera:', backCameraError);
        try {
          // Fallback to front camera
          stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
              facingMode: 'user',
              width: { ideal: 1920, min: 640 },
              height: { ideal: 1080, min: 480 }
            } 
          });
        } catch (frontCameraError) {
          console.warn('Front camera not available, trying any camera:', frontCameraError);
          // Final fallback - any available camera
          stream = await navigator.mediaDevices.getUserMedia({ 
            video: {
              width: { ideal: 1920, min: 640 },
              height: { ideal: 1080, min: 480 }
            }
          });
        }
      }
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraStream(stream);
        
        // Wait for video to be ready
        videoRef.current.onloadedmetadata = () => {
          setCurrentStep('camera');
          setIsLoading(false);
        };
      }
    } catch (err: any) {
      console.error('Camera error:', err);
      setIsLoading(false);
      
      if (err.name === 'NotAllowedError') {
        setError('Camera access denied. Please allow camera permissions and try again.');
      } else if (err.name === 'NotFoundError') {
        setError('No camera found on this device. Please try uploading an image instead.');
      } else if (err.name === 'NotSupportedError') {
        setError('Camera is not supported in this browser. Please try uploading an image instead.');
      } else {
        setError('Unable to access camera. Please check permissions or try uploading an image instead.');
      }
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => {
        track.stop();
      });
      setCameraStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, [cameraStream]);

  const captureImage = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth || video.clientWidth;
      canvas.height = video.videoHeight || video.clientHeight;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Draw the video frame to canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Convert to base64 with high quality
        const imageData = canvas.toDataURL('image/jpeg', 0.9);
        setCapturedImage(imageData);
        stopCamera();
        setCurrentStep('preview');
      }
    }
  }, [stopCamera]);

  // File Upload Functions
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB');
        return;
      }
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file');
        return;
      }

      setError(null);
      setUploadedFile(file);
      
      const reader = new FileReader();
      reader.onload = (e) => {
        setCapturedImage(e.target?.result as string);
        setCurrentStep('preview');
      };
      reader.onerror = () => {
        setError('Failed to read the selected file');
      };
      reader.readAsDataURL(file);
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

  // Supabase Integration
  const uploadImageToSupabase = async (imageData: string | File): Promise<string | null> => {
    try {
      const user = await getCurrentUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      let fileToUpload: File;
      let fileName: string;

      if (typeof imageData === 'string') {
        // Convert base64 to blob for captured images
        const response = await fetch(imageData);
        const blob = await response.blob();
        fileName = `receipt_${Date.now()}.jpg`;
        fileToUpload = new File([blob], fileName, { type: 'image/jpeg' });
      } else {
        // Use uploaded file directly
        fileToUpload = imageData;
        const fileExtension = fileToUpload.name.split('.').pop() || 'jpg';
        fileName = `receipt_${Date.now()}.${fileExtension}`;
      }

      // Upload to Supabase Storage with user-specific path
      const filePath = `${user.id}/${fileName}`;
      
      const { data, error } = await supabase.storage
        .from('receipts')
        .upload(filePath, fileToUpload, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('Storage upload error:', error);
        throw error;
      }
      
      return data.path;
    } catch (error) {
      console.error('Upload error:', error);
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
        image_path: imagePath || null,
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

      return data;
    } catch (error) {
      console.error('Save error:', error);
      throw error;
    }
  };

  // Handle Submissions
  const handleImageSubmit = async () => {
    if (!capturedImage) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Upload image to Supabase Storage
      const imagePath = await uploadImageToSupabase(uploadedFile || capturedImage);
      
      if (imagePath) {
        // Save basic receipt record with image path
        await saveReceiptToDatabase(imagePath);
        setCurrentStep('success');
      }
    } catch (err: any) {
      console.error('Submit error:', err);
      setError(err.message || 'Failed to save receipt. Please try again.');
    } finally {
      setIsLoading(false);
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
    stopCamera();
  };

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

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
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
                  ) : (
                    <Camera className="h-12 w-12" />
                  )}
                </div>
                <h3 className="text-2xl font-bold mb-4">
                  {isLoading ? 'Starting Camera...' : 'Scan Image'}
                </h3>
                <p className="text-white/90 leading-relaxed">
                  Use your device camera to capture receipts directly. 
                  Supports long receipts with panorama mode.
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
                <h3 className="text-2xl font-bold mb-4">Upload Image</h3>
                <p className="text-white/90 leading-relaxed">
                  Select an existing image from your device. 
                  Supports JPG, PNG, and other common formats.
                </p>
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

            <div className="relative bg-gray-100 rounded-lg overflow-hidden mb-6" style={{ aspectRatio: '4/3' }}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-4 border-2 border-primary border-dashed rounded-lg pointer-events-none"></div>
              
              {/* Camera controls overlay */}
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                <button
                  onClick={captureImage}
                  className="bg-primary text-white rounded-full p-4 shadow-lg hover:bg-primary/90 transition-colors duration-200"
                >
                  <Camera className="h-8 w-8" />
                </button>
              </div>
            </div>

            <div className="flex justify-center space-x-4">
              <button
                onClick={() => {
                  stopCamera();
                  setCurrentStep('options');
                }}
                className="flex items-center space-x-2 px-6 py-3 border-2 border-gray-300 text-text-secondary rounded-lg hover:border-gray-400 hover:text-text-primary transition-colors duration-200"
              >
                <X className="h-5 w-5" />
                <span>Cancel</span>
              </button>
            </div>
          </div>
        )}

        {/* Image Preview */}
        {currentStep === 'preview' && capturedImage && (
          <div className="bg-white rounded-2xl shadow-card p-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-text-primary mb-2">Review Your Receipt</h2>
              <p className="text-text-secondary">Make sure the image is clear and readable</p>
            </div>

            <div className="bg-gray-100 rounded-lg p-4 mb-6">
              <img
                src={capturedImage}
                alt="Captured receipt"
                className="w-full max-h-96 object-contain rounded-lg"
              />
            </div>

            <div className="flex justify-center space-x-4">
              <button
                onClick={() => {
                  setCapturedImage(null);
                  setUploadedFile(null);
                  setCurrentStep('options');
                }}
                className="flex items-center space-x-2 px-6 py-3 border-2 border-gray-300 text-text-secondary rounded-lg hover:border-gray-400 hover:text-text-primary transition-colors duration-200"
              >
                <RotateCcw className="h-5 w-5" />
                <span>Retake</span>
              </button>
              <button
                onClick={handleImageSubmit}
                disabled={isLoading}
                className="flex items-center space-x-2 bg-primary text-white px-8 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
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
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
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
              Your receipt has been processed and securely stored. 
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
          accept="image/*"
          onChange={handleFileUpload}
          className="hidden"
        />

        {/* Hidden canvas for image capture */}
        <canvas ref={canvasRef} className="hidden" />
      </main>
    </div>
  );
};

export default ReceiptScanning;