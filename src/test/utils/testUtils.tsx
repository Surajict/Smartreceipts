import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { vi, expect } from 'vitest'

// Custom render function with providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <div data-testid="test-wrapper">
      {children}
    </div>
  )
}

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options })

export * from '@testing-library/react'
export { customRender as render }

// Test utilities
export const waitForTimeout = (ms: number) => 
  new Promise(resolve => setTimeout(resolve, ms))

export const createMockEvent = (type: string, properties = {}) => ({
  type,
  preventDefault: vi.fn(),
  stopPropagation: vi.fn(),
  target: {
    value: '',
    files: [],
    ...properties
  },
  ...properties
})

export const createMockFile = (name: string, type: string, content = 'mock content') => 
  new File([content], name, { type, lastModified: Date.now() })

export const createMockImage = (width = 100, height = 100) => {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, width, height)
  }
  return canvas.toDataURL()
}

// Mock localStorage helper
export const mockLocalStorage = () => {
  const store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      Object.keys(store).forEach(key => delete store[key])
    })
  }
}

// Mock Supabase helpers
export const createMockSupabaseResponse = <T,>(data: T, error?: any) => ({
  data,
  error,
  status: error ? 400 : 200,
  statusText: error ? 'Bad Request' : 'OK'
})

export const createMockSupabaseQuery = () => {
  const query = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    like: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    single: vi.fn(),
    maybeSingle: vi.fn(),
    then: vi.fn()
  }
  return query
}

// API mock helpers
export const mockFetch = (response: any, ok = true) => {
  global.fetch = vi.fn().mockResolvedValue({
    ok,
    status: ok ? 200 : 400,
    statusText: ok ? 'OK' : 'Bad Request',
    json: vi.fn().mockResolvedValue(response),
    text: vi.fn().mockResolvedValue(JSON.stringify(response))
  })
}

export const mockOpenAIResponse = (content: any) => {
  return {
    choices: [
      {
        message: {
          content: typeof content === 'string' ? content : JSON.stringify(content)
        }
      }
    ]
  }
}

export const mockPerplexityResponse = (content: any) => {
  return {
    choices: [
      {
        message: {
          content: typeof content === 'string' ? content : JSON.stringify(content)
        }
      }
    ]
  }
}

// Camera mock helpers
export const mockGetUserMedia = (stream: any = null) => {
  const mockMediaDevices = {
    getUserMedia: vi.fn().mockResolvedValue(
      stream || {
        getTracks: () => [
          {
            stop: vi.fn(),
            getSettings: () => ({ width: 1920, height: 1080 })
          }
        ],
        active: true
      }
    )
  }

  Object.defineProperty(navigator, 'mediaDevices', {
    value: mockMediaDevices,
    configurable: true
  })

  return mockMediaDevices
}

// Clipboard mock helpers
export const mockClipboard = () => {
  const clipboard = {
    writeText: vi.fn().mockResolvedValue(undefined),
    readText: vi.fn().mockResolvedValue(''),
    write: vi.fn().mockResolvedValue(undefined),
    read: vi.fn().mockResolvedValue([])
  }

  Object.defineProperty(navigator, 'clipboard', {
    value: clipboard,
    configurable: true
  })

  return clipboard
}

// Form testing helpers
export const fillForm = async (getByLabelText: any, formData: Record<string, string>) => {
  for (const [label, value] of Object.entries(formData)) {
    const field = getByLabelText(new RegExp(label, 'i'))
    if (field) {
      await userEvent.clear(field)
      await userEvent.type(field, value)
    }
  }
}

// Date helpers for testing
export const mockDate = (date: string | Date) => {
  const mockDate = new Date(date)
  vi.spyOn(global, 'Date').mockImplementation(() => mockDate as any)
  return mockDate
}

export const restoreDate = () => {
  vi.restoreAllMocks()
}

// Error boundary testing
export const TestErrorBoundary = ({ children }: { children: React.ReactNode }) => {
  const [hasError, setHasError] = React.useState(false)

  React.useEffect(() => {
    const handleError = () => setHasError(true)
    window.addEventListener('error', handleError)
    return () => window.removeEventListener('error', handleError)
  }, [])

  if (hasError) {
    return <div data-testid="error-boundary">Something went wrong</div>
  }

  return <>{children}</>
}

// Async testing helpers
export const waitForCondition = async (
  condition: () => boolean,
  timeout = 5000,
  interval = 100
) => {
  const start = Date.now()
  while (!condition() && Date.now() - start < timeout) {
    await waitForTimeout(interval)
  }
  if (!condition()) {
    throw new Error(`Condition not met within ${timeout}ms`)
  }
}

// Mock ResizeObserver for component testing
export const mockResizeObserver = () => {
  const mockResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn()
  }))

  global.ResizeObserver = mockResizeObserver
  return mockResizeObserver
}

// Mock IntersectionObserver for component testing
export const mockIntersectionObserver = () => {
  const mockIntersectionObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn()
  }))

  global.IntersectionObserver = mockIntersectionObserver
  return mockIntersectionObserver
}

// Test data generators
export const generateMockReceipt = (overrides = {}) => ({
  id: `receipt-${Math.random().toString(36).substr(2, 9)}`,
  user_id: 'test-user-123',
  purchase_date: new Date().toISOString().split('T')[0],
  country: 'Australia',
  product_description: 'Test Product',
  brand_name: 'Test Brand',
  model_number: 'TEST123',
  warranty_months: 12,
  amount: 99.99,
  store_name: 'Test Store',
  created_at: new Date().toISOString(),
  ...overrides
})

export const generateMockUser = (overrides = {}) => ({
  id: `user-${Math.random().toString(36).substr(2, 9)}`,
  email: 'test@example.com',
  full_name: 'Test User',
  created_at: new Date().toISOString(),
  ...overrides
})

// Component testing assertions
export const expectElementToBeVisible = (element: HTMLElement) => {
  expect(element).toBeInTheDocument()
  expect(element).toBeVisible()
}

export const expectElementToHaveClass = (element: HTMLElement, className: string) => {
  expect(element).toHaveClass(className)
}

export const expectFormToBeValid = (form: HTMLFormElement) => {
  expect(form.checkValidity()).toBe(true)
}

export const expectFormToBeInvalid = (form: HTMLFormElement) => {
  expect(form.checkValidity()).toBe(false)
}

// Import userEvent for convenience
import userEvent from '@testing-library/user-event'
export { userEvent } 