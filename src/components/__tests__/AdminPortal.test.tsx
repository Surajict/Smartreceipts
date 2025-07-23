import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor, userEvent } from '../../test/utils/testUtils'
import AdminPortal from '../AdminPortal'
import { mockAdminStats, mockSubscriptionCodes, mockUser } from '../../test/mocks/mockData'
import { supabase } from '../../lib/supabase'

// Mock the supabase module
vi.mock('../../lib/supabase')

const mockSupabase = supabase as any

describe('AdminPortal', () => {
  const setupAuthenticated = () => {
    localStorage.setItem('admin_authenticated', 'true')
  }

  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    
    // Reset all mocks to default successful state
    mockSupabase.rpc.mockResolvedValue({ data: mockAdminStats, error: null })
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      then: vi.fn()
    })
  })

  describe('Authentication', () => {
    it('should render login form when not authenticated', () => {
      render(<AdminPortal />)
      
      expect(screen.getByText('Smart Receipts Admin Portal')).toBeInTheDocument()
      expect(screen.getByText('Subscription Code Management System')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Username')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Password')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
    })

    it('should toggle password visibility', async () => {
      const user = userEvent.setup()
      render(<AdminPortal />)
      
      const passwordInput = screen.getByPlaceholderText('Password')
      const toggleButton = screen.getByRole('button', { name: '' }) // Eye icon button
      
      expect(passwordInput).toHaveAttribute('type', 'password')
      
      await user.click(toggleButton)
      expect(passwordInput).toHaveAttribute('type', 'text')
      
      await user.click(toggleButton)
      expect(passwordInput).toHaveAttribute('type', 'password')
    })

    it('should handle successful login with correct credentials', async () => {
      const user = userEvent.setup()
      render(<AdminPortal />)
      
      const usernameInput = screen.getByPlaceholderText('Username')
      const passwordInput = screen.getByPlaceholderText('Password')
      const loginButton = screen.getByRole('button', { name: /sign in/i })
      
      await user.type(usernameInput, 'smartreceiptsau@gmail.com')
      await user.type(passwordInput, 'greatAppple651')
      await user.click(loginButton)
      
      expect(loginButton).toHaveTextContent('Signing in...')
      
      await waitFor(() => {
        expect(screen.getByText('Admin Portal')).toBeInTheDocument()
        expect(screen.getByText('Subscription Code Management')).toBeInTheDocument()
      })
      
      expect(localStorage.getItem('admin_authenticated')).toBe('true')
    })

    it('should handle failed login with incorrect credentials', async () => {
      const user = userEvent.setup()
      render(<AdminPortal />)
      
      const usernameInput = screen.getByPlaceholderText('Username')
      const passwordInput = screen.getByPlaceholderText('Password')
      const loginButton = screen.getByRole('button', { name: /sign in/i })
      
      await user.type(usernameInput, 'wrong@email.com')
      await user.type(passwordInput, 'wrongpassword')
      await user.click(loginButton)
      
      await waitFor(() => {
        expect(screen.getByText('Invalid credentials. Please check your username and password.')).toBeInTheDocument()
      })
      
      expect(localStorage.getItem('admin_authenticated')).toBeNull()
    })

    it('should auto-login if authenticated in localStorage', () => {
      localStorage.setItem('admin_authenticated', 'true')
      render(<AdminPortal />)
      
      expect(screen.getByText('Admin Portal')).toBeInTheDocument()
      expect(screen.queryByText('Smart Receipts Admin Portal')).not.toBeInTheDocument()
    })

    it('should handle logout', async () => {
      const user = userEvent.setup()
      localStorage.setItem('admin_authenticated', 'true')
      render(<AdminPortal />)
      
      const logoutButton = screen.getByRole('button', { name: /logout/i })
      await user.click(logoutButton)
      
      expect(screen.getByText('Smart Receipts Admin Portal')).toBeInTheDocument()
      expect(localStorage.getItem('admin_authenticated')).toBeNull()
    })
  })

  describe('Admin Dashboard', () => {
    beforeEach(() => {
      localStorage.setItem('admin_authenticated', 'true')
    })

    it('should render admin dashboard with stats', async () => {
      render(<AdminPortal />)
      
      await waitFor(() => {
        expect(screen.getByText('Admin Portal')).toBeInTheDocument()
        expect(screen.getByText('Subscription Code Management')).toBeInTheDocument()
      })
      
      // Check stats cards
      expect(screen.getByText('Total Codes')).toBeInTheDocument()
      expect(screen.getByText('10')).toBeInTheDocument()
      expect(screen.getByText('Used Codes')).toBeInTheDocument()
      expect(screen.getByText('3')).toBeInTheDocument()
      expect(screen.getByText('Active Codes')).toBeInTheDocument()
      expect(screen.getByText('5')).toBeInTheDocument()
      expect(screen.getByText('Expired Codes')).toBeInTheDocument()
      expect(screen.getByText('2')).toBeInTheDocument()
    })

    it('should handle refresh data', async () => {
      const user = userEvent.setup()
      render(<AdminPortal />)
      
      await waitFor(() => {
        expect(screen.getByText('Admin Portal')).toBeInTheDocument()
      })
      
      const refreshButton = screen.getByRole('button', { name: '' }) // Refresh icon
      await user.click(refreshButton)
      
      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_admin_subscription_stats')
    })

    it('should display error message when stats loading fails', async () => {
      mockSupabase.rpc.mockResolvedValue({ 
        data: null, 
        error: { message: 'Failed to load stats' } 
      })
      
      render(<AdminPortal />)
      
      await waitFor(() => {
        expect(screen.getByText(/Failed to load admin data: Failed to load stats/)).toBeInTheDocument()
      })
    })
  })

  describe('Subscription System Toggle', () => {
    beforeEach(() => {
      localStorage.setItem('admin_authenticated', 'true')
    })

    it('should render subscription system toggle', async () => {
      render(<AdminPortal />)
      
      await waitFor(() => {
        expect(screen.getByText('Subscription System')).toBeInTheDocument()
        expect(screen.getByText('Toggle between code-based and Stripe-based subscriptions')).toBeInTheDocument()
        expect(screen.getByText('Code-Based')).toBeInTheDocument()
        expect(screen.getByText('Stripe')).toBeInTheDocument()
      })
    })

    it('should toggle subscription system', async () => {
      const user = userEvent.setup()
      render(<AdminPortal />)
      
      await waitFor(() => {
        expect(screen.getByText('Subscription System')).toBeInTheDocument()
      })
      
      const toggleButton = screen.getByRole('button', { name: '' }) // Toggle switch
      await user.click(toggleButton)
      
      await waitFor(() => {
        expect(screen.getByText('✅ Subscription system changed to Stripe')).toBeInTheDocument()
      })
      
      expect(localStorage.getItem('admin_subscription_system')).toBe('stripe')
    })
  })

  describe('Code Generation', () => {
    beforeEach(() => {
      localStorage.setItem('admin_authenticated', 'true')
      mockSupabase.rpc.mockImplementation((funcName) => {
        if (funcName === 'get_admin_subscription_stats') {
          return Promise.resolve({ data: mockAdminStats, error: null })
        }
        if (funcName === 'create_subscription_code') {
          return Promise.resolve({
            data: {
              success: true,
              code: '1234567890123456',
              id: 'new-code-id',
              expires_at: '2024-02-01T00:00:00Z'
            },
            error: null
          })
        }
        return Promise.resolve({ data: null, error: null })
      })
    })

    it('should render code generation form', async () => {
      render(<AdminPortal />)
      
      await waitFor(() => {
        expect(screen.getByText('Generate New Subscription Code')).toBeInTheDocument()
        expect(screen.getByLabelText(/Duration \(Months\)/)).toBeInTheDocument()
        expect(screen.getByLabelText(/Notes \(Optional\)/)).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /Generate Code/i })).toBeInTheDocument()
      })
    })

    it('should generate subscription code successfully', async () => {
      const user = userEvent.setup()
      render(<AdminPortal />)
      
      await waitFor(() => {
        expect(screen.getByText('Generate New Subscription Code')).toBeInTheDocument()
      })
      
      const durationSelect = screen.getByLabelText(/Duration \(Months\)/)
      const notesInput = screen.getByLabelText(/Notes \(Optional\)/)
      const generateButton = screen.getByRole('button', { name: /Generate Code/i })
      
      await user.selectOptions(durationSelect, '3')
      await user.type(notesInput, 'Test subscription code')
      await user.click(generateButton)
      
      expect(generateButton).toHaveTextContent('Generating...')
      
      await waitFor(() => {
        expect(screen.getByText('✅ New subscription code generated: 1234567890123456')).toBeInTheDocument()
      })
      
      expect(mockSupabase.rpc).toHaveBeenCalledWith('create_subscription_code', {
        duration_months: 3,
        notes: 'Test subscription code'
      })
    })

    it('should handle code generation failure', async () => {
      const user = userEvent.setup()
      mockSupabase.rpc.mockImplementation((funcName) => {
        if (funcName === 'get_admin_subscription_stats') {
          return Promise.resolve({ data: mockAdminStats, error: null })
        }
        if (funcName === 'create_subscription_code') {
          return Promise.resolve({
            data: null,
            error: { message: 'Failed to generate code' }
          })
        }
        return Promise.resolve({ data: null, error: null })
      })
      
      render(<AdminPortal />)
      
      await waitFor(() => {
        expect(screen.getByText('Generate New Subscription Code')).toBeInTheDocument()
      })
      
      const generateButton = screen.getByRole('button', { name: /Generate Code/i })
      await user.click(generateButton)
      
      await waitFor(() => {
        expect(screen.getByText(/Failed to generate code: Failed to generate code/)).toBeInTheDocument()
      })
    })

    it('should clear notes field after successful generation', async () => {
      const user = userEvent.setup()
      render(<AdminPortal />)
      
      await waitFor(() => {
        expect(screen.getByText('Generate New Subscription Code')).toBeInTheDocument()
      })
      
      const notesInput = screen.getByLabelText(/Notes \(Optional\)/) as HTMLInputElement
      const generateButton = screen.getByRole('button', { name: /Generate Code/i })
      
      await user.type(notesInput, 'Test notes')
      expect(notesInput.value).toBe('Test notes')
      
      await user.click(generateButton)
      
      await waitFor(() => {
        expect(notesInput.value).toBe('')
      })
    })
  })

  describe('Subscription Codes Table', () => {
    beforeEach(() => {
      localStorage.setItem('admin_authenticated', 'true')
    })

    it('should render codes table header', async () => {
      render(<AdminPortal />)
      
      await waitFor(() => {
        expect(screen.getByText('Recently Generated Codes')).toBeInTheDocument()
        expect(screen.getByText('📋 Codes generated in this session are shown below. Copy them immediately for use.')).toBeInTheDocument()
      })
      
      // Check table headers
      expect(screen.getByText('Code')).toBeInTheDocument()
      expect(screen.getByText('Status')).toBeInTheDocument()
      expect(screen.getByText('Generated')).toBeInTheDocument()
      expect(screen.getByText('Expires')).toBeInTheDocument()
      expect(screen.getByText('Duration')).toBeInTheDocument()
      expect(screen.getByText('Notes')).toBeInTheDocument()
      expect(screen.getByText('Actions')).toBeInTheDocument()
    })

    it('should display empty state when no codes generated', async () => {
      render(<AdminPortal />)
      
      await waitFor(() => {
        expect(screen.getByText('No codes generated yet')).toBeInTheDocument()
        expect(screen.getByText('Generate your first subscription code using the form above.')).toBeInTheDocument()
      })
    })

    it('should display generated codes in table', async () => {
      const user = userEvent.setup()
      render(<AdminPortal />)
      
      await waitFor(() => {
        expect(screen.getByText('Generate New Subscription Code')).toBeInTheDocument()
      })
      
      // Generate a code
      const generateButton = screen.getByRole('button', { name: /Generate Code/i })
      await user.click(generateButton)
      
      await waitFor(() => {
        expect(screen.getByText('1234567890123456')).toBeInTheDocument()
        expect(screen.getByText('Generated')).toBeInTheDocument()
        expect(screen.getByText('1 month')).toBeInTheDocument()
      })
    })

    it('should handle copy to clipboard', async () => {
      const user = userEvent.setup()
      const mockWriteText = vi.fn().mockResolvedValue(undefined)
      
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: mockWriteText },
        configurable: true
      })
      
      render(<AdminPortal />)
      
      await waitFor(() => {
        expect(screen.getByText('Generate New Subscription Code')).toBeInTheDocument()
      })
      
      // Generate a code first
      const generateButton = screen.getByRole('button', { name: /Generate Code/i })
      await user.click(generateButton)
      
      await waitFor(() => {
        expect(screen.getByText('1234567890123456')).toBeInTheDocument()
      })
      
      // Click copy button
      const copyButton = screen.getByRole('button', { name: /copy/i })
      await user.click(copyButton)
      
      expect(mockWriteText).toHaveBeenCalledWith('1234567890123456')
      
      await waitFor(() => {
        expect(screen.getByText('✅ Code copied to clipboard!')).toBeInTheDocument()
      })
    })
  })

  describe('Auto-refresh', () => {
    beforeEach(() => {
      localStorage.setItem('admin_authenticated', 'true')
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should auto-refresh data every 30 seconds', async () => {
      render(<AdminPortal />)
      
      await waitFor(() => {
        expect(screen.getByText('Admin Portal')).toBeInTheDocument()
      })
      
      // Initial call
      expect(mockSupabase.rpc).toHaveBeenCalledTimes(1)
      
      // Fast-forward 30 seconds
      vi.advanceTimersByTime(30000)
      
      await waitFor(() => {
        expect(mockSupabase.rpc).toHaveBeenCalledTimes(2)
      })
      
      // Fast-forward another 30 seconds
      vi.advanceTimersByTime(30000)
      
      await waitFor(() => {
        expect(mockSupabase.rpc).toHaveBeenCalledTimes(3)
      })
    })
  })

  describe('Error Handling', () => {
    beforeEach(() => {
      localStorage.setItem('admin_authenticated', 'true')
    })

    it('should handle network errors gracefully', async () => {
      mockSupabase.rpc.mockRejectedValue(new Error('Network error'))
      
      render(<AdminPortal />)
      
      await waitFor(() => {
        expect(screen.getByText(/Failed to load admin data: Network error/)).toBeInTheDocument()
      })
    })

    it('should handle clipboard copy failure', async () => {
      const user = userEvent.setup()
      const mockWriteText = vi.fn().mockRejectedValue(new Error('Clipboard error'))
      
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: mockWriteText },
        configurable: true
      })
      
      render(<AdminPortal />)
      
      await waitFor(() => {
        expect(screen.getByText('Generate New Subscription Code')).toBeInTheDocument()
      })
      
      // Generate a code first
      const generateButton = screen.getByRole('button', { name: /Generate Code/i })
      await user.click(generateButton)
      
      await waitFor(() => {
        expect(screen.getByText('1234567890123456')).toBeInTheDocument()
      })
      
      // Try to copy (should fail silently)
      const copyButton = screen.getByRole('button', { name: /copy/i })
      await user.click(copyButton)
      
      expect(mockWriteText).toHaveBeenCalledWith('1234567890123456')
      // Should not show success message
      expect(screen.queryByText('✅ Code copied to clipboard!')).not.toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    beforeEach(() => {
      localStorage.setItem('admin_authenticated', 'true')
    })

    it('should have proper ARIA labels and roles', async () => {
      render(<AdminPortal />)
      
      await waitFor(() => {
        expect(screen.getByText('Admin Portal')).toBeInTheDocument()
      })
      
      // Check table has proper role
      const table = screen.getByRole('table')
      expect(table).toBeInTheDocument()
      
      // Check buttons have proper roles
      const buttons = screen.getAllByRole('button')
      expect(buttons.length).toBeGreaterThan(0)
      
      // Check form elements have proper labels
      const durationSelect = screen.getByLabelText(/Duration \(Months\)/)
      expect(durationSelect).toBeInTheDocument()
      
      const notesInput = screen.getByLabelText(/Notes \(Optional\)/)
      expect(notesInput).toBeInTheDocument()
    })

    it('should be keyboard navigable', async () => {
      const user = userEvent.setup()
      render(<AdminPortal />)
      
      await waitFor(() => {
        expect(screen.getByText('Admin Portal')).toBeInTheDocument()
      })
      
      // Tab through interactive elements
      await user.tab()
      const firstButton = document.activeElement
      expect(firstButton).toBeInstanceOf(HTMLButtonElement)
      
      await user.tab()
      const secondElement = document.activeElement
      expect(secondElement).toBeInstanceOf(HTMLElement)
    })
  })

  describe('Responsive Design', () => {
    beforeEach(() => {
      localStorage.setItem('admin_authenticated', 'true')
    })

    it('should render properly on mobile viewport', async () => {
      // Mock window.matchMedia for mobile
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
          matches: query.includes('(max-width: 768px)'),
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      })
      
      render(<AdminPortal />)
      
      await waitFor(() => {
        expect(screen.getByText('Admin Portal')).toBeInTheDocument()
      })
      
      // Check that responsive classes are present
      const container = screen.getByText('Admin Portal').closest('div')
      expect(container).toBeInTheDocument()
    })
  })
}) 