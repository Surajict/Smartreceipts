import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor, userEvent } from '../../test/utils/testUtils'
import Login from '../Login'
import { mockUser } from '../../test/mocks/mockData'

// Mock the supabase module completely
vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signInWithOAuth: vi.fn()
    }
  },
  signIn: vi.fn(),
  testSupabaseConnection: vi.fn(),
  initializeUserSettings: vi.fn(),
  signInWithGoogle: vi.fn()
}))

// Import mocked functions
const mockSignIn = vi.fn()
const mockTestSupabaseConnection = vi.fn()
const mockSignInWithGoogle = vi.fn()

// Mock navigation
const mockNavigate = vi.fn()
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  Link: ({ children, to }: { children: React.ReactNode, to: string }) => 
    <a href={to}>{children}</a>
}))

describe('Login Component', () => {
  const mockProps = {
    onBackToHome: vi.fn(),
    onShowSignUp: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockNavigate.mockClear()
    mockProps.onBackToHome.mockClear()
    mockProps.onShowSignUp.mockClear()
    
    // Setup default mocks
    mockTestSupabaseConnection.mockResolvedValue(true)
    mockSignIn.mockResolvedValue({
      user: mockUser,
      error: null
    })
    mockSignInWithGoogle.mockResolvedValue({
      user: mockUser,
      error: null
    })
  })

  describe('Rendering', () => {
    it('should render login form with all elements', async () => {
      render(<Login {...mockProps} />)
      
      // Wait for connection check
      await waitFor(() => {
        expect(screen.getByText('Sign In to Your Account')).toBeInTheDocument()
      })
      
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /^sign in$/i })).toBeInTheDocument()
    })

    it('should render Google sign-in button', async () => {
      render(<Login {...mockProps} />)
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /sign in with google/i })).toBeInTheDocument()
      })
    })

    it('should have password visibility toggle', async () => {
      render(<Login {...mockProps} />)
      
      await waitFor(() => {
        const passwordInput = screen.getByLabelText(/password/i)
        expect(passwordInput).toHaveAttribute('type', 'password')
      })
    })
  })

  describe('Form Validation', () => {
    it('should validate email format', async () => {
      const user = userEvent.setup()
      render(<Login {...mockProps} />)
      
      await waitFor(() => {
        expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
      })

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const signInButton = screen.getByRole('button', { name: /^sign in$/i })
      
      await user.type(emailInput, 'invalid-email')
      await user.type(passwordInput, 'password123')
      await user.click(signInButton)
      
      await waitFor(() => {
        expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument()
      })
    })

    it('should require password', async () => {
      const user = userEvent.setup()
      render(<Login {...mockProps} />)
      
      await waitFor(() => {
        expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
      })

      const emailInput = screen.getByLabelText(/email/i)
      const signInButton = screen.getByRole('button', { name: /^sign in$/i })
      
      await user.type(emailInput, 'test@example.com')
      await user.click(signInButton)
      
      await waitFor(() => {
        expect(screen.getByText(/password is required/i)).toBeInTheDocument()
      })
    })
  })

  describe('Authentication', () => {
    it('should handle successful login', async () => {
      const user = userEvent.setup()
      render(<Login {...mockProps} />)
      
      await waitFor(() => {
        expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
      })

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const signInButton = screen.getByRole('button', { name: /^sign in$/i })
      
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(signInButton)
      
      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password123')
      })
    })

    it('should handle Google sign-in', async () => {
      const user = userEvent.setup()
      render(<Login {...mockProps} />)
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /sign in with google/i })).toBeInTheDocument()
      })

      const googleButton = screen.getByRole('button', { name: /sign in with google/i })
      await user.click(googleButton)
      
      expect(mockSignInWithGoogle).toHaveBeenCalled()
    })
  })

  describe('Connection Status', () => {
    it('should show connection status', async () => {
      render(<Login {...mockProps} />)
      
      // Should show connecting message initially
      expect(screen.getByText(/connecting to database/i)).toBeInTheDocument()
    })

    it('should handle connection failure', async () => {
      mockTestSupabaseConnection.mockResolvedValue(false)
      
      render(<Login {...mockProps} />)
      
      await waitFor(() => {
        expect(screen.getByText(/unable to connect to the database/i)).toBeInTheDocument()
      })
    })
  })

  describe('Component Props', () => {
    it('should call onBackToHome when back button is clicked', async () => {
      const user = userEvent.setup()
      render(<Login {...mockProps} />)
      
      await waitFor(() => {
        expect(screen.getByText(/back to home/i)).toBeInTheDocument()
      })

      const backButton = screen.getByText(/back to home/i)
      await user.click(backButton)
      
      expect(mockProps.onBackToHome).toHaveBeenCalled()
    })

    it('should call onShowSignUp when sign up button is clicked', async () => {
      const user = userEvent.setup()
      render(<Login {...mockProps} />)
      
      await waitFor(() => {
        expect(screen.getByText(/sign up/i)).toBeInTheDocument()
      })

      const signUpButton = screen.getByText(/sign up/i)
      await user.click(signUpButton)
      
      expect(mockProps.onShowSignUp).toHaveBeenCalled()
    })
  })
}) 