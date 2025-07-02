import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Mail, Lock, ArrowRight, ArrowLeft, AlertCircle, Loader2 } from 'lucide-react';
import { signIn, testSupabaseConnection, initializeUserSettings } from '../lib/supabase';

interface LoginProps {
  onBackToHome: () => void;
  onShowSignUp: () => void;
}

const Login: React.FC<LoginProps> = ({ onBackToHome, onShowSignUp }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState<{email?: string; password?: string; general?: string}>({});
  const [isLoading, setIsLoading] = useState(false);
  const [supabaseConnected, setSupabaseConnected] = useState<boolean | null>(null);

  useEffect(() => {
    // Test Supabase connection on component mount
    const checkConnection = async () => {
      console.log('Checking Supabase connection...');
      const connected = await testSupabaseConnection();
      setSupabaseConnected(connected);
      if (!connected) {
        setErrors({ general: 'Unable to connect to the database. Please check your internet connection and try again.' });
      } else {
        console.log('Supabase connection verified');
      }
    };
    checkConnection();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check Supabase connection first
    if (supabaseConnected === false) {
      setErrors({ general: 'Database connection failed. Please refresh the page and try again.' });
      return;
    }
    
    // Basic validation
    const newErrors: {email?: string; password?: string} = {};
    
    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    setErrors(newErrors);
    
    if (Object.keys(newErrors).length === 0) {
      setIsLoading(true);
      
      try {
        console.log('Attempting to sign in user:', email);
        
        const { data, error } = await signIn(email, password);
        
        if (error) {
          console.error('SignIn error details:', error);
          
          const errorMessage = error.message || '';
          
          if (errorMessage.includes('Invalid login credentials') || 
              errorMessage.includes('invalid_credentials') ||
              errorMessage.includes('Invalid email or password')) {
            setErrors({ general: 'Invalid email or password. Please try again.' });
          } else if (errorMessage.includes('Email not confirmed') || 
                     errorMessage.includes('email_not_confirmed')) {
            setErrors({ general: 'Please check your email and confirm your account before signing in.' });
          } else if (errorMessage.includes('Too many requests')) {
            setErrors({ general: 'Too many login attempts. Please wait a few minutes before trying again.' });
          } else {
            setErrors({ general: errorMessage || 'Sign in failed. Please try again.' });
          }
        } else if (data.user) {
          console.log('User signed in successfully:', data.user.email);
          
          // Initialize user settings if they don't exist (for existing users)
          try {
            await initializeUserSettings(data.user.id);
          } catch (settingsError) {
            console.warn('Failed to initialize user settings:', settingsError);
            // Don't fail the login if settings initialization fails
          }
          
          // Successfully signed in - the auth state change will handle navigation
        }
      } catch (err: any) {
        console.error('Unexpected signin error:', err);
        setErrors({ general: 'An unexpected error occurred. Please try again.' });
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 sm:px-6 lg:px-8">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%2300C48C' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}></div>
      </div>

      {/* Top Navigation */}
      <div className="fixed top-4 left-4 right-4 z-50 flex justify-between items-center">
        <button
          onClick={onBackToHome}
          className="flex items-center space-x-2 bg-white text-text-primary px-4 py-2 rounded-lg shadow-card hover:shadow-card-hover transition-all duration-200 font-medium border border-gray-200 hover:border-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Home</span>
        </button>
        
        <div className="flex items-center space-x-3">
          <span className="text-text-secondary text-sm hidden sm:inline">Don't have an account?</span>
          <button
            onClick={onShowSignUp}
            className="bg-primary text-white px-4 py-2 rounded-lg shadow-card hover:shadow-card-hover transition-all duration-200 font-medium hover:bg-primary/90"
          >
            Sign Up
          </button>
        </div>
      </div>

      <div className="max-w-md w-full space-y-8 relative z-10">
        {/* Logo and Header */}
        <div className="text-center">
          <button 
            onClick={onBackToHome}
            className="flex items-center justify-center space-x-3 mb-6 mx-auto hover:opacity-80 transition-opacity duration-200"
          >
            <img 
              src="/Smart Receipt Logo.png" 
              alt="Smart Receipts Logo" 
              className="h-12 w-12 object-contain"
            />
            <span className="text-3xl font-bold bg-gradient-to-r from-teal-500 to-blue-600 bg-clip-text text-transparent">
              Smart Receipts
            </span>
          </button>
          <p className="text-text-secondary text-sm">
            Never Lose a Receipt or Miss a Warranty Claim
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-card p-8 border border-gray-100">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-text-primary mb-2">
              Sign In to Your Account
            </h2>
            <p className="text-text-secondary">
              Welcome back! Please enter your details.
            </p>
          </div>

          {/* Connection Status */}
          {supabaseConnected === null && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center">
                <Loader2 className="h-5 w-5 text-blue-600 mr-2 animate-spin" />
                <p className="text-sm text-blue-700">Connecting to database...</p>
              </div>
            </div>
          )}

          {supabaseConnected === false && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                <p className="text-sm text-red-700">Database connection failed. Please refresh the page.</p>
              </div>
            </div>
          )}

          {/* General Error Message */}
          {errors.general && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                <p className="text-sm text-red-700">{errors.general}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-text-primary mb-2">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-text-secondary" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email || errors.general) {
                      setErrors(prev => ({ ...prev, email: undefined, general: undefined }));
                    }
                  }}
                  className={`block w-full pl-10 pr-3 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors duration-200 ${
                    errors.email 
                      ? 'border-accent-red bg-red-50' 
                      : 'border-gray-300 bg-white hover:border-gray-400'
                  }`}
                  placeholder="Enter your email"
                />
              </div>
              {errors.email && (
                <p className="mt-2 text-sm text-accent-red">{errors.email}</p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-text-primary mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-text-secondary" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password || errors.general) {
                      setErrors(prev => ({ ...prev, password: undefined, general: undefined }));
                    }
                  }}
                  className={`block w-full pl-10 pr-10 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors duration-200 ${
                    errors.password 
                      ? 'border-accent-red bg-red-50' 
                      : 'border-gray-300 bg-white hover:border-gray-400'
                  }`}
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-secondary hover:text-text-primary transition-colors duration-200"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-2 text-sm text-accent-red">{errors.password}</p>
              )}
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-text-secondary">
                  Remember me
                </label>
              </div>
              <a
                href="#forgot-password"
                className="text-sm text-text-link hover:text-secondary transition-colors duration-200 font-medium"
              >
                Forgot password?
              </a>
            </div>

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={isLoading || supabaseConnected === false}
              className="group relative w-full flex justify-center items-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all duration-200 shadow-card hover:shadow-card-hover transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Signing In...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform duration-200" />
                </>
              )}
            </button>
          </form>

          {/* Sign Up Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-text-secondary">
              Don't have an account?{' '}
              <button
                onClick={onShowSignUp}
                className="font-medium text-text-link hover:text-secondary transition-colors duration-200"
              >
                Sign Up
              </button>
            </p>
          </div>
        </div>

        {/* Terms & Privacy */}
        <div className="text-center">
          <p className="text-xs text-text-secondary">
            By signing in, you agree to our{' '}
            <a href="#terms" className="text-text-link hover:text-secondary transition-colors duration-200">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="#privacy" className="text-text-link hover:text-secondary transition-colors duration-200">
              Privacy Policy
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;