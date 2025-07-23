import { beforeAll, afterEach, afterAll, vi, beforeEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

// Mock Supabase client before tests run
const mockSupabaseClient = {
  auth: {
    signUp: vi.fn(),
    signInWithPassword: vi.fn(),
    signInWithOAuth: vi.fn(),
    signOut: vi.fn(),
    getUser: vi.fn(),
    getSession: vi.fn(),
    onAuthStateChange: vi.fn(() => ({
      data: { subscription: { unsubscribe: vi.fn() } }
    }))
  },
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({ data: null, error: null })),
        order: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve({ data: [], error: null }))
        }))
      })),
      insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
      update: vi.fn(() => Promise.resolve({ data: null, error: null })),
      delete: vi.fn(() => Promise.resolve({ data: null, error: null }))
    }))
  })),
  rpc: vi.fn(() => Promise.resolve({ data: null, error: null })),
  storage: {
    from: vi.fn(() => ({
      upload: vi.fn(() => Promise.resolve({ data: null, error: null })),
      getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'mock-url' } }))
    }))
  }
}

vi.mock('../lib/supabase', () => ({
  supabase: mockSupabaseClient,
  signIn: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
  getCurrentUser: vi.fn(),
  testSupabaseConnection: vi.fn(() => Promise.resolve(true)),
  initializeUserSettings: vi.fn(),
  signInWithGoogle: vi.fn()
}))

// Mock OCR services
vi.mock('tesseract.js', () => ({
  recognize: vi.fn(() => Promise.resolve({
    data: {
      text: 'Mock receipt text\nApple Store\n2023-01-15\niPhone 15 - $999.00\nTotal: $999.00',
      confidence: 85,
      blocks: [],
      lines: [],
      oem: 1,
      osd: 1,
      paragraphs: [],
      psm: 3,
      symbols: [],
      words: [],
      bbox: { x0: 0, y0: 0, x1: 100, y1: 100 },
      hocr: '',
      tsv: '',
      unlv: '',
      version: '4.0.0'
    }
  }))
}))

// Better clipboard mocking approach
let originalClipboard: any

beforeAll(() => {
  // Store original clipboard if it exists
  originalClipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard')
  
  // Define clipboard mock that can be safely redefined
  const mockClipboard = {
    writeText: vi.fn(() => Promise.resolve()),
    readText: vi.fn(() => Promise.resolve('mock clipboard text')),
    write: vi.fn(() => Promise.resolve()),
    read: vi.fn(() => Promise.resolve([]))
  }

  // Use defineProperty with configurable: true so it can be redefined
  Object.defineProperty(navigator, 'clipboard', {
    value: mockClipboard,
    writable: true,
    configurable: true
  })
})

beforeEach(() => {
  // Reset clipboard mock before each test
  if (navigator.clipboard) {
    // Reset the functions manually since they're regular vi.fn() mocks
    ;(navigator.clipboard.writeText as any).mockClear?.()
    ;(navigator.clipboard.readText as any).mockClear?.()
  }
})

afterAll(() => {
  // Restore original clipboard if it existed
  if (originalClipboard) {
    Object.defineProperty(navigator, 'clipboard', originalClipboard)
  } else {
    delete (navigator as any).clipboard
  }
})

// Mock other Web APIs
beforeAll(() => {
  // MediaDevices mock
  Object.defineProperty(navigator, 'mediaDevices', {
    value: {
      getUserMedia: vi.fn(() => Promise.resolve({
        getTracks: () => [{ stop: vi.fn() }]
      })),
      enumerateDevices: vi.fn(() => Promise.resolve([]))
    },
    configurable: true
  })

  // localStorage mock
  const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    length: 0,
    key: vi.fn()
  }
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    configurable: true
  })

  // sessionStorage mock
  Object.defineProperty(window, 'sessionStorage', {
    value: localStorageMock,
    configurable: true
  })

  // Fetch mock
  global.fetch = vi.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve({}),
      text: () => Promise.resolve(''),
      blob: () => Promise.resolve(new Blob())
    } as Response)
  )

  // FileReader mock
  global.FileReader = class {
    result: string | ArrayBuffer | null = null
    readAsDataURL = vi.fn()
    readAsText = vi.fn()
    onload: ((event: any) => void) | null = null
    onerror: ((event: any) => void) | null = null
  } as any

  // ResizeObserver mock
  global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn()
  }))

  // IntersectionObserver mock
  global.IntersectionObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn()
  }))

  // matchMedia mock
  Object.defineProperty(window, 'matchMedia', {
    value: vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    })),
    configurable: true
  })

  // URL.createObjectURL mock
  global.URL.createObjectURL = vi.fn(() => 'mock-object-url')
  global.URL.revokeObjectURL = vi.fn()
})

// Cleanup after each test
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
}) 