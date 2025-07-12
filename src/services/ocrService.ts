import { createWorker } from 'tesseract.js';

// OCR Engine types
export type OCREngine = 'tesseract' | 'google-cloud-vision';

export interface OCRResult {
  text: string;
  confidence: number;
  engine: OCREngine;
  processingTime: number;
  error?: string;
}

export type OCRProgressCallback = (progress: number, step: string) => void;

/**
 * Tesseract OCR Implementation (BACKUP ONLY)
 * Note: This is kept as a fallback option but completely hidden from users
 */
export class TesseractOCR {
  static async extractText(
    imageSource: string | File,
    onProgress?: OCRProgressCallback
  ): Promise<OCRResult> {
    const startTime = Date.now();
    
    try {
      onProgress?.(10, 'Initializing text recognition...');
      
      const worker = await createWorker('eng');
      
      onProgress?.(30, 'Analyzing receipt image...');
      
      const { data: { text, confidence } } = await worker.recognize(imageSource);
      
      onProgress?.(80, 'Extracting text from receipt...');
      
      await worker.terminate();
      
      onProgress?.(100, 'Text extraction completed!');
      
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
        error: error instanceof Error ? error.message : 'Text extraction failed'
      };
    }
  }
}

/**
 * Google Cloud Vision OCR Implementation (PRIMARY AND ONLY USER-FACING OPTION)
 * This is the only OCR engine presented to users
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
        throw new Error('Text recognition service not configured. Please contact support.');
      }
      
      onProgress?.(10, 'Initializing text recognition...');
      
      // Convert image to base64
      const base64Image = await this.convertToBase64(imageSource);
      
      onProgress?.(30, 'Processing receipt image...');
      
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
      
      onProgress?.(50, 'Analyzing text with AI...');
      
      const response = await fetch(`${this.API_ENDPOINT}?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Text recognition failed: ${response.status} - ${errorData}`);
      }
      
      onProgress?.(80, 'Extracting text from response...');
      
      const data = await response.json();
      
      if (data.responses[0].error) {
        throw new Error(`Text recognition error: ${data.responses[0].error.message}`);
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
      
      onProgress?.(100, 'Text extraction completed!');
      
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
        error: error instanceof Error ? error.message : 'Text recognition failed'
      };
    }
  }

  private static async convertToBase64(imageSource: string | File): Promise<string> {
    if (typeof imageSource === 'string') {
      // It's a data URL, extract the base64 part
      const base64Match = imageSource.match(/^data:image\/[a-zA-Z]+;base64,(.+)$/);
      if (base64Match) {
        return base64Match[1];
      }
      throw new Error('Invalid image format');
    } else {
      // It's a File object, convert to base64
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          const base64Match = result.match(/^data:image\/[a-zA-Z]+;base64,(.+)$/);
          if (base64Match) {
            resolve(base64Match[1]);
          } else {
            reject(new Error('Failed to convert image to base64'));
          }
        };
        reader.onerror = () => reject(new Error('Failed to read image file'));
        reader.readAsDataURL(imageSource);
      });
    }
  }
}

/**
 * Main OCR Service - Always uses Google Cloud Vision with automatic Tesseract fallback
 * Users only see one "text recognition" option
 */
export class OCRService {
  static async extractText(
    imageSource: string | File,
    engine: OCREngine = 'google-cloud-vision', // Always default to Google Cloud Vision
    onProgress?: OCRProgressCallback
  ): Promise<OCRResult> {
    // Always try Google Cloud Vision first
    try {
      const result = await GoogleCloudVisionOCR.extractText(imageSource, onProgress);
      
      // If Google Cloud Vision succeeds, return the result
      if (!result.error) {
        return result;
      }
      
      // If Google Cloud Vision fails, try Tesseract as silent fallback
      console.warn('Google Cloud Vision failed, falling back to Tesseract:', result.error);
      onProgress?.(0, 'Switching to backup text recognition...');
      return TesseractOCR.extractText(imageSource, onProgress);
      
    } catch (error) {
      // If Google Cloud Vision fails completely, try Tesseract as silent fallback
      console.warn('Google Cloud Vision failed completely, falling back to Tesseract:', error);
      onProgress?.(0, 'Switching to backup text recognition...');
      return TesseractOCR.extractText(imageSource, onProgress);
    }
  }
  
  /**
   * Get available OCR engines - Only returns Google Cloud Vision for users
   * No choice is presented to users
   */
  static getAvailableEngines(): { engine: OCREngine; name: string; description: string }[] {
    // Only return Google Cloud Vision - no choices for users
    return [
      {
        engine: 'google-cloud-vision' as OCREngine,
        name: 'Text Recognition',
        description: 'AI-powered text extraction from receipt images'
      }
    ];
  }
  
  /**
   * Test if an OCR engine is available
   */
  static async testEngine(engine: OCREngine): Promise<boolean> {
    try {
      switch (engine) {
        case 'tesseract':
          // Test if Tesseract can be loaded
          try {
            const { createWorker } = await import('tesseract.js');
            return true;
          } catch {
            return false;
          }
        
        case 'google-cloud-vision':
          const apiKey = import.meta.env.VITE_GOOGLE_CLOUD_API_KEY;
          return !!apiKey && !apiKey.includes('placeholder') && apiKey.length > 10;
        
        default:
          return false;
      }
    } catch {
      return false;
    }
  }
  
  /**
   * Get the preferred OCR engine - Always returns Google Cloud Vision
   */
  static async getPreferredEngine(): Promise<OCREngine> {
    // Always return Google Cloud Vision as the only option
    return 'google-cloud-vision';
  }
} 