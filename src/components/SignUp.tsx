import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Mail, Lock, User, ArrowRight, ArrowLeft, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { signUp, testSupabaseConnection, signInWithGoogle } from '../lib/supabase';

interface SignUpProps {
  onBackToHome: () => void;
  onShowLogin: () => void;
}

const SignUp: React.FC<SignUpProps> = ({ onBackToHome, onShowLogin }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState<{fullName?: string; email?: string; password?: string; general?: string}>({});
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [supabaseConnected, setSupabaseConnected] = useState<boolean | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

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

  const validateForm = () => {
    const newErrors: {fullName?: string; email?: string; password?: string} = {};
    
    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    } else if (formData.fullName.trim().length < 2) {
      newErrors.fullName = 'Full name must be at least 2 characters';
    }
    
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = 'Password must contain uppercase, lowercase, and number';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check Supabase connection first
    if (supabaseConnected === false) {
      setErrors({ general: 'Database connection failed. Please refresh the page and try again.' });
      return;
    }
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    setErrors({});
    
    try {
      console.log('Attempting to sign up user:', formData.email);
      
      const { data, error } = await signUp(formData.email, formData.password, formData.fullName);
      
      if (error) {
        console.error('SignUp error details:', error);
        
        const errorMessage = error.message || '';
        
        if (errorMessage.includes('User already registered') || 
            errorMessage.includes('already registered') || 
            errorMessage.includes('user_already_exists') ||
            errorMessage.includes('already been registered')) {
          setErrors({ email: 'This email is already registered. Try signing in instead.' });
        } else if (errorMessage.includes('Password should be at least')) {
          setErrors({ password: 'Password must be at least 6 characters long.' });
        } else if (errorMessage.includes('Invalid email')) {
          setErrors({ email: 'Please enter a valid email address.' });
        } else if (errorMessage.includes('signup_disabled')) {
          setErrors({ general: 'Account creation is temporarily disabled. Please try again later.' });
        } else if (errorMessage.includes('Email rate limit exceeded')) {
          setErrors({ general: 'Too many signup attempts. Please wait a few minutes before trying again.' });
        } else if (errorMessage.includes('Database error') || 
                   errorMessage.includes('database') || 
                   errorMessage.includes('unexpected_failure') ||
                   errorMessage.includes('server error')) {
          setErrors({ general: 'Account creation failed due to a server error. Please try again in a few moments.' });
        } else {
          setErrors({ general: errorMessage || 'Unable to create account. Please try again.' });
        }
      } else if (data?.user) {
        console.log('User created successfully:', data.user.email);
        setSuccess(true);
        // Reset form
        setFormData({ fullName: '', email: '', password: '' });
      } else {
        setErrors({ general: 'Account creation failed. Please try again.' });
      }
    } catch (err: any) {
      console.error('Unexpected SignUp error:', err);
      setErrors({ general: 'An unexpected error occurred. Please check your internet connection and try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof typeof formData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
    // Clear error when user starts typing
    if (errors[field] || errors.general) {
      setErrors(prev => ({ ...prev, [field]: undefined, general: undefined }));
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setIsGoogleLoading(true);
      setErrors({});
      console.log('Initiating Google sign-up...');

      const { error } = await signInWithGoogle();
      
      if (error) {
        console.error('Google sign in error:', error);
        setErrors({ general: error.message || 'Failed to sign in with Google' });
      } else {
        console.log('Google sign-up initiated successfully');
        // No need to handle success case as the user will be redirected
      }
    } catch (err: any) {
      console.error('Unexpected Google sign in error:', err);
      setErrors({ general: 'An unexpected error occurred. Please try again.' });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const getPasswordStrength = () => {
    const password = formData.password;
    if (password.length === 0) return { strength: 0, label: '', color: '' };
    
    let strength = 0;
    if (password.length >= 6) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z\d]/.test(password)) strength++;
    
    if (strength <= 2) return { strength, label: 'Weak', color: 'bg-accent-red' };
    if (strength <= 3) return { strength, label: 'Fair', color: 'bg-accent-yellow' };
    if (strength <= 4) return { strength, label: 'Good', color: 'bg-primary' };
    return { strength, label: 'Strong', color: 'bg-green-500' };
  };

  const passwordStrength = getPasswordStrength();

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4 sm:px-6 lg:px-8">
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
            <button
              onClick={onShowLogin}
              className="bg-white text-text-primary px-4 py-2 rounded-lg shadow-card hover:shadow-card-hover transition-all duration-200 font-medium border border-gray-200 hover:border-primary"
            >
              Sign In
            </button>
          </div>
        </div>

        <div className="max-w-md w-full space-y-8">
          <div className="bg-white rounded-2xl shadow-card p-8 border border-gray-100 text-center">
            <div className="bg-green-100 rounded-full p-4 w-16 h-16 mx-auto mb-6">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-text-primary mb-4">
              Account Created Successfully!
            </h2>
            <p className="text-text-secondary mb-6">
              Welcome to Smart Receipts! Your account has been created and you can now start using the application.
            </p>
            <div className="space-y-4">
              <button
                onClick={onShowLogin}
                className="w-full bg-primary text-white py-3 px-4 rounded-lg font-medium hover:bg-primary/90 transition-colors duration-200"
              >
                Continue to Sign In
              </button>
              <button
                onClick={onBackToHome}
                className="w-full border border-gray-300 text-text-secondary py-3 px-4 rounded-lg font-medium hover:bg-gray-50 transition-colors duration-200"
              >
                Back to Home
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-2 sm:px-4 lg:px-6 xl:px-8">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%2300C48C' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}></div>
      </div>

      {/* Top Navigation */}
      <div className="fixed top-3 right-3 sm:top-4 sm:right-4 z-50 flex justify-end items-center">
        <div className="flex items-center space-x-2 sm:space-x-3">
          <span className="text-text-secondary text-xs sm:text-sm hidden sm:inline">Already have an account?</span>
          <button
            onClick={onShowLogin}
            className="bg-primary text-white px-3 sm:px-4 py-2 rounded-lg shadow-card hover:shadow-card-hover transition-all duration-200 font-medium hover:bg-primary/90 text-sm sm:text-base"
          >
            Sign In
          </button>
        </div>
      </div>

      <div className="max-w-md w-full space-y-4 sm:space-y-6 relative z-10 mx-2">
        {/* Logo and Header */}
        <div className="text-center">
          <div className="flex items-center justify-center space-x-2 sm:space-x-3 mb-4 sm:mb-6 mx-auto">
            <img 
              src="/Smart Receipt Logo.png" 
              alt="Smart Receipts Logo" 
              className="h-10 w-10 sm:h-12 sm:w-12 object-contain flex-shrink-0"
            />
            <span className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-teal-500 to-blue-600 bg-clip-text text-transparent">
              Smart Receipts
            </span>
          </div>
          <p className="text-text-secondary text-xs sm:text-sm">
            Never Lose a Receipt or Miss a Warranty Claim
          </p>
        </div>

        {/* Sign Up Card */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-card p-4 sm:p-6 lg:p-8 border border-gray-100">
          <div className="text-center mb-4 sm:mb-6">
            <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-text-primary mb-2">
              Create Your Account
            </h2>
            <p className="text-xs sm:text-sm lg:text-base text-text-secondary">
              Join thousands of users who never miss warranty claims
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

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
            {/* Full Name Field */}
            <div>
              <label htmlFor="fullName" className="block text-xs sm:text-sm font-medium text-text-primary mb-1 sm:mb-2">
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-text-secondary" />
                </div>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  value={formData.fullName}
                  onChange={handleInputChange('fullName')}
                  className={`block w-full pl-10 pr-3 py-2.5 sm:py-3 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors duration-200 ${
                    errors.fullName 
                      ? 'border-accent-red bg-red-50' 
                      : 'border-gray-300 bg-white hover:border-gray-400'
                  }`}
                  placeholder="Enter your full name"
                />
              </div>
              {errors.fullName && (
                <p className="mt-2 text-sm text-accent-red flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {errors.fullName}
                </p>
              )}
            </div>

            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-xs sm:text-sm font-medium text-text-primary mb-1 sm:mb-2">
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
                  value={formData.email}
                  onChange={handleInputChange('email')}
                  className={`block w-full pl-10 pr-3 py-2.5 sm:py-3 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors duration-200 ${
                    errors.email 
                      ? 'border-accent-red bg-red-50' 
                      : 'border-gray-300 bg-white hover:border-gray-400'
                  }`}
                  placeholder="Enter your email"
                />
              </div>
              {errors.email && (
                <p className="mt-2 text-sm text-accent-red flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {errors.email}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-xs sm:text-sm font-medium text-text-primary mb-1 sm:mb-2">
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
                  value={formData.password}
                  onChange={handleInputChange('password')}
                  className={`block w-full pl-10 pr-10 py-2.5 sm:py-3 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors duration-200 ${
                    errors.password 
                      ? 'border-accent-red bg-red-50' 
                      : 'border-gray-300 bg-white hover:border-gray-400'
                  }`}
                  placeholder="Create a strong password"
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
              
              {/* Password Strength Indicator */}
              {formData.password && (
                <div className="mt-2">
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${passwordStrength.color}`}
                        style={{ width: `${(passwordStrength.strength / 5) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-xs font-medium text-text-secondary">
                      {passwordStrength.label}
                    </span>
                  </div>
                </div>
              )}
              
              {errors.password && (
                <p className="mt-2 text-sm text-accent-red flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {errors.password}
                </p>
              )}
            </div>

            {/* Create Account Button */}
            <button
              type="submit"
              disabled={isLoading || supabaseConnected === false}
              className="group relative w-full flex justify-center items-center py-2.5 sm:py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all duration-200 shadow-card hover:shadow-card-hover transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Creating Account...
                </>
              ) : (
                <>
                  Create Account
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform duration-200" />
                </>
              )}
            </button>
          </form>
          
          {/* Social Login Divider */}
          <div className="mt-4 sm:mt-6 relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-text-secondary">Or continue with</span>
            </div>
          </div>
          
          {/* Google Sign In Button */}
          <div className="mt-4 sm:mt-6">
            <button
              onClick={handleGoogleSignIn}
              disabled={isGoogleLoading}
              className="w-full flex justify-center items-center py-2.5 sm:py-3 px-4 border border-gray-300 rounded-lg shadow-sm bg-white text-text-primary hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGoogleLoading ? (
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
              ) : (
                <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                  <path d="M1 1h22v22H1z" fill="none" />
                </svg>
              )}
              Sign up with Google
            </button>
          </div>

          {/* Sign In Link */}
          <div className="mt-4 sm:mt-6 text-center">
            <p className="text-xs sm:text-sm text-text-secondary">
              Already have an account?{' '}
              <button
                onClick={onShowLogin}
                className="font-medium text-text-link hover:text-secondary transition-colors duration-200"
              >
                Sign In
              </button>
            </p>
          </div>
        </div>

        {/* Terms & Privacy */}
        <div className="text-center px-2">
          <p className="text-[10px] sm:text-xs text-text-secondary leading-relaxed">
            By signing up, you agree to our{' '}
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

export default SignUp;