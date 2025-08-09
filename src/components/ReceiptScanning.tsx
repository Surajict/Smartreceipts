import React, { useState, useRef, useCallback, useEffect } from 'react';
import Webcam from 'react-webcam';
import { 
  Camera, 
  Upload, 
  X, 
  Check, 
  AlertCircle, 
  Loader2, 
  Zap,
  Brain,
  Eye,
  Save,
  RefreshCw,
  User,
  LogOut,
  Edit3,
  RotateCcw,
  Plus,
  Maximize2,
  Settings
} from 'lucide-react';
import { signOut, uploadReceiptImage, testOpenAIConnection, extractReceiptDataWithGPT } from '../lib/supabase';
import { useUser } from '../contexts/UserContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import { extractTextFromImage } from '../services/ocrService';
import { MultiProductReceiptService } from '../services/multiProductReceiptService';
import { ExtractedReceiptData } from '../types/receipt';
import { PerplexityValidationService, ValidationResult } from '../services/perplexityValidationService';
import { DuplicateDetectionService, DuplicateMatch } from '../services/duplicateDetectionService';
import DuplicateWarningModal from './DuplicateWarningModal';
import NotificationDropdown from './NotificationDropdown';
import Footer from './Footer';
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import html2canvas from 'html2canvas';

// Configure PDF.js worker for Vite (use CDN worker)
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface ReceiptScanningProps {
  onBackToDashboard: () => void;
  onReceiptSaved?: (receiptId: string) => void;
}

// Use the imported type instead of local interface
type ExtractedData = ExtractedReceiptData;

type CaptureMode = 'normal' | 'long';
type InputMode = 'capture' | 'upload' | 'manual';

const ReceiptScanning: React.FC<ReceiptScanningProps> = ({ onBackToDashboard, onReceiptSaved }) => {
  const { user, profilePicture } = useUser();
  const { subscriptionInfo } = useSubscription();
  const [inputMode, setInputMode] = useState<InputMode>('capture');
  const [captureMode, setCaptureMode] = useState<CaptureMode>('normal');
  const [showCamera, setShowCamera] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState('');
  const [extractedText, setExtractedText] = useState('');
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [openaiAvailable, setOpenaiAvailable] = useState<boolean | null>(null);
  const [showExtractedForm, setShowExtractedForm] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  
  // Duplicate detection states
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [duplicateMatches, setDuplicateMatches] = useState<DuplicateMatch[]>([]);
  const [duplicateConfidence, setDuplicateConfidence] = useState(0);
  const [pendingSaveData, setPendingSaveData] = useState<{
    extractedData: ExtractedData;
    imageUrl: string | undefined;
    processingMethod: string;
    ocrConfidence?: number;
    extractedText?: string;
  } | null>(null);
  
  // OCR Engine - Google Cloud Vision is now primary with Tesseract fallback
  
  // Long receipt capture states
  const [isCapturingLong, setIsCapturingLong] = useState(false);
  const [captureProgress, setCaptureProgress] = useState(0);
  const [capturedFrames, setCapturedFrames] = useState<string[]>([]);
  const [longCaptureInstructions, setLongCaptureInstructions] = useState('');
  
  const webcamRef = useRef<Webcam>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const warrantyPeriodRef = useRef<HTMLInputElement>(null);
  const firstProductWarrantyRef = useRef<HTMLInputElement>(null);
  const captureIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const frameCountRef = useRef(0);

  useEffect(() => {
    checkOpenAIAvailability();
  }, []);

  // Focus on warranty period field when form is shown
  useEffect(() => {
    if (showExtractedForm) {
      // Small delay to ensure the form is fully rendered
      setTimeout(() => {
        // Focus on the appropriate warranty field based on form type
        if (extractedData?.products && extractedData.products.length > 0) {
          // Multi-product form - focus on first product's warranty field
          firstProductWarrantyRef.current?.focus();
        } else {
          // Single product form - focus on main warranty field
          warrantyPeriodRef.current?.focus();
        }
      }, 100);
    }
  }, [showExtractedForm, extractedData?.products]);

  // No longer needed - user data comes from context

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
      // Reset all processing-related state when capturing a new image
      setCapturedImage(imageSrc);
      setShowCamera(false);
      setError(null);
      setSuccess(false);
      setExtractedText('');
      setExtractedData(null);
      setValidationResult(null);
      setOcrProgress(0);
      setShowExtractedForm(false);
      setIsValidating(false);
      setProcessingStep('');
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
      
      // Reset all processing-related state when capturing a new long image
      setCapturedImage(bestFrame);
      setShowCamera(false);
      setCapturedFrames([]);
      setCaptureProgress(0);
      setLongCaptureInstructions('');
      setError(null);
      setSuccess(false);
      setExtractedText('');
      setExtractedData(null);
      setValidationResult(null);
      setOcrProgress(0);
      setShowExtractedForm(false);
      setIsValidating(false);
      setProcessingStep('');
    }
  }, [capturedFrames]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Reset all processing-related state when uploading a new file
    setUploadedFile(file);
    setError(null);
    setSuccess(false);
    setExtractedText('');
    setExtractedData(null);
    setValidationResult(null);
    setOcrProgress(0);
    setShowExtractedForm(false);
    setIsValidating(false);
    setIsProcessing(true);
    setProcessingStep('Processing file...');

    const fileType = file.type;
    const fileName = file.name.toLowerCase();

    try {
      if (fileType.startsWith('image/')) {
        // Image: proceed as before
        const reader = new FileReader();
        reader.onload = (e) => {
          setCapturedImage(e.target?.result as string);
          setIsProcessing(false);
          setProcessingStep('');
        };
        reader.readAsDataURL(file);
        return;
      }
      if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
        // PDF: use pdfjs-dist to render first page to image
        setProcessingStep('Converting PDF to image...');
        const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 2 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Failed to get canvas context');
        await page.render({ canvasContext: context, viewport }).promise;
        const dataUrl = canvas.toDataURL('image/png');
        setCapturedImage(dataUrl);
        setIsProcessing(false);
        setProcessingStep('');
        return;
      }
      if (
        fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        fileType === 'application/msword' ||
        fileName.endsWith('.docx') ||
        fileName.endsWith('.doc')
      ) {
        // DOCX: use mammoth to convert to HTML, then html2canvas to render to image
        setProcessingStep('Converting Word document to image...');
        const arrayBuffer = await file.arrayBuffer();
        const { value: html } = await mammoth.convertToHtml({ arrayBuffer });
        // Create a hidden div to render HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        tempDiv.style.position = 'fixed';
        tempDiv.style.left = '-9999px';
        tempDiv.style.top = '0';
        tempDiv.style.width = '800px';
        tempDiv.style.background = 'white';
        document.body.appendChild(tempDiv);
        const canvas = await html2canvas(tempDiv, { backgroundColor: '#fff', scale: 2 });
        document.body.removeChild(tempDiv);
        const dataUrl = canvas.toDataURL('image/png');
        setCapturedImage(dataUrl);
        setIsProcessing(false);
        setProcessingStep('');
        return;
      }
      setError('Unsupported file type. Please upload an image, PDF, or Word document.');
      setIsProcessing(false);
      setProcessingStep('');
    } catch (err: any) {
      setError('Failed to process file: ' + (err.message || err));
      setIsProcessing(false);
      setProcessingStep('');
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
    // Convert string source to File if needed
    let fileSource: File;
    if (typeof imageSource === 'string') {
      // Convert data URL to File
      const response = await fetch(imageSource);
      const blob = await response.blob();
      fileSource = new File([blob], 'receipt.jpg', { type: 'image/jpeg' });
    } else {
      fileSource = imageSource;
    }

    const result = await extractTextFromImage(fileSource, {
      // Google Cloud Vision is now the primary OCR engine with Tesseract as fallback
    });

    if (result.error) {
      throw new Error(result.error);
    }

    console.log(`OCR Method: ${result.method}`);
    console.log('OCR Confidence:', result.confidence);
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
      // Always use capturedImage if available (this includes converted PDFs/Word docs)
      // Otherwise use uploadedFile for direct image uploads
      const imageSource = capturedImage || uploadedFile!;
      const text = await performOCR(imageSource);
      setExtractedText(text);

      if (!text.trim()) {
        throw new Error('No text could be extracted from the image');
      }

      // Step 2: Structure data with GPT or fallback
      let structuredData: ExtractedData;

      try {
        if (openaiAvailable) {
          setProcessingStep('Extracting receipt data with AI...');
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

      // Step 3: Validate data with Perplexity (NEW STEP)
      setIsValidating(true);
      const productName = structuredData.product_description || 'product';
      setProcessingStep(`Validating "${productName}" details...`);
      
      try {
        const validation = await PerplexityValidationService.validateReceiptData(structuredData);
        setValidationResult(validation);
        
        if (validation.success) {
          setExtractedData(validation.validatedData);
          setProcessingStep('Data validated and ready for review!');
          console.log('✅ Validation successful:', validation.validationDetails);
        } else {
          console.warn('⚠️ Validation failed, using original data:', validation.error);
          setExtractedData(structuredData);
          
          // Show specific error message based on the type of failure
          if (validation.error?.includes('API key not configured')) {
            setProcessingStep('Validation skipped (API key not configured). Please review data carefully.');
          } else {
            setProcessingStep(`Validation failed: ${validation.error || 'Unknown error'}. Please review carefully.`);
          }
        }
      } catch (validationError) {
        console.error('💥 Validation error:', validationError);
        setExtractedData(structuredData);
        setProcessingStep('Validation unavailable. Please review data carefully.');
        
        // Set a failed validation result for UI display
        setValidationResult({
          success: false,
          validatedData: structuredData,
          validationDetails: {
            productDescription: { original: structuredData.product_description || '', validated: structuredData.product_description || '', confidence: 0, changed: false },
            brand: { original: structuredData.brand_name || '', validated: structuredData.brand_name || '', confidence: 0, changed: false },
            storeName: { original: structuredData.store_name || '', validated: structuredData.store_name || '', confidence: 0, changed: false },
            warrantyPeriod: { original: structuredData.warranty_period || '', validated: structuredData.warranty_period || '', confidence: 0, changed: false }
          },
          error: validationError instanceof Error ? validationError.message : 'Unknown validation error'
        });
      } finally {
        setIsValidating(false);
      }

      setShowExtractedForm(true);

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
      
      // For manual entry, image is optional
      if (inputMode === 'manual') {
        // Upload image only if provided for manual entries
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
        }
        // For manual entry, no image is required - continue without image
      } else {
        // For capture/upload modes, image is required
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
      }

      const processingMethod = inputMode === 'manual' ? 'manual' : (extractedText ? 'gpt_structured' : 'manual');
      const ocrConfidence = extractedText ? 0.85 : undefined;

      // Check for duplicates before saving
      setProcessingStep('Checking for duplicates...');
      const duplicateResult = await DuplicateDetectionService.checkForDuplicates(
        extractedData,
        user.id
      );

      if (duplicateResult.isDuplicate) {
        // Show duplicate warning modal
        setDuplicateMatches(duplicateResult.matches);
        setDuplicateConfidence(duplicateResult.confidence);
        setPendingSaveData({
          extractedData,
          imageUrl,
          processingMethod,
          ocrConfidence,
          extractedText: extractedText || undefined
        });
        setShowDuplicateWarning(true);
        setIsProcessing(false);
        return;
      }

      // No duplicates found, proceed with save
      await performSave(extractedData, imageUrl, processingMethod, ocrConfidence, extractedText);

    } catch (err: any) {
      console.error('Save error:', err);
      setError(err.message || 'Failed to save receipt');
      setIsProcessing(false);
    }
  };

  const performSave = async (
    data: ExtractedData,
    imageUrl: string | undefined,
    processingMethod: string,
    ocrConfidence?: number,
    extractedText?: string
  ) => {
    if (!user) return;

    try {
      setIsProcessing(true);
      const productName = data.product_description || 'receipt';
      setProcessingStep(`Saving "${productName}"...`);

      // Use the new MultiProductReceiptService
      const result = await MultiProductReceiptService.saveReceipt(
        data,
        user.id,
        imageUrl,
        processingMethod,
        ocrConfidence,
        extractedText || undefined
      );

      if (!result.receipts || result.receipts.length === 0) {
        throw new Error(result.error || 'Failed to save receipt');
      }

      // Call the onReceiptSaved callback if provided to navigate to MyLibrary
      if (onReceiptSaved) {
        onReceiptSaved(result.receipts[0].id);
        return; // Exit early to prevent showing success message
      }

      // Fallback: show success message if no callback provided
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

  const handleDuplicateProceed = async () => {
    if (!pendingSaveData) return;

    setShowDuplicateWarning(false);
    await performSave(
      pendingSaveData.extractedData,
      pendingSaveData.imageUrl,
      pendingSaveData.processingMethod,
      pendingSaveData.ocrConfidence,
      pendingSaveData.extractedText
    );
    
    // Clear pending data
    setPendingSaveData(null);
    setDuplicateMatches([]);
    setDuplicateConfidence(0);
  };

  const handleDuplicateCancel = () => {
    setShowDuplicateWarning(false);
    setPendingSaveData(null);
    setDuplicateMatches([]);
    setDuplicateConfidence(0);
    setIsProcessing(false);
  };

  // Helper functions for managing multiple products
  const addNewProduct = () => {
    if (!extractedData) return;
    
    const newProduct = {
      product_description: '',
      brand_name: '',
      model_number: '',
      amount: 0,
      warranty_period: '1 year' // Each product gets its own warranty
    };

    if (extractedData.products) {
      // Already multi-product, just add to array
      setExtractedData({
        ...extractedData,
        products: [...extractedData.products, newProduct]
      });
    } else {
      // Convert single product to multi-product
      const currentProduct = {
        product_description: extractedData.product_description || '',
        brand_name: extractedData.brand_name || '',
        model_number: extractedData.model_number || '',
        amount: extractedData.amount || 0,
        warranty_period: extractedData.warranty_period || '1 year' // Use existing warranty for conversion
      };
      
      setExtractedData({
        ...extractedData,
        products: [currentProduct, newProduct],
        total_amount: (extractedData.amount || 0) + 0
      });
    }
  };

  const removeProduct = (index: number) => {
    if (!extractedData?.products) return;
    
    const updatedProducts = extractedData.products.filter((_, i) => i !== index);
    
    if (updatedProducts.length === 0) {
      // Convert back to single product with empty data
      const { products, ...singleProductData } = extractedData;
      setExtractedData({
        ...singleProductData,
        product_description: '',
        brand_name: '',
        model_number: '',
        amount: 0
      });
    } else if (updatedProducts.length === 1) {
      // Convert back to single product
      const product = updatedProducts[0];
      const { products, ...singleProductData } = extractedData;
      setExtractedData({
        ...singleProductData,
        product_description: product.product_description,
        brand_name: product.brand_name,
        model_number: product.model_number,
        amount: product.amount
      });
    } else {
      // Keep as multi-product
      const newTotal = updatedProducts.reduce((sum, product) => sum + (product.amount || 0), 0);
      setExtractedData({
        ...extractedData,
        products: updatedProducts,
        total_amount: newTotal
      });
    }
  };

  const convertToMultiProduct = () => {
    if (!extractedData || extractedData.products) return;
    
    const currentProduct = {
      product_description: extractedData.product_description || '',
      brand_name: extractedData.brand_name || '',
      model_number: extractedData.model_number || '',
      amount: extractedData.amount || 0,
      warranty_period: extractedData.warranty_period || '1 year'
    };
    
    setExtractedData({
      ...extractedData,
      products: [currentProduct],
      total_amount: extractedData.amount || 0
    });
  };

  const updateProductInArray = (index: number, field: string, value: any) => {
    if (!extractedData?.products) return;
    
    const updatedProducts = [...extractedData.products];
    updatedProducts[index] = { ...updatedProducts[index], [field]: value };
    
    // Recalculate total if amount changed
    const newTotal = updatedProducts.reduce((sum, product) => sum + (product.amount || 0), 0);
    
    setExtractedData({
      ...extractedData,
      products: updatedProducts,
      total_amount: newTotal
    });
  };

  const startManualEntry = () => {
    // Reset all processing-related state when starting manual entry
    setInputMode('manual');
    setError(null);
    setSuccess(false);
    setExtractedText('');
    setValidationResult(null);
    setOcrProgress(0);
    setIsValidating(false);
    setProcessingStep('');
    setCapturedImage(null);
    setUploadedFile(null);
    
    setExtractedData({
      product_description: '',
      brand_name: '',
      store_name: '',
      purchase_location: '',
      purchase_date: new Date().toISOString().split('T')[0],
      amount: undefined,
      total_amount: 0,
      warranty_period: '1 year', // Keep for single product backward compatibility
      extended_warranty: '',
      model_number: '',
      country: 'United States'
    });
    setShowExtractedForm(true);
  };

  const startMultiProductEntry = () => {
    // Reset all processing-related state when starting multi-product manual entry
    setInputMode('manual');
    setError(null);
    setSuccess(false);
    setExtractedText('');
    setValidationResult(null);
    setOcrProgress(0);
    setIsValidating(false);
    setProcessingStep('');
    setCapturedImage(null);
    setUploadedFile(null);
    
    setExtractedData({
      store_name: '',
      purchase_location: '',
      purchase_date: new Date().toISOString().split('T')[0],
      total_amount: 0,
      extended_warranty: '',
      country: 'United States',
      products: [{
        product_description: '',
        brand_name: '',
        model_number: '',
        amount: 0,
        warranty_period: '1 year' // Each product has its own warranty
      }]
    });
    setShowExtractedForm(true);
  };

  return (
    <div className="min-h-screen bg-background font-['Inter',sans-serif]">
      {/* Header */}
      <header className="bg-white shadow-card border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8">
          <div className="flex justify-between items-center h-16 min-w-0">
            {/* Logo - Clickable to Dashboard */}
            <button 
              onClick={onBackToDashboard}
              className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-shrink-0 hover:opacity-80 transition-opacity duration-200"
            >
              <img 
                src="/Smart Receipt Logo.png" 
                alt="Smart Receipts Logo" 
                className="h-8 w-8 sm:h-10 sm:w-10 object-contain flex-shrink-0"
              />
              <div className="relative">
                <span className="text-lg sm:text-xl lg:text-2xl font-bold bg-gradient-to-r from-teal-500 to-blue-600 bg-clip-text text-transparent truncate">
                  Smart Receipts
                </span>
                {/* Premium Label */}
                {subscriptionInfo?.plan === 'premium' && (
                  <div className="absolute -top-3 right-0 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-lg">
                    PREMIUM
                  </div>
                )}
              </div>
            </button>

            {/* Header Actions */}
            <div className="flex items-center space-x-2 sm:space-x-4">
              {/* Notifications */}
              {user && <NotificationDropdown userId={user.id} />}

              {/* Settings Button */}
              <button
                onClick={() => {
                  // Navigate to profile settings - for now using onBackToDashboard as placeholder
                  onBackToDashboard();
                }}
                className="p-2 text-text-secondary hover:text-text-primary transition-colors duration-200"
                title="Settings"
              >
                <Settings className="h-6 w-6" />
              </button>

              {/* User Menu */}
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200"
                >
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-primary flex items-center justify-center">
                    {profilePicture ? (
                      <img
                        src={profilePicture}
                        alt="Profile"
                        className="w-full h-full object-cover"
                        onError={() => {}}
                      />
                    ) : (
                      <User className="h-4 w-4 text-white" />
                    )}
                  </div>
                  <span className="text-sm font-medium text-text-primary hidden sm:inline">
                    {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}
                  </span>
                </button>

                {/* User Dropdown */}
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-44 sm:w-48 bg-white rounded-lg shadow-card border border-gray-200 py-2 z-50 max-w-[calc(100vw-2rem)] mr-2">
                    <div className="px-4 py-2 border-b border-gray-200">
                      <p className="text-sm font-medium text-text-primary">
                        {user?.user_metadata?.full_name || 'User'}
                      </p>
                      <p className="text-xs text-text-secondary">{user?.email}</p>
                    </div>
                    <button
                      onClick={() => {
                        // Navigate to profile settings - for now using onBackToDashboard as placeholder
                        onBackToDashboard();
                        setShowUserMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-text-secondary hover:bg-gray-100 hover:text-text-primary transition-colors duration-200 flex items-center space-x-2"
                    >
                      <User className="h-4 w-4" />
                      <span>Profile Settings</span>
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
      <main className="max-w-4xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-6 sm:py-8">
        {/* Page Title */}
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-text-primary mb-3 sm:mb-4">
            Add Your Receipt
          </h1>
          <p className="text-base sm:text-lg lg:text-xl text-text-secondary">
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
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-card w-full max-w-lg mx-auto max-h-[95vh] overflow-y-auto">
              <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
                <h2 className="text-lg sm:text-xl font-bold text-text-primary">
                  {captureMode === 'long' ? 'Capture Long Receipt' : 'Capture Receipt'}
                </h2>
                <button
                  onClick={() => setShowCamera(false)}
                  className="text-text-secondary hover:text-text-primary transition-colors duration-200"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="p-4 sm:p-6">
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

                {/* Fixed size camera container - matches the green dotted border area */}
                <div className="relative w-full mx-auto" style={{ 
                  height: '420px',
                  maxWidth: '480px'
                }}>
                  <Webcam
                    ref={webcamRef}
                    audio={false}
                    screenshotFormat="image/jpeg"
                    className="w-full h-full rounded-lg object-cover"
                    style={{ borderRadius: '0.5rem' }}
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
                  Select an image, PDF, or Word document from your device
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,application/pdf,.doc,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword"
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
                <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/20 rounded-xl p-4 w-fit mx-auto mb-4">
                  <Edit3 className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-lg font-bold text-text-primary mb-2">Manual Entry</h3>
                <p className="text-text-secondary text-sm mb-4">
                  Enter receipt details manually
                </p>
                <div className="space-y-2">
                  <button
                    onClick={startManualEntry}
                    className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors duration-200"
                  >
                    Single Product
                  </button>
                  <button
                    onClick={startMultiProductEntry}
                    className="w-full bg-blue-500 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-600 transition-colors duration-200 flex items-center justify-center space-x-2"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Multiple Products</span>
                  </button>
                </div>
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
                  Extracting Text from Receipt
                  </span>
                </div>

                <div className={`flex items-center space-x-3 p-3 rounded-lg ${extractedData && !isValidating ? 'bg-green-50 border border-green-200' : 'bg-gray-50'}`}>
                  <div className={`rounded-full p-1 ${extractedData && !isValidating ? 'bg-green-500' : 'bg-gray-300'}`}>
                    {extractedData && !isValidating ? <Check className="h-3 w-3 text-white" /> : <Brain className="h-3 w-3 text-white" />}
                  </div>
                  <span className={`text-sm ${extractedData && !isValidating ? 'text-green-700' : 'text-text-secondary'}`}>
                  Organizing Receipt Details
                  </span>
                </div>

                <div className={`flex items-center space-x-3 p-3 rounded-lg ${validationResult ? 'bg-green-50 border border-green-200' : (isValidating ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50')}`}>
                  <div className={`rounded-full p-1 ${validationResult ? 'bg-green-500' : (isValidating ? 'bg-blue-500' : 'bg-gray-300')}`}>
                    {validationResult ? <Check className="h-3 w-3 text-white" /> : (isValidating ? <Loader2 className="h-3 w-3 text-white animate-spin" /> : <Zap className="h-3 w-3 text-white" />)}
                  </div>
                  <span className={`text-sm ${validationResult ? 'text-green-700' : (isValidating ? 'text-blue-700' : 'text-text-secondary')}`}>
                  Verifying Information Accuracy
                  </span>
                </div>

                <div className={`flex items-center space-x-3 p-3 rounded-lg ${success ? 'bg-green-50 border border-green-200' : 'bg-gray-50'}`}>
                  <div className={`rounded-full p-1 ${success ? 'bg-green-500' : 'bg-gray-300'}`}>
                    {success ? <Check className="h-3 w-3 text-white" /> : <Save className="h-3 w-3 text-white" />}
                  </div>
                  <span className={`text-sm ${success ? 'text-green-700' : 'text-text-secondary'}`}>
                  Saving Receipt Securely
                  </span>
                </div>
              </div>

              {/* Validation Summary */}
              {validationResult && (
                <div className="mt-6">
                  <h3 className="font-medium text-text-primary mb-2">Validation Results:</h3>
                  {validationResult.success ? (
                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-3 rounded-lg space-y-2">
                      {Object.entries(validationResult.validationDetails).map(([key, detail]) => (
                        <div key={key} className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-medium text-text-primary capitalize">
                              {key.replace(/([A-Z])/g, ' $1').trim()}:
                            </span>
                            {detail.changed ? (
                              <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                                Improved
                              </span>
                            ) : (
                              <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                                Verified
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-text-secondary">
                            {detail.confidence}% confidence
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <span className="text-yellow-600">⚠️</span>
                        <span className="text-xs text-yellow-700">
                          {validationResult.error || 'Validation was skipped'}
                        </span>
                      </div>
                      {validationResult.error?.includes('API key not configured') && (
                        <div className="mt-2 text-xs text-yellow-600">
                          To enable validation, add <code className="bg-yellow-100 px-1 rounded">VITE_PERPLEXITY_API_KEY</code> to your .env.local file
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

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
              <div>
                <h2 className="text-2xl font-bold text-text-primary mb-1">
                  {extractedData.product_description || 'Receipt Details'}
                </h2>
                <p className="text-sm text-text-secondary">
                  {inputMode === 'manual' ? 'Enter your receipt details below' : 'Review and edit the extracted information'}
                </p>
              </div>
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

            {inputMode === 'manual' ? (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-700">
                  💡 <strong>Manual Entry:</strong> No receipt image required! Simply enter your receipt details below. 
                  You can optionally upload an image later for reference, but all warranty tracking and alerts will work based on the information you provide.
                </p>
              </div>
            ) : (
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
                  </div>
                </div>

                {/* Products List */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-text-primary">Products</h3>
                    <button
                      onClick={addNewProduct}
                      className="bg-primary text-white px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors duration-200 flex items-center space-x-2"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Add Product</span>
                    </button>
                  </div>
                  <div className="space-y-4">
                    {extractedData.products.map((product, index) => (
                      <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-md font-medium text-text-primary">Product {index + 1}</h4>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-text-secondary">${product.amount?.toFixed(2) || '0.00'}</span>
                            {extractedData.products && extractedData.products.length > 1 && (
                              <button
                                onClick={() => removeProduct(index)}
                                className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50 transition-colors duration-200"
                                title="Remove this product"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </div>
                        
                        {/* Product Name - Full Width and Prominent */}
                        <div className="mb-4">
                          <label className="block text-md font-semibold text-text-primary mb-2 flex items-center">
                            <Edit3 className="h-4 w-4 mr-2 text-primary" />
                            Product Name *
                          </label>
                          <input
                            type="text"
                            value={product.product_description || ''}
                            onChange={(e) => updateProductInArray(index, 'product_description', e.target.value)}
                            className="w-full px-4 py-3 text-md border-2 border-primary/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200"
                            placeholder="Enter a short, descriptive product name"
                          />
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">

                          <div>
                            <label className="block text-sm font-medium text-text-primary mb-2">
                              Brand Name *
                            </label>
                            <input
                              type="text"
                              value={product.brand_name || ''}
                              onChange={(e) => updateProductInArray(index, 'brand_name', e.target.value)}
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
                              onChange={(e) => updateProductInArray(index, 'model_number', e.target.value)}
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
                              onChange={(e) => updateProductInArray(index, 'amount', e.target.value ? parseFloat(e.target.value) : 0)}
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors duration-200"
                              placeholder="Enter amount"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-text-primary mb-2">
                              Warranty Period *
                            </label>
                            <input
                              ref={index === 0 ? firstProductWarrantyRef : undefined}
                              type="text"
                              value={product.warranty_period || ''}
                              onChange={(e) => updateProductInArray(index, 'warranty_period', e.target.value)}
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors duration-200"
                              placeholder="e.g., 1 year, 6 months"
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
              <div className="space-y-6">
                {/* Convert to Multi-Product Option */}
                <div className="flex justify-end">
                  <button
                    onClick={convertToMultiProduct}
                    className="bg-secondary text-white px-4 py-2 rounded-lg font-medium hover:bg-secondary/90 transition-colors duration-200 flex items-center space-x-2"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add More Products</span>
                  </button>
                </div>

                {/* Product Name - Full Width and Prominent */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <label className="block text-lg font-semibold text-text-primary mb-3 flex items-center">
                    <Edit3 className="h-5 w-5 mr-2 text-primary" />
                    Product Name *
                  </label>
                  <input
                    type="text"
                    value={extractedData.product_description || ''}
                    onChange={(e) => updateExtractedData('product_description', e.target.value)}
                    className="w-full px-4 py-4 text-lg border-2 border-primary/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200 bg-white"
                    placeholder="Enter a short, descriptive product name"
                  />
                  <p className="text-sm text-text-secondary mt-2">
                    💡 This will be the main identifier for your receipt. Keep it short and clear!
                  </p>
                </div>

                {/* Other Product Information */}
                <div className="grid md:grid-cols-2 gap-6">

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
                    ref={warrantyPeriodRef}
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

      {/* Duplicate Warning Modal */}
      <DuplicateWarningModal
        isOpen={showDuplicateWarning}
        matches={duplicateMatches}
        confidence={duplicateConfidence}
        onProceed={handleDuplicateProceed}
        onCancel={handleDuplicateCancel}
      />

      <Footer />
    </div>
  );
};

export default ReceiptScanning;