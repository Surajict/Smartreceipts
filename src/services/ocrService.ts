import { createWorker } from 'tesseract.js';

// OCR Engine types
export type OCREngine = 'tesseract' | 'google-cloud-vision';

// OCR Result interface
export interface OCRResult {
  text: string;
  confidence: number;
  engine: OCREngine;
  processingTime: number;
  error?: string;
}

// OCR Progress callback type
export type OCRProgressCallback = (progress: number, step: string) => void;

/**
 * Tesseract OCR Implementation
 */
export class TesseractOCR {
  static async extractText(
    imageSource: string | File,
    onProgress?: OCRProgressCallback
  ): Promise<OCRResult> {
    const startTime = Date.now();
    
    try {
      onProgress?.(10, 'Initializing Tesseract OCR engine...');
      
      const worker = await createWorker('eng');
      
      onProgress?.(30, 'Analyzing receipt image...');
      
      const { data: { text, confidence } } = await worker.recognize(imageSource);
      
      onProgress?.(80, 'Extracting text from receipt...');
      
      await worker.terminate();
      
      onProgress?.(100, 'OCR completed successfully!');
      
      const processingTime = Date.now() - startTime;
      
      return {
        text: text.trim(),
        confidence: confidence / 100, // Convert to 0-1 scale
        engine: 'tesseract',
        processingTime
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      return {
        text: '',
        confidence: 0,
        engine: 'tesseract',
        processingTime,
        error: error instanceof Error ? error.message : 'Tesseract OCR failed'
      };
    }
  }
}

/**
 * Google Cloud Vision OCR Implementation
 */
export class GoogleCloudVisionOCR {
  private static readonly API_ENDPOINT = 'https://vision.googleapis.com/v1/images:annotate';
  
  static async extractText(
    imageSource: string | File,
    onProgress?: OCRProgressCallback
  ): Promise<OCRResult> {
    const startTime = Date.now();
    
    try {
      const apiKey = import.meta.env.VITE_GOOGLE_CLOUD_API_KEY;
      
      if (!apiKey) {
        throw new Error('Google Cloud Vision API key not configured. Please set VITE_GOOGLE_CLOUD_API_KEY in your environment variables.');
      }
      
      onProgress?.(10, 'Initializing Google Cloud Vision...');
      
      // Convert image to base64
      const base64Image = await this.convertToBase64(imageSource);
      
      onProgress?.(30, 'Uploading image to Google Cloud Vision...');
      
      const requestBody = {
        requests: [
          {
            image: {
              content: base64Image
            },
            features: [
              {
                type: 'TEXT_DETECTION',
                maxResults: 1
              }
            ],
            imageContext: {
              textDetectionParams: {
                enableTextDetectionConfidenceScore: true
              }
            }
          }
        ]
      };
      
      onProgress?.(50, 'Processing image with AI...');
      
      const response = await fetch(`${this.API_ENDPOINT}?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Google Cloud Vision API error: ${response.status} - ${errorData}`);
      }
      
      onProgress?.(80, 'Extracting text from response...');
      
      const data = await response.json();
      
      if (data.responses[0].error) {
        throw new Error(`Google Cloud Vision error: ${data.responses[0].error.message}`);
      }
      
      const textAnnotation = data.responses[0].textAnnotations?.[0];
      
      if (!textAnnotation) {
        return {
          text: '',
          confidence: 0,
          engine: 'google-cloud-vision',
          processingTime: Date.now() - startTime,
          error: 'No text detected in image'
        };
      }
      
      onProgress?.(100, 'OCR completed successfully!');
      
      const processingTime = Date.now() - startTime;
      
      return {
        text: textAnnotation.description.trim(),
        confidence: textAnnotation.confidence || 0.9, // Default confidence if not provided
        engine: 'google-cloud-vision',
        processingTime
      };
      
    } catch (error) {
      const processingTime = Date.now() - startTime;
      return {
        text: '',
        confidence: 0,
        engine: 'google-cloud-vision',
        processingTime,
        error: error instanceof Error ? error.message : 'Google Cloud Vision OCR failed'
      };
    }
  }
  
  private static async convertToBase64(imageSource: string | File): Promise<string> {
    if (typeof imageSource === 'string') {
      // If it's a data URL, extract the base64 part
      if (imageSource.startsWith('data:')) {
        return imageSource.split(',')[1];
      }
      
      // If it's a URL, fetch and convert
      const response = await fetch(imageSource);
      const blob = await response.blob();
      return this.blobToBase64(blob);
    }
    
    // If it's a File object
    return this.blobToBase64(imageSource);
  }
  
  private static async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const base64 = dataUrl.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
}

/**
 * Main OCR Service that handles both engines
 */
export class OCRService {
  static async extractText(
    imageSource: string | File,
    engine: OCREngine = 'tesseract',
    onProgress?: OCRProgressCallback
  ): Promise<OCRResult> {
    switch (engine) {
      case 'tesseract':
        return TesseractOCR.extractText(imageSource, onProgress);
      
      case 'google-cloud-vision':
        return GoogleCloudVisionOCR.extractText(imageSource, onProgress);
      
      default:
        throw new Error(`Unsupported OCR engine: ${engine}`);
    }
  }
  
  /**
   * Get available OCR engines based on configuration
   */
  static getAvailableEngines(): { engine: OCREngine; name: string; description: string }[] {
    const engines = [
      {
        engine: 'tesseract' as OCREngine,
        name: 'Tesseract OCR',
        description: 'Free, offline OCR processing in your browser'
      }
    ];
    
    // Check if Google Cloud Vision is configured
    if (import.meta.env.VITE_GOOGLE_CLOUD_API_KEY) {
      engines.push({
        engine: 'google-cloud-vision' as OCREngine,
        name: 'Google Cloud Vision',
        description: 'Advanced AI-powered OCR with higher accuracy'
      });
    }
    
    return engines;
  }
  
  /**
   * Test if an OCR engine is available
   */
  static async testEngine(engine: OCREngine): Promise<boolean> {
    try {
      switch (engine) {
        case 'tesseract':
          return true; // Tesseract is always available
        
        case 'google-cloud-vision':
          const apiKey = import.meta.env.VITE_GOOGLE_CLOUD_API_KEY;
          return !!apiKey;
        
        default:
          return false;
      }
    } catch {
      return false;
    }
  }
} 