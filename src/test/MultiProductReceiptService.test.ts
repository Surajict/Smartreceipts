import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MultiProductReceiptService } from '../services/multiProductReceiptService'
import { supabase } from '../lib/supabase'
import { ExtractedReceiptData } from '../types/receipt'

// Mock the supabase client
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn()
    }
  }
}))

describe('MultiProductReceiptService', () => {
  let mockSupabase: any

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Create a comprehensive mock for Supabase client with full method chain
    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
    }
    
    // Mock the supabase client - replace the entire from method
    vi.mocked(supabase.from).mockReturnValue(mockSupabase)
    
    // Default successful responses
    mockSupabase.insert.mockResolvedValue({ data: [], error: null })
    mockSupabase.select.mockResolvedValue({ data: [], error: null })
    mockSupabase.order.mockResolvedValue({ data: [], error: null })
    mockSupabase.or.mockResolvedValue({ data: [], error: null })
  })

  describe('saveReceipt', () => {
    it('should save a single-product receipt correctly', async () => {
      // Mock successful database insertion with select chain
      const mockSelectResponse = vi.fn().mockResolvedValue({
        data: [{ id: 'receipt-123' }],
        error: null
      })
      
      mockSupabase.insert.mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: mockSelectResponse
        })
      })

      const extractedData: ExtractedReceiptData = {
        store_name: 'Test Store',
        purchase_date: '2024-01-01',
        purchase_location: 'Test Location',
        country: 'USA',
        warranty_period: '1 year',
        extended_warranty: 'None',
        total_amount: 25.99,
        // Single product fields
        product_description: 'Test Product',
        brand_name: 'Test Brand',
        model_number: 'Test Model',
        amount: 25.99
      }

      const result = await MultiProductReceiptService.saveReceipt(
        extractedData,
        'test-user-id',
        'test-image-url'
      )

      expect(result.success).toBe(true)
      expect(result.receipts).toHaveLength(1)
      // Fix: The service passes an array, so we expect the first item in the array
      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            user_id: 'test-user-id',
            image_url: 'test-image-url',
            product_description: 'Test Product',
            is_group_receipt: false,
            receipt_group_id: null
          })
        ])
      )
    })

    it('should save a multi-product receipt correctly', async () => {
      // Mock successful database insertion with select chain
      const mockSelectResponse = vi.fn().mockResolvedValue({
        data: [
          { id: 'receipt-1', receipt_group_id: 'group-123' },
          { id: 'receipt-2', receipt_group_id: 'group-123' }
        ],
        error: null
      })
      
      mockSupabase.insert.mockReturnValue({
        select: mockSelectResponse
      })

      const extractedData: ExtractedReceiptData = {
        store_name: 'Test Store',
        purchase_date: '2024-01-01',
        purchase_location: 'Test Location',
        country: 'USA',
        warranty_period: '1 year',
        extended_warranty: 'None',
        total_amount: 50.99,
        products: [
          {
            product_description: 'Product 1',
            brand_name: 'Brand 1',
            model_number: 'Model 1',
            amount: 25.99,
            category: 'Electronics'
          },
          {
            product_description: 'Product 2',
            brand_name: 'Brand 2',
            model_number: 'Model 2',
            amount: 25.00,
            category: 'Books'
          }
        ]
      }

      const result = await MultiProductReceiptService.saveReceipt(
        extractedData,
        'test-user-id',
        'test-image-url'
      )

      expect(result.success).toBe(true)
      expect(result.receipts).toHaveLength(2)
      // Check that a UUID was generated (don't check specific value)
      expect(result.receipt_group_id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
      
      // Verify that insert was called with correct data structure
      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            user_id: 'test-user-id',
            product_description: 'Product 1',
            is_group_receipt: true,
            receipt_group_id: expect.any(String)
          }),
          expect.objectContaining({
            user_id: 'test-user-id',
            product_description: 'Product 2',
            is_group_receipt: true,
            receipt_group_id: expect.any(String)
          })
        ])
      )
    })

    it('should handle database insertion error', async () => {
      // Mock database error with select chain
      const mockSelectResponse = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' }
      })
      
      mockSupabase.insert.mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: mockSelectResponse
        })
      })

      const extractedData: ExtractedReceiptData = {
        store_name: 'Test Store',
        purchase_date: '2024-01-01',
        purchase_location: 'Test Location',
        country: 'USA',
        warranty_period: '1 year',
        extended_warranty: 'None',
        total_amount: 25.99,
        // Single product fields
        product_description: 'Test Product',
        brand_name: 'Test Brand',
        model_number: 'Test Model',
        amount: 25.99
      }

      const result = await MultiProductReceiptService.saveReceipt(
        extractedData,
        'test-user-id',
        'test-image-url'
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe('Database error')
    })
  })

  describe('getGroupedReceipts', () => {
    it('should return grouped receipts correctly', async () => {
      const mockReceipts = [
        {
          id: 'receipt-1',
          product_description: 'Product 1',
          is_group_receipt: true,
          receipt_group_id: 'group-123',
          total_amount: 25.99
        },
        {
          id: 'receipt-2',
          product_description: 'Product 2',
          is_group_receipt: true,
          receipt_group_id: 'group-123',
          total_amount: 30.00
        },
        {
          id: 'receipt-3',
          product_description: 'Single Product',
          is_group_receipt: false,
          receipt_group_id: null,
          total_amount: 15.99
        }
      ]

      // Fix: Set up the complete mock chain
      mockSupabase.select.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: mockReceipts,
            error: null
          })
        })
      })

      const result = await MultiProductReceiptService.getGroupedReceipts('test-user-id')

      expect(result).toHaveLength(2) // One group + one single receipt
      expect(mockSupabase.select).toHaveBeenCalledWith('*')
    })

    it('should handle empty result', async () => {
      // Fix: Set up the complete mock chain
      mockSupabase.select.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: [],
            error: null
          })
        })
      })

      const result = await MultiProductReceiptService.getGroupedReceipts('test-user-id')

      expect(result).toHaveLength(0)
    })

    it('should handle database error', async () => {
      // Fix: Set up the complete mock chain
      mockSupabase.select.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database error' }
          })
        })
      })

      await expect(
        MultiProductReceiptService.getGroupedReceipts('test-user-id')
      ).rejects.toThrow('Database error')
    })
  })

  describe('searchReceipts', () => {
    it('should search receipts and return results', async () => {
      const mockReceipts = [
        {
          id: 'receipt-1',
          product_description: 'Test Product',
          brand_name: 'Test Brand'
        }
      ]

      // Fix: Set up the complete mock chain
      mockSupabase.select.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          or: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: mockReceipts,
              error: null
            })
          })
        })
      })

      const result = await MultiProductReceiptService.searchReceipts('test', 'test-user-id')

      expect(result).toHaveLength(1)
      expect(mockSupabase.select).toHaveBeenCalledWith('*')
    })

    it('should handle empty search results', async () => {
      // Fix: Set up the complete mock chain
      mockSupabase.select.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          or: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: [],
              error: null
            })
          })
        })
      })

      const result = await MultiProductReceiptService.searchReceipts('nonexistent', 'test-user-id')

      expect(result).toHaveLength(0)
    })
  })
}) 