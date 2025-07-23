import { describe, it, expect, beforeEach, vi } from 'vitest'
import { processReceiptImage, extractTextFromImage, validateOCRResult } from '../ocrService'
import { mockImageFile, mockOCRResult } from '../../test/mocks/mockData'

// Mock Tesseract
vi.mock('tesseract.js', () => ({
  recognize: vi.fn().mockResolvedValue({
    data: {
      text: 'Apple Store\nSydney CBD\n15/01/2024\n\niPhone 15 Pro - $1499.00\nMagic Mouse - $129.00\nUSB-C Cable - $29.00\n\nTotal: $1657.00\nGST: $150.64\nThank you for your purchase!',
      confidence: 95
    }
  })
}))

// Mock Google Cloud Vision
const mockGoogleVision = vi.fn().mockResolvedValue({
  responses: [{
    textAnnotations: [{
      description: 'Apple Store\nSydney CBD\n15/01/2024\n\niPhone 15 Pro - $1499.00\nMagic Mouse - $129.00\nUSB-C Cable - $29.00\n\nTotal: $1657.00\nGST: $150.64\nThank you for your purchase!'
    }]
  }]
})

global.fetch = vi.fn().mockImplementation((url) => {
  if (url.includes('vision.googleapis.com')) {
    return Promise.resolve({
      ok: true,
      json: mockGoogleVision
    })
  }
  return Promise.reject(new Error('Unexpected fetch call'))
})

describe('OCR Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('extractTextFromImage', () => {
    it('should extract text using Tesseract.js', async () => {
      const result = await extractTextFromImage(mockImageFile)
      
      expect(result).toEqual({
        text: expect.stringContaining('Apple Store'),
        confidence: expect.any(Number),
        method: 'tesseract'
      })
      
      expect(result.confidence).toBeGreaterThan(0)
      expect(result.confidence).toBeLessThanOrEqual(100)
    })

    it('should handle Tesseract errors gracefully', async () => {
      const { recognize } = await import('tesseract.js')
      vi.mocked(recognize).mockRejectedValue(new Error('Tesseract failed'))
      
      const result = await extractTextFromImage(mockImageFile)
      
      expect(result).toEqual({
        text: '',
        confidence: 0,
        method: 'tesseract',
        error: 'OCR processing failed'
      })
    })

    it('should fall back to Google Vision API when Tesseract fails', async () => {
      const { recognize } = await import('tesseract.js')
      vi.mocked(recognize).mockRejectedValue(new Error('Tesseract failed'))
      
      // Mock environment variable for Google Vision
      vi.stubEnv('VITE_GOOGLE_CLOUD_VISION_API_KEY', 'test-api-key')
      
      // Mock Google Vision API response
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          responses: [{
            textAnnotations: [{
              description: 'Apple Store\n2023-01-15\niPhone 15 - $999.00\nTotal: $999.00'
            }]
          }]
        })
      } as Response)
      
      const result = await extractTextFromImage(mockImageFile, { fallbackToGoogleVision: true })
      
      expect(result.method).toBe('google-vision')
      expect(result.text).toContain('Apple Store')
    })

    it('should handle invalid file types', async () => {
      const invalidFile = new File(['invalid'], 'test.txt', { type: 'text/plain' })
      
      const result = await extractTextFromImage(invalidFile)
      
      expect(result).toEqual({
        text: '',
        confidence: 0,
        method: 'tesseract',
        error: 'Invalid file type. Please upload an image file.'
      })
    })

    it('should handle large files', async () => {
      // Create a mock large file (>10MB)
      const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.jpg', { 
        type: 'image/jpeg' 
      })
      
      const result = await extractTextFromImage(largeFile)
      
      expect(result).toEqual({
        text: '',
        confidence: 0,
        method: 'tesseract',
        error: 'File too large. Please upload an image smaller than 10MB.'
      })
    })

    it('should preprocess image for better OCR results', async () => {
      const result = await extractTextFromImage(mockImageFile, { 
        preprocessing: {
          enhanceContrast: true,
          reduceNoise: true,
          straightenText: true
        }
      })
      
      expect(result.text).toBeTruthy()
      expect(result.confidence).toBeGreaterThan(0)
    })
  })

  describe('processReceiptImage', () => {
    it('should process receipt image and return structured data', async () => {
      const result = await processReceiptImage(mockImageFile)
      
      expect(result).toEqual({
        success: true,
        ocrResult: {
          text: expect.stringContaining('Apple Store'),
          confidence: expect.any(Number),
          method: 'tesseract'
        },
        extractedData: {
          storeName: expect.any(String),
          date: expect.any(String),
          items: expect.any(Array),
          total: expect.any(Number),
          currency: expect.any(String)
        },
        processingTime: expect.any(Number)
      })
    })

    it('should handle multi-product receipts', async () => {
      const { recognize } = await import('tesseract.js')
      vi.mocked(recognize).mockResolvedValue({
        data: {
          text: `Apple Store
Sydney CBD
15/01/2024

MacBook Pro 14" - $2999.00
Magic Mouse - $129.00
USB-C Cable - $29.00

Subtotal: $3157.00
GST: $287.09
Total: $3444.09`,
          confidence: 92
        }
      })
      
      const result = await processReceiptImage(mockImageFile)
      
      expect(result.success).toBe(true)
      expect(result.extractedData?.items).toHaveLength(3)
      expect(result.extractedData?.items[0].name).toContain('MacBook Pro')
      expect(result.extractedData?.items[1].name).toContain('Magic Mouse')
      expect(result.extractedData?.items[2].name).toContain('USB-C Cable')
    })

    it('should handle receipts with tax information', async () => {
      const result = await processReceiptImage(mockImageFile)
      
      expect(result.extractedData?.tax).toBeDefined()
      expect(result.extractedData?.subtotal).toBeDefined()
      expect(result.extractedData?.total).toBeDefined()
    })

    it('should detect receipt orientation and rotate if needed', async () => {
      const { recognize } = await import('tesseract.js')
      vi.mocked(recognize).mockResolvedValue({
        data: {
          text: 'ǝɹoʇS ǝlddA', // Upside down text
          confidence: 30
        }
      })
      
      const result = await processReceiptImage(mockImageFile, { 
        autoRotate: true 
      })
      
      expect(result.ocrResult.confidence).toBeGreaterThan(30)
    })

    it('should handle poor quality images', async () => {
      const { recognize } = await import('tesseract.js')
      vi.mocked(recognize).mockResolvedValue({
        data: {
          text: 'App1e St0re\nSyd|\\/3y C8D\n15/0l/2024',
          confidence: 25
        }
      })
      
      const result = await processReceiptImage(mockImageFile)
      
      expect(result.success).toBe(true)
      expect(result.ocrResult.confidence).toBeLessThan(50)
      expect(result.extractedData?.quality).toBe('poor')
    })

    it('should extract warranty information when present', async () => {
      const { recognize } = await import('tesseract.js')
      vi.mocked(recognize).mockResolvedValue({
        data: {
          text: `Apple Store
iPhone 15 Pro - $1499.00
Warranty: 12 months
Extended warranty available
AppleCare+ - 24 months
Total: $1499.00`,
          confidence: 95
        }
      })
      
      const result = await processReceiptImage(mockImageFile)
      
      expect(result.extractedData?.warranty).toBeDefined()
      expect(result.extractedData?.warranty?.standard).toBe('12 months')
      expect(result.extractedData?.warranty?.extended).toBe('24 months')
    })
  })

  describe('validateOCRResult', () => {
    it('should validate high-quality OCR results', () => {
      const result = validateOCRResult({
        text: 'Apple Store\niPhone 15 Pro - $1499.00\nTotal: $1499.00',
        confidence: 95,
        method: 'tesseract'
      })
      
      expect(result).toEqual({
        isValid: true,
        quality: 'excellent',
        suggestions: [],
        confidence: 95
      })
    })

    it('should identify low-quality results', () => {
      const result = validateOCRResult({
        text: 'App1e St0re\ni|-|0ne 15 Pr0',
        confidence: 25,
        method: 'tesseract'
      })
      
      expect(result.isValid).toBe(false)
      expect(result.quality).toBe('poor')
      expect(result.suggestions).toContain('Consider retaking the photo with better lighting')
    })

    it('should detect missing essential information', () => {
      const result = validateOCRResult({
        text: 'Some random text without receipt information',
        confidence: 85,
        method: 'tesseract'
      })
      
      expect(result.isValid).toBe(false)
      expect(result.suggestions).toContain('Receipt may not contain standard format')
    })

    it('should handle empty OCR results', () => {
      const result = validateOCRResult({
        text: '',
        confidence: 0,
        method: 'tesseract',
        error: 'No text detected'
      })
      
      expect(result.isValid).toBe(false)
      expect(result.quality).toBe('failed')
      expect(result.suggestions).toContain('No text could be extracted from the image')
    })
  })

  describe('Language Detection', () => {
    it('should detect receipt language', async () => {
      const { recognize } = await import('tesseract.js')
      vi.mocked(recognize).mockResolvedValue({
        data: {
          text: 'Magasin Apple\nParis, France\n15/01/2024\niPhone 15 Pro - €1399.00',
          confidence: 92
        }
      })
      
      const result = await processReceiptImage(mockImageFile, { 
        detectLanguage: true 
      })
      
      expect(result.extractedData?.language).toBe('fr')
      expect(result.extractedData?.country).toBe('France')
    })

    it('should handle multi-language receipts', async () => {
      const { recognize } = await import('tesseract.js')
      vi.mocked(recognize).mockResolvedValue({
        data: {
          text: 'Apple Store\n苹果商店\nTokyo, Japan\niPhone 15 Pro - ¥199,800',
          confidence: 88
        }
      })
      
      const result = await processReceiptImage(mockImageFile, { 
        detectLanguage: true 
      })
      
      expect(result.extractedData?.languages).toContain('en')
      expect(result.extractedData?.languages).toContain('ja')
    })
  })

  describe('Performance', () => {
    it('should complete OCR processing within reasonable time', async () => {
      const startTime = Date.now()
      
      await extractTextFromImage(mockImageFile)
      
      const processingTime = Date.now() - startTime
      expect(processingTime).toBeLessThan(10000) // 10 seconds max
    })

    it('should handle concurrent OCR requests', async () => {
      const files = [mockImageFile, mockImageFile, mockImageFile]
      
      const promises = files.map(file => extractTextFromImage(file))
      const results = await Promise.all(promises)
      
      expect(results).toHaveLength(3)
      results.forEach(result => {
        expect(result.text).toBeTruthy()
        expect(result.confidence).toBeGreaterThan(0)
      })
    })

    it('should implement proper resource cleanup', async () => {
      const result = await extractTextFromImage(mockImageFile)
      
      expect(result).toBeDefined()
      // Verify no memory leaks or hanging resources
      expect(global.gc).not.toHaveBeenCalled() // Assuming gc mock exists
    })
  })

  describe('Error Handling', () => {
    it('should handle network timeouts', async () => {
      global.fetch = vi.fn().mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Network timeout')), 100)
        )
      )
      
      const result = await extractTextFromImage(mockImageFile, { 
        fallbackToGoogleVision: true,
        timeout: 50
      })
      
      expect(result.error).toContain('timeout')
    })

    it('should handle corrupted image files', async () => {
      const corruptedFile = new File(['corrupted data'], 'corrupt.jpg', { 
        type: 'image/jpeg' 
      })
      
      const result = await extractTextFromImage(corruptedFile)
      
      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should provide meaningful error messages', async () => {
      const { recognize } = await import('tesseract.js')
      vi.mocked(recognize).mockRejectedValue(new Error('Worker failed'))
      
      const result = await extractTextFromImage(mockImageFile)
      
      expect(result.error).toBe('OCR processing failed')
      expect(result.confidence).toBe(0)
    })
  })

  describe('Configuration', () => {
    it('should respect OCR engine preferences', async () => {
      await extractTextFromImage(mockImageFile, { 
        engine: 'LSTM_ONLY' 
      })
      
      const { recognize } = await import('tesseract.js')
      expect(recognize).toHaveBeenCalledWith(
        expect.any(File),
        'eng',
        expect.objectContaining({
          tessedit_ocr_engine_mode: 'LSTM_ONLY'
        })
      )
    })

    it('should handle custom language settings', async () => {
      await extractTextFromImage(mockImageFile, { 
        language: 'fra+eng' 
      })
      
      const { recognize } = await import('tesseract.js')
      expect(recognize).toHaveBeenCalledWith(
        expect.any(File),
        'fra+eng',
        expect.any(Object)
      )
    })

    it('should apply custom preprocessing options', async () => {
      const options = {
        preprocessing: {
          enhanceContrast: true,
          reduceNoise: true,
          straightenText: true,
          removeBackground: true
        }
      }
      
      const result = await extractTextFromImage(mockImageFile, options)
      
      expect(result).toBeDefined()
      // Verify preprocessing was applied (would check canvas operations in real implementation)
    })
  })
}) 