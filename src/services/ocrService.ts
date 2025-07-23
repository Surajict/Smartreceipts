import { recognize } from 'tesseract.js'

// Types for OCR results and configuration
export interface OCRResult {
  text: string
  confidence: number
  method: 'tesseract' | 'google-vision'
  error?: string
  success?: boolean
}

export interface ProcessedReceiptResult {
  success: boolean
  ocrResult: OCRResult
  extractedData?: {
    storeName?: string
    date?: string
    items?: Array<{
      name: string
      price: number
      quantity?: number
    }>
    total?: number
    subtotal?: number
    tax?: number
    currency?: string
    quality?: 'excellent' | 'good' | 'poor' | 'failed'
    warranty?: {
      standard?: string
      extended?: string
    }
    language?: string
    languages?: string[]
    country?: string
  }
  processingTime: number
}

export interface OCRValidationResult {
  isValid: boolean
  quality: 'excellent' | 'good' | 'poor' | 'failed'
  suggestions: string[]
  confidence: number
}

export interface OCROptions {
  fallbackToGoogleVision?: boolean
  timeout?: number
  preprocessing?: {
    enhanceContrast?: boolean
    reduceNoise?: boolean
    straightenText?: boolean
    removeBackground?: boolean
  }
  engine?: string
  language?: string
  detectLanguage?: boolean
  autoRotate?: boolean
}

// Extract text from image using Tesseract.js
export async function extractTextFromImage(
  file: File, 
  options: OCROptions = {}
  ): Promise<OCRResult> {
  const startTime = Date.now()
  
  try {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      return {
        text: '',
        confidence: 0,
        method: 'tesseract',
        error: 'Invalid file type. Please upload an image file.'
      }
    }

    // Check file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      return {
        text: '',
        confidence: 0,
        method: 'tesseract',
        error: 'File too large. Please upload an image smaller than 10MB.'
      }
    }

    // Set up Tesseract options
    const tesseractOptions: any = {
      logger: () => {}, // Suppress logs in production
    }

    if (options.engine) {
      tesseractOptions.tessedit_ocr_engine_mode = options.engine
    }

    // Process with Tesseract
    const language = options.language || 'eng'
    const result = await recognize(file, language, tesseractOptions)

    // Check for timeout
    const processingTime = Date.now() - startTime
    if (options.timeout && processingTime > options.timeout) {
      throw new Error('Processing timeout exceeded')
    }

    return {
      text: result.data.text,
      confidence: result.data.confidence,
      method: 'tesseract'
    }

  } catch (error: any) {
    console.error('Tesseract OCR failed:', error)

    // Try Google Vision fallback if enabled
    if (options.fallbackToGoogleVision) {
      try {
        return await extractTextWithGoogleVision(file)
      } catch (fallbackError) {
        console.error('Google Vision fallback failed:', fallbackError)
      }
    }

    // Return error result
    let errorMessage = 'OCR processing failed'
    if (error.message?.includes('timeout')) {
      errorMessage = 'Processing timeout - please try with a smaller image'
    }

    return {
      text: '',
      confidence: 0,
      method: 'tesseract',
      error: errorMessage
    }
  }
}

// Fallback to Google Vision API
async function extractTextWithGoogleVision(file: File): Promise<OCRResult> {
  const apiKey = import.meta.env.VITE_GOOGLE_CLOUD_VISION_API_KEY
      if (!apiKey) {
    throw new Error('Google Vision API key not configured')
  }

  // Convert file to base64
  const base64 = await fileToBase64(file)
  const base64Content = base64.split(',')[1] // Remove data:image/... prefix

  const response = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [
          {
            image: {
              content: base64Content,
            },
            features: [
              {
                type: 'TEXT_DETECTION',
                maxResults: 1,
              },
            ],
          },
        ],
      }),
    }
  )
      
      if (!response.ok) {
    throw new Error(`Google Vision API error: ${response.statusText}`)
  }

  const data = await response.json()
  const textAnnotation = data.responses?.[0]?.textAnnotations?.[0]

  if (!textAnnotation) {
    throw new Error('No text detected by Google Vision')
  }

  return {
    text: textAnnotation.description || '',
    confidence: 85, // Google Vision doesn't provide confidence, use default
    method: 'google-vision'
  }
}

// Process receipt image and extract structured data
export async function processReceiptImage(
  file: File,
  options: OCROptions = {}
): Promise<ProcessedReceiptResult> {
  const startTime = Date.now()

  try {
    // Extract text using OCR
    const ocrResult = await extractTextFromImage(file, options)
    
    if (!ocrResult.text || ocrResult.error) {
        return {
        success: false,
        ocrResult,
        processingTime: Date.now() - startTime
      }
    }

    // Parse extracted text into structured data
    const extractedData = parseReceiptText(ocrResult.text, options)
      
      return {
      success: true,
      ocrResult,
      extractedData,
      processingTime: Date.now() - startTime
    }

  } catch (error: any) {
    console.error('Receipt processing failed:', error)
    
      return {
      success: false,
      ocrResult: {
        text: '',
        confidence: 0,
        method: 'tesseract',
        error: error.message || 'Receipt processing failed'
      },
      processingTime: Date.now() - startTime
    }
  }
}

// Parse receipt text into structured data
function parseReceiptText(text: string, options: OCROptions = {}): any {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0)
  
  const extractedData: any = {
    items: [],
    quality: determineQuality(text)
  }

  // Extract store name (usually first few lines)
  const storeNameLine = lines.find(line => 
    line.length > 3 && 
    !line.match(/^\d/) && 
    !line.includes('$') && 
    !line.includes('Total')
  )
  if (storeNameLine) {
    extractedData.storeName = storeNameLine
  }

  // Extract date
  const dateRegex = /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/
  const dateMatch = text.match(dateRegex)
  if (dateMatch) {
    extractedData.date = dateMatch[1]
  }

  // Extract items and prices
  const itemRegex = /(.+?)\s*[-–]\s*\$?(\d+\.?\d*)/g
  let match
  while ((match = itemRegex.exec(text)) !== null) {
    const itemName = match[1].trim()
    const price = parseFloat(match[2])
    
    if (itemName && !isNaN(price) && price > 0) {
      extractedData.items.push({
        name: itemName,
        price: price
      })
    }
  }

  // Extract totals
  const totalRegex = /total:?\s*\$?(\d+\.?\d*)/i
  const totalMatch = text.match(totalRegex)
  if (totalMatch) {
    extractedData.total = parseFloat(totalMatch[1])
  }

  // Extract subtotal
  const subtotalRegex = /subtotal:?\s*\$?(\d+\.?\d*)/i
  const subtotalMatch = text.match(subtotalRegex)
  if (subtotalMatch) {
    extractedData.subtotal = parseFloat(subtotalMatch[1])
  }

  // Extract tax/GST
  const taxRegex = /(tax|gst):?\s*\$?(\d+\.?\d*)/i
  const taxMatch = text.match(taxRegex)
  if (taxMatch) {
    extractedData.tax = parseFloat(taxMatch[2])
  }

  // Extract warranty information
  const warrantyRegex = /warranty:?\s*(\d+)\s*(month|year)s?/i
  const warrantyMatch = text.match(warrantyRegex)
  if (warrantyMatch) {
    const duration = parseInt(warrantyMatch[1])
    const unit = warrantyMatch[2].toLowerCase()
    const months = unit === 'year' ? duration * 12 : duration
    
    extractedData.warranty = {
      standard: `${months} months`
    }
  }

  // Extract extended warranty
  const extWarrantyRegex = /(applecare|extended|protection):?\s*(\d+)\s*(month|year)s?/i
  const extWarrantyMatch = text.match(extWarrantyRegex)
  if (extWarrantyMatch) {
    const duration = parseInt(extWarrantyMatch[2])
    const unit = extWarrantyMatch[3].toLowerCase()
    const months = unit === 'year' ? duration * 12 : duration
    
    if (!extractedData.warranty) extractedData.warranty = {}
    extractedData.warranty.extended = `${months} months`
  }

  // Detect currency
  if (text.includes('$')) {
    extractedData.currency = 'AUD' // Default to AUD for $ symbol
  } else if (text.includes('€')) {
    extractedData.currency = 'EUR'
  } else if (text.includes('£')) {
    extractedData.currency = 'GBP'
  } else if (text.includes('¥')) {
    extractedData.currency = 'JPY'
    } else {
    extractedData.currency = 'USD' // Default fallback
  }

  // Language detection
  if (options.detectLanguage) {
    extractedData.language = detectLanguage(text)
    extractedData.languages = detectMultipleLanguages(text)
    
    // Detect country from common indicators
    if (text.toLowerCase().includes('sydney') || text.toLowerCase().includes('melbourne')) {
      extractedData.country = 'Australia'
    } else if (text.toLowerCase().includes('paris') || text.toLowerCase().includes('france')) {
      extractedData.country = 'France'
    } else if (text.toLowerCase().includes('tokyo') || text.toLowerCase().includes('japan')) {
      extractedData.country = 'Japan'
    }
  }

  return extractedData
}

// Validate OCR result quality
export function validateOCRResult(result: OCRResult): OCRValidationResult {
  const suggestions: string[] = []
  
  // Handle error cases
  if (result.error || !result.text) {
    return {
      isValid: false,
      quality: 'failed',
      suggestions: ['No text could be extracted from the image'],
      confidence: 0
    }
  }

  // Determine quality based on confidence and content
  let quality: 'excellent' | 'good' | 'poor' | 'failed' = 'excellent'
  
  if (result.confidence < 30) {
    quality = 'poor'
    suggestions.push('Consider retaking the photo with better lighting')
    suggestions.push('Ensure the receipt is flat and clearly visible')
  } else if (result.confidence < 60) {
    quality = 'good'
    suggestions.push('Image quality could be improved for better accuracy')
  }

  // Check for essential receipt information
  const text = result.text.toLowerCase()
  const hasStore = /[a-zA-Z]{3,}/.test(result.text)
  const hasPrice = /\$?\d+\.?\d*/.test(result.text)
  const hasDate = /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(result.text)
  
  if (!hasStore && !hasPrice) {
    quality = 'poor'
    suggestions.push('Receipt may not contain standard format')
    return {
      isValid: false,
      quality,
      suggestions,
      confidence: result.confidence
    }
  }

  // Additional quality checks
  if (result.text.length < 20) {
    quality = 'poor'
    suggestions.push('Very little text detected - try a clearer image')
  }

  // Check for garbled text (lots of special characters)
  const specialCharRatio = (result.text.match(/[^a-zA-Z0-9\s\$\.\-]/g) || []).length / result.text.length
  if (specialCharRatio > 0.3) {
    quality = 'poor'
    suggestions.push('Text appears corrupted - try better lighting or focus')
  }

  const isValid = quality === 'excellent' || quality === 'good'

  return {
    isValid,
    quality,
    suggestions,
    confidence: result.confidence
  }
}

// Helper functions
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = error => reject(error)
  })
}

function determineQuality(text: string): 'excellent' | 'good' | 'poor' | 'failed' {
  if (!text || text.length < 10) return 'failed'
  
  const hasNumbers = /\d/.test(text)
  const hasLetters = /[a-zA-Z]/.test(text)
  const hasPrice = /\$?\d+\.?\d*/.test(text)
  
  if (hasNumbers && hasLetters && hasPrice && text.length > 50) {
    return 'excellent'
  } else if (hasNumbers && hasLetters) {
    return 'good'
  } else {
    return 'poor'
  }
}

function detectLanguage(text: string): string {
  // Simple language detection based on common words
  const french = ['magasin', 'prix', 'total', 'merci', 'france']
  const japanese = ['店', '円', '税込', '合計']
  const german = ['geschäft', 'preis', 'gesamt', 'danke']
  
  const lowerText = text.toLowerCase()
  
  if (french.some(word => lowerText.includes(word))) return 'fr'
  if (japanese.some(char => text.includes(char))) return 'ja'
  if (german.some(word => lowerText.includes(word))) return 'de'
  
  return 'en' // Default to English
}

function detectMultipleLanguages(text: string): string[] {
  const languages = []
  const lowerText = text.toLowerCase()
  
  // Check for English (default)
  if (/[a-zA-Z]/.test(text)) languages.push('en')
  
  // Check for French
  if (['magasin', 'prix', 'total', 'merci'].some(word => lowerText.includes(word))) {
    languages.push('fr')
  }
  
  // Check for Japanese
  if (/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(text)) {
    languages.push('ja')
  }
  
  // Check for Chinese
  if (/[\u4E00-\u9FAF]/.test(text)) {
    languages.push('zh')
  }
  
  return languages.length > 0 ? languages : ['en']
} 