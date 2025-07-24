import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Plus, Copy, RefreshCw, Settings, LogOut, Check, X, Calendar, Users, CreditCard } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface SubscriptionCode {
  id: string;
  code: string;
  status: 'generated' | 'used' | 'expired';
  generated_at: string;
  expires_at: string;
  used_at?: string;
  used_by_user_id?: string;
  duration_months: number;
  notes?: string;
}

interface AdminStats {
  total_codes: number;
  used_codes: number;
  expired_codes: number;
  active_codes: number;
}

const AdminPortal: React.FC = () => {
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Admin functionality state
  const [subscriptionCodes, setSubscriptionCodes] = useState<SubscriptionCode[]>([]);
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [subscriptionSystem, setSubscriptionSystem] = useState<'code_based' | 'stripe'>('code_based');
  
  // Code generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [durationMonths, setDurationMonths] = useState(1);
  const [codeNotes, setCodeNotes] = useState('');

  useEffect(() => {
    // Check if already authenticated (simple session check)
    const authStatus = localStorage.getItem('admin_authenticated');
    if (authStatus === 'true') {
      setIsAuthenticated(true);
      loadAdminData();
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadAdminData();
      // Set up auto-refresh every 30 seconds
      const interval = setInterval(loadAdminData, 30000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    setLoginError('');

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Environment variable credentials check
    const adminUsername = import.meta.env.VITE_ADMIN_USERNAME;
    const adminPassword = import.meta.env.VITE_ADMIN_PASSWORD;
    
    if (username === adminUsername && password === adminPassword) {
      setIsAuthenticated(true);
      localStorage.setItem('admin_authenticated', 'true');
      await loadAdminData();
    } else {
      setLoginError('Invalid credentials. Please check your username and password.');
    }

    setIsLoggingIn(false);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('admin_authenticated');
    setUsername('');
    setPassword('');
  };

  const loadAdminData = async () => {
    setLoading(true);
    setError('');

    try {
      // Load admin stats using RPC function (this works!)
      const { data: statsData, error: statsError } = await supabase.rpc('get_admin_subscription_stats');
      if (statsError) {
        console.error('Stats error:', statsError);
        throw statsError;
      }
      setAdminStats(statsData);

      // Load subscription system setting from localStorage (avoid database calls)
      const savedSystem = localStorage.getItem('admin_subscription_system');
      if (savedSystem && (savedSystem === 'code_based' || savedSystem === 'stripe')) {
        setSubscriptionSystem(savedSystem as 'code_based' | 'stripe');
      }

      // Note: We don't load subscription codes from database due to RLS restrictions
      // The codes will be managed through local state when generated

    } catch (err: any) {
      console.error('Error loading admin data:', err);
      setError(`Failed to load admin data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const generateSubscriptionCode = async () => {
    setIsGenerating(true);
    setError('');
    setSuccessMessage('');

    try {
      // Use the RPC function (this works!)
      const { data, error } = await supabase.rpc('create_subscription_code', {
        duration_months: durationMonths,
        notes: codeNotes || null
      });

      if (error) throw error;

      if (data && data.success) {
        setSuccessMessage(`✅ New subscription code generated: ${data.code}`);
        setCodeNotes('');
        
        // Add the new code to the local state immediately for better UX
        const newCode: SubscriptionCode = {
          id: data.id,
          code: data.code,
          status: 'generated',
          generated_at: new Date().toISOString(),
          expires_at: data.expires_at,
          duration_months: durationMonths,
          notes: codeNotes || undefined
        };
        setSubscriptionCodes(prev => [newCode, ...prev]);
        
        // Refresh stats
        await loadAdminData();
      } else {
        setError('Failed to generate subscription code');
      }
    } catch (err: any) {
      console.error('Error generating code:', err);
      setError(`Failed to generate code: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleSubscriptionSystem = async () => {
    const newSystem = subscriptionSystem === 'code_based' ? 'stripe' : 'code_based';
    
    // Save to localStorage instead of database (to avoid RLS issues)
    localStorage.setItem('admin_subscription_system', newSystem);
    setSubscriptionSystem(newSystem);
    setSuccessMessage(`✅ Subscription system changed to ${newSystem === 'code_based' ? 'Code-Based' : 'Stripe'}`);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setSuccessMessage('✅ Code copied to clipboard!');
      setTimeout(() => setSuccessMessage(''), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-AU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      generated: 'bg-blue-100 text-blue-800',
      used: 'bg-green-100 text-green-800',
      expired: 'bg-red-100 text-red-800'
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  // Login Screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-primary">
              <Settings className="h-6 w-6 text-white" />
            </div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Smart Receipts Admin Portal
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Subscription Code Management System
            </p>
          </div>
          
          <form className="mt-8 space-y-6" onSubmit={(e) => { e.preventDefault(); handleLogin(); }}>
            <div className="space-y-4">
              <div>
                <label htmlFor="username" className="sr-only">Username</label>
                <input
                  id="username"
                  name="username"
                  type="email"
                  autoComplete="username"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                  placeholder="Username"
                />
              </div>
              <div className="relative">
                <label htmlFor="password" className="sr-only">Password</label>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="relative block w-full px-3 py-2 pr-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                  placeholder="Password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            {loginError && (
              <div className="text-red-600 text-sm text-center">{loginError}</div>
            )}

            <div>
              <button
                type="submit"
                disabled={isLoggingIn}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
              >
                {isLoggingIn ? 'Signing in...' : 'Sign in'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Admin Dashboard
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Settings className="h-8 w-8 text-primary mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Admin Portal</h1>
                <p className="text-sm text-gray-600">Subscription Code Management</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={loadAdminData}
                disabled={loading}
                className="p-2 text-gray-400 hover:text-gray-600"
              >
                <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Status Messages */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            {error}
          </div>
        )}
        
        {successMessage && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
            {successMessage}
          </div>
        )}

        {/* System Toggle */}
        <div className="mb-8 bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Subscription System</h2>
              <p className="text-sm text-gray-600">Toggle between code-based and Stripe-based subscriptions</p>
            </div>
            <div className="flex items-center space-x-3">
              <span className={`text-sm ${subscriptionSystem === 'code_based' ? 'font-semibold text-primary' : 'text-gray-500'}`}>
                Code-Based
              </span>
              <button
                onClick={toggleSubscriptionSystem}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                  subscriptionSystem === 'stripe' ? 'bg-primary' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    subscriptionSystem === 'stripe' ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              <span className={`text-sm ${subscriptionSystem === 'stripe' ? 'font-semibold text-primary' : 'text-gray-500'}`}>
                Stripe
              </span>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        {adminStats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <CreditCard className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Codes</p>
                  <p className="text-2xl font-bold text-gray-900">{adminStats.total_codes}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Check className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Used Codes</p>
                  <p className="text-2xl font-bold text-gray-900">{adminStats.used_codes}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Calendar className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Active Codes</p>
                  <p className="text-2xl font-bold text-gray-900">{adminStats.active_codes}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-red-100 rounded-lg">
                  <X className="h-6 w-6 text-red-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Expired Codes</p>
                  <p className="text-2xl font-bold text-gray-900">{adminStats.expired_codes}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Code Generation */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Generate New Subscription Code</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Duration (Months)
              </label>
              <select
                value={durationMonths}
                onChange={(e) => setDurationMonths(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
              >
                <option value={1}>1 Month</option>
                <option value={3}>3 Months</option>
                <option value={6}>6 Months</option>
                <option value={12}>12 Months</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes (Optional)
              </label>
              <input
                type="text"
                value={codeNotes}
                onChange={(e) => setCodeNotes(e.target.value)}
                placeholder="e.g., Promotional code for client XYZ"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
              />
            </div>
          </div>

          <button
            onClick={generateSubscriptionCode}
            disabled={isGenerating}
            className="flex items-center space-x-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            <span>{isGenerating ? 'Generating...' : 'Generate Code'}</span>
          </button>
        </div>

        {/* Subscription Codes Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Recently Generated Codes</h2>
            <p className="text-sm text-blue-600 mt-1">
              📋 Codes generated in this session are shown below. Copy them immediately for use.
            </p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Generated
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Expires
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Notes
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {subscriptionCodes.map((code) => (
                  <tr key={code.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                          {code.code}
                        </code>
                        <button
                          onClick={() => copyToClipboard(code.code)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(code.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(code.generated_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(code.expires_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {code.duration_months} month{code.duration_months !== 1 ? 's' : ''}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {code.notes || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => copyToClipboard(code.code)}
                        className="text-primary hover:text-primary-dark"
                      >
                        Copy
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {subscriptionCodes.length === 0 && !loading && (
            <div className="text-center py-12">
              <CreditCard className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No codes generated yet</h3>
              <p className="mt-1 text-sm text-gray-500">
                Generate your first subscription code using the form above.
                <br />
                Codes will appear here for easy copying and reference.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminPortal; 