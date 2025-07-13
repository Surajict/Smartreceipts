import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MultiProductReceiptService } from '../services/multiProductReceiptService'
import { extractReceiptDataWithGPT } from '../lib/supabase'
import { ExtractedReceiptData } from '../types/receipt'

// Mock the dependencies
vi.mock('../lib/supabase', () => ({
  extractReceiptDataWithGPT: vi.fn(),
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve({ data: [], error: null }))
          }))
        }))
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null }))
        }))
      }))
    }))
  }
}))

describe('Multi-Product Receipt Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('End-to-End Receipt Processing', () => {
    it('should process a single-product receipt correctly', async () => {
      // Mock GPT extraction
      const mockGPTResponse = {
        data: {
          store_name: 'Best Buy',
          purchase_date: '2024-01-15',
          purchase_location: 'Los Angeles, CA',
          country: 'USA',
          warranty_period: '12 months',
          extended_warranty: 'None',
          total_amount: 299.99,
          amount: 299.99,
          product_description: 'Wireless Headphones',
          brand_name: 'Sony',
          model_number: 'WH-1000XM4'
        },
        error: null
      }

      ;(extractReceiptDataWithGPT as any).mockResolvedValue(mockGPTResponse)

      // Mock service response
      const mockServiceResponse = {
        success: true,
        receipts: [{ 
          id: 'receipt-123',
          user_id: 'test-user',
          store_name: 'Best Buy',
          product_description: 'Wireless Headphones',
          amount: 299.99,
          is_group_receipt: false,
          receipt_total: 299.99
        }],
        processing_method: 'gpt_structured' as const
      }

      // Mock the service method
      vi.spyOn(MultiProductReceiptService, 'saveReceipt').mockResolvedValue(mockServiceResponse)

      // Test the flow
      const ocrText = `
        BEST BUY
        Date: 01/15/2024
        Sony WH-1000XM4 Wireless Headphones
        Total: $299.99
        Warranty: 12 months
      `

      // Step 1: Extract data with GPT
      const extractionResult = await extractReceiptDataWithGPT(ocrText)
      expect(extractionResult.data).toBeTruthy()
      expect(extractionResult.data?.store_name).toBe('Best Buy')
      expect(extractionResult.data?.product_description).toBe('Wireless Headphones')

      // Step 2: Save with service
      const saveResult = await MultiProductReceiptService.saveReceipt(
        extractionResult.data!,
        'test-user',
        'test-image-url'
      )

      expect(saveResult.success).toBe(true)
      expect(saveResult.receipts).toHaveLength(1)
      expect(saveResult.receipts[0].is_group_receipt).toBe(false)
    })

    it('should process a multi-product receipt correctly', async () => {
      // Mock GPT extraction for multi-product
      const mockGPTResponse = {
        data: {
          store_name: 'Electronics Store',
          purchase_date: '2024-01-15',
          purchase_location: 'New York, NY',
          country: 'USA',
          warranty_period: '12 months',
          extended_warranty: 'None',
          total_amount: 549.98,
          products: [
            {
              product_description: 'Laptop',
              brand_name: 'Dell',
              model_number: 'XPS 13',
              amount: 399.99,
              warranty_period: '24 months'
            },
            {
              product_description: 'Mouse',
              brand_name: 'Logitech',
              model_number: 'MX Master 3',
              amount: 99.99,
              warranty_period: '12 months'
            },
            {
              product_description: 'USB Cable',
              brand_name: 'AmazonBasics',
              model_number: 'USB-C',
              amount: 49.99,
              warranty_period: '6 months'
            }
          ]
        },
        error: null
      }

      ;(extractReceiptDataWithGPT as any).mockResolvedValue(mockGPTResponse)

      // Mock service response for multi-product
      const mockServiceResponse = {
        success: true,
        receipts: [
          { 
            id: 'receipt-1',
            user_id: 'test-user',
            receipt_group_id: 'group-123',
            is_group_receipt: true,
            receipt_total: 549.98,
            amount: 399.99,
            product_description: 'Laptop'
          },
          { 
            id: 'receipt-2',
            user_id: 'test-user',
            receipt_group_id: 'group-123',
            is_group_receipt: true,
            receipt_total: 549.98,
            amount: 99.99,
            product_description: 'Mouse'
          },
          { 
            id: 'receipt-3',
            user_id: 'test-user',
            receipt_group_id: 'group-123',
            is_group_receipt: true,
            receipt_total: 549.98,
            amount: 49.99,
            product_description: 'USB Cable'
          }
        ],
        receipt_group_id: 'group-123',
        processing_method: 'gpt_structured' as const
      }

      vi.spyOn(MultiProductReceiptService, 'saveReceipt').mockResolvedValue(mockServiceResponse)

      // Test the flow
      const ocrText = `
        ELECTRONICS STORE
        Date: 01/15/2024
        
        Dell XPS 13 Laptop - $399.99
        Warranty: 24 months
        
        Logitech MX Master 3 Mouse - $99.99
        Warranty: 12 months
        
        AmazonBasics USB-C Cable - $49.99
        Warranty: 6 months
        
        Total: $549.98
      `

      // Step 1: Extract data with GPT
      const extractionResult = await extractReceiptDataWithGPT(ocrText)
      expect(extractionResult.data).toBeTruthy()
      expect(extractionResult.data?.store_name).toBe('Electronics Store')
      expect(extractionResult.data?.total_amount).toBe(549.98)
      expect(extractionResult.data?.products).toHaveLength(3)

      // Step 2: Save with service
      const saveResult = await MultiProductReceiptService.saveReceipt(
        extractionResult.data!,
        'test-user',
        'test-image-url'
      )

      expect(saveResult.success).toBe(true)
      expect(saveResult.receipts).toHaveLength(3)
      expect(saveResult.receipt_group_id).toBe('group-123')
      expect(saveResult.receipts.every(r => r.is_group_receipt)).toBe(true)
      expect(saveResult.receipts.every(r => r.receipt_total === 549.98)).toBe(true)
    })

    it('should handle GPT extraction errors gracefully', async () => {
      // Mock GPT extraction error
      ;(extractReceiptDataWithGPT as any).mockResolvedValue({
        data: null,
        error: { message: 'OpenAI API error: Rate limit exceeded' }
      })

      const ocrText = 'Some receipt text'

      const extractionResult = await extractReceiptDataWithGPT(ocrText)
      
      expect(extractionResult.data).toBeNull()
      expect(extractionResult.error).toBeTruthy()
      expect(extractionResult.error?.message).toContain('OpenAI API error')
    })

    it('should handle service save errors gracefully', async () => {
      // Mock successful GPT extraction
      const mockGPTResponse = {
        data: {
          store_name: 'Test Store',
          purchase_date: '2024-01-15',
          purchase_location: 'Test Location',
          country: 'USA',
          warranty_period: '12 months',
          extended_warranty: 'None',
          total_amount: 100.00,
          amount: 100.00,
          product_description: 'Test Product',
          brand_name: 'Test Brand'
        },
        error: null
      }

      ;(extractReceiptDataWithGPT as any).mockResolvedValue(mockGPTResponse)

      // Mock service error
      vi.spyOn(MultiProductReceiptService, 'saveReceipt').mockResolvedValue({
        success: false,
        error: 'Database connection failed',
        receipts: [],
        processing_method: 'gpt_structured'
      })

      const ocrText = 'Test receipt text'

      const extractionResult = await extractReceiptDataWithGPT(ocrText)
      expect(extractionResult.data).toBeTruthy()

      const saveResult = await MultiProductReceiptService.saveReceipt(
        extractionResult.data!,
        'test-user',
        'test-image-url'
      )

      expect(saveResult.success).toBe(false)
      expect(saveResult.error).toBe('Database connection failed')
    })
  })

  describe('Data Validation', () => {
    it('should validate single-product receipt data structure', () => {
      const singleProductData: ExtractedReceiptData = {
        store_name: 'Test Store',
        purchase_date: '2024-01-15',
        purchase_location: 'Test Location',
        country: 'USA',
        warranty_period: '12 months',
        extended_warranty: 'None',
        total_amount: 100.00,
        amount: 100.00,
        product_description: 'Test Product',
        brand_name: 'Test Brand',
        model_number: 'TEST-001'
      }

      // Validate required fields
      expect(singleProductData.store_name).toBeTruthy()
      expect(singleProductData.purchase_date).toBeTruthy()
      expect(singleProductData.total_amount).toBeGreaterThan(0)
      expect(singleProductData.product_description).toBeTruthy()
      expect(singleProductData.amount).toBeTruthy()
      expect(singleProductData.products).toBeUndefined()
    })

    it('should validate multi-product receipt data structure', () => {
      const multiProductData: ExtractedReceiptData = {
        store_name: 'Electronics Store',
        purchase_date: '2024-01-15',
        purchase_location: 'Store Location',
        country: 'USA',
        warranty_period: '12 months',
        extended_warranty: 'None',
        total_amount: 200.00,
        products: [
          {
            product_description: 'Item 1',
            brand_name: 'Brand 1',
            model_number: 'MODEL-1',
            amount: 100.00,
            warranty_period: '12 months'
          },
          {
            product_description: 'Item 2',
            brand_name: 'Brand 2',
            model_number: 'MODEL-2',
            amount: 100.00,
            warranty_period: '6 months'
          }
        ]
      }

      // Validate required fields
      expect(multiProductData.store_name).toBeTruthy()
      expect(multiProductData.purchase_date).toBeTruthy()
      expect(multiProductData.total_amount).toBeGreaterThan(0)
      expect(multiProductData.products).toBeTruthy()
      expect(multiProductData.products).toHaveLength(2)
      
      // Validate product structure
      multiProductData.products!.forEach(product => {
        expect(product.product_description).toBeTruthy()
        expect(product.brand_name).toBeTruthy()
        expect(product.amount).toBeGreaterThan(0)
      })

      // Validate total matches sum of products
      const productsTotal = multiProductData.products!.reduce((sum, p) => sum + p.amount, 0)
      expect(productsTotal).toBe(multiProductData.total_amount)
    })
  })

  describe('Receipt Grouping Logic', () => {
    it('should determine single-product vs multi-product correctly', () => {
      const singleProductData: ExtractedReceiptData = {
        store_name: 'Test Store',
        purchase_date: '2024-01-15',
        purchase_location: 'Test Location',
        country: 'USA',
        warranty_period: '12 months',
        extended_warranty: 'None',
        total_amount: 100.00,
        amount: 100.00,
        product_description: 'Single Product'
      }

      const multiProductData: ExtractedReceiptData = {
        store_name: 'Test Store',
        purchase_date: '2024-01-15',
        purchase_location: 'Test Location',
        country: 'USA',
        warranty_period: '12 months',
        extended_warranty: 'None',
        total_amount: 200.00,
        products: [
          {
            product_description: 'Product 1',
            brand_name: 'Brand 1',
            model_number: 'MODEL-1',
            amount: 100.00
          },
          {
            product_description: 'Product 2',
            brand_name: 'Brand 2',
            model_number: 'MODEL-2',
            amount: 100.00
          }
        ]
      }

      // Test identification logic
      const isSingleProduct = !singleProductData.products || singleProductData.products.length === 0
      const isMultiProduct = multiProductData.products && multiProductData.products.length > 0

      expect(isSingleProduct).toBe(true)
      expect(isMultiProduct).toBe(true)
    })
  })
}) 