import { vi } from 'vitest'

// Mock user data
export const mockUser = {
  id: 'test-user-123',
  email: 'test@example.com',
  full_name: 'Test User',
  avatar_url: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z'
}

// Mock subscription codes
export const mockSubscriptionCodes = [
  {
    id: 'code-1',
    code: '1234567890123456',
    status: 'generated' as const,
    generated_at: '2024-01-01T00:00:00Z',
    expires_at: '2024-02-01T00:00:00Z',
    used_at: null,
    used_by_user_id: null,
    duration_months: 1,
    created_by_admin: true,
    notes: 'Test code 1'
  },
  {
    id: 'code-2',
    code: '2345678901234567',
    status: 'used' as const,
    generated_at: '2024-01-01T00:00:00Z',
    expires_at: '2024-02-01T00:00:00Z',
    used_at: '2024-01-15T00:00:00Z',
    used_by_user_id: 'user-123',
    duration_months: 3,
    created_by_admin: true,
    notes: 'Test code 2 - used'
  },
  {
    id: 'code-3',
    code: '3456789012345678',
    status: 'expired' as const,
    generated_at: '2023-12-01T00:00:00Z',
    expires_at: '2024-01-01T00:00:00Z',
    used_at: null,
    used_by_user_id: null,
    duration_months: 1,
    created_by_admin: true,
    notes: 'Test code 3 - expired'
  }
]

// Mock admin stats
export const mockAdminStats = {
  total_codes: 10,
  used_codes: 3,
  expired_codes: 2,
  active_codes: 5
}

// Mock receipt data
export const mockReceipt = {
  id: 'receipt-1',
  user_id: 'test-user-123',
  purchase_date: '2024-01-15',
  country: 'Australia',
  product_description: 'iPhone 15 Pro',
  brand_name: 'Apple',
  model_number: 'A3101',
  warranty_period: '12 months',
  extended_warranty: null,
  amount: 1499.00,
  image_path: null,
  image_url: 'https://example.com/receipt.jpg',
  created_at: '2024-01-15T10:00:00Z',
  updated_at: '2024-01-15T10:00:00Z',
  store_name: 'Apple Store',
  purchase_location: 'Sydney CBD',
  processing_method: 'ai_multi_item_gpt_structured',
  ocr_confidence: 0.95,
  extracted_text: 'Apple Store\niPhone 15 Pro\n$1499.00',
  embedding: null,
  receipt_group_id: null,
  is_group_receipt: false,
  receipt_total: 1499.00,
  selected_item_index: 0,
  total_items_found: 1,
  original_currency: 'AUD',
  converted_amount: null,
  converted_currency: null,
  exchange_rate: null,
  conversion_date: null,
  warranty_months: 12,
  ext_warranty_months: null
}

// Mock multi-product receipt
export const mockMultiProductReceipt = [
  {
    ...mockReceipt,
    id: 'receipt-multi-1',
    product_description: 'MacBook Pro 14"',
    amount: 2999.00,
    warranty_months: 12,
    receipt_group_id: 'group-1',
    is_group_receipt: true,
    receipt_total: 3500.00
  },
  {
    ...mockReceipt,
    id: 'receipt-multi-2',
    product_description: 'Magic Mouse',
    amount: 129.00,
    warranty_months: 12,
    receipt_group_id: 'group-1',
    is_group_receipt: true,
    receipt_total: 3500.00
  },
  {
    ...mockReceipt,
    id: 'receipt-multi-3',
    product_description: 'USB-C Cable',
    amount: 29.00,
    warranty_months: 6,
    receipt_group_id: 'group-1',
    is_group_receipt: true,
    receipt_total: 3500.00
  }
]

// Mock OCR result
export const mockOCRResult = {
  text: 'Apple Store\nSydney CBD\n15/01/2024\n\niPhone 15 Pro - $1499.00\nMagic Mouse - $129.00\nUSB-C Cable - $29.00\n\nTotal: $1657.00\nGST: $150.64\nThank you for your purchase!',
  confidence: 0.95
}

// Mock AI extraction result
export const mockAIExtractionResult = {
  success: true,
  data: {
    store_name: 'Apple Store',
    purchase_date: '2024-01-15',
    purchase_location: 'Sydney CBD',
    country: 'Australia',
    products: [
      {
        product_description: 'iPhone 15 Pro',
        brand_name: 'Apple',
        model_number: 'A3101',
        amount: 1499.00,
        warranty_months: 12,
        currency: 'AUD'
      },
      {
        product_description: 'Magic Mouse',
        brand_name: 'Apple',
        model_number: 'A1657',
        amount: 129.00,
        warranty_months: 12,
        currency: 'AUD'
      }
    ],
    total_amount: 1628.00,
    currency: 'AUD',
    processing_method: 'ai_multi_item_gpt_structured'
  }
}

// Mock Perplexity validation result
export const mockPerplexityValidation = {
  corrections: {
    brand_name: {
      original: 'APPLE INC',
      corrected: 'Apple',
      confidence: 0.98
    },
    product_description: {
      original: 'IPHONE 15 PRO MAX',
      corrected: 'iPhone 15 Pro Max',
      confidence: 0.99
    }
  },
  validated: true
}

// Mock file objects
export const mockImageFile = new File(['mock image data'], 'receipt.jpg', {
  type: 'image/jpeg',
  lastModified: Date.now()
})

export const mockPDFFile = new File(['mock pdf data'], 'receipt.pdf', {
  type: 'application/pdf',
  lastModified: Date.now()
})

// Mock camera stream
export const mockMediaStream = {
  getTracks: vi.fn(() => [
    {
      stop: vi.fn(),
      getSettings: vi.fn(() => ({ width: 1920, height: 1080 }))
    }
  ]),
  active: true
}

// Mock notification settings
export const mockNotificationSettings = {
  user_id: 'test-user-123',
  warranty_alerts: true,
  auto_system_update: true,
  marketing_notifications: false,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z'
}

// Mock privacy settings
export const mockPrivacySettings = {
  user_id: 'test-user-123',
  data_collection: true,
  data_analysis: 'allowed' as const,
  biometric_login: false,
  two_factor_auth: false,
  preferred_currency: 'AUD',
  display_currency_mode: 'native' as const,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z'
}

// Mock subscription info
export const mockSubscriptionInfo = {
  id: 'sub-1',
  user_id: 'test-user-123',
  plan: 'premium' as const,
  status: 'active' as const,
  stripe_customer_id: null,
  stripe_subscription_id: null,
  stripe_price_id: null,
  current_period_start: '2024-01-01T00:00:00Z',
  current_period_end: '2024-02-01T00:00:00Z',
  cancel_at_period_end: false,
  canceled_at: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  subscription_type: 'code_based' as const
}

// Mock search results
export const mockSearchResults = {
  receipts: [mockReceipt],
  totalCount: 1,
  searchTerm: 'iPhone',
  filters: {
    dateRange: null,
    priceRange: null,
    brand: null,
    category: null
  }
}

// Mock RAG response
export const mockRAGResponse = {
  answer: 'You have spent $1499.00 on Apple products in the last 30 days.',
  relevantReceipts: [mockReceipt],
  confidence: 0.92,
  sources: ['receipt-1']
}

// Mock error responses
export const mockErrorResponse = {
  message: 'Test error message',
  code: 'TEST_ERROR',
  details: 'This is a test error for unit testing'
}

// Mock API responses
export const mockApiResponses = {
  openai: {
    choices: [
      {
        message: {
          content: JSON.stringify(mockAIExtractionResult.data)
        }
      }
    ]
  },
  perplexity: {
    choices: [
      {
        message: {
          content: JSON.stringify(mockPerplexityValidation)
        }
      }
    ]
  }
}

// Mock functions
export const mockFunctions = {
  localStorage: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn()
  },
  supabase: {
    auth: {
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      getSession: vi.fn(),
      onAuthStateChange: vi.fn()
    },
    from: vi.fn(),
    rpc: vi.fn(),
    storage: {
      from: vi.fn()
    }
  },
  fetch: vi.fn(),
  navigator: {
    clipboard: {
      writeText: vi.fn(),
      readText: vi.fn()
    },
    mediaDevices: {
      getUserMedia: vi.fn()
    }
  }
} 