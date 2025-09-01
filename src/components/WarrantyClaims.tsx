import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Plus, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  ArrowLeft,
  FileText,
  Calendar,
  DollarSign,
  Store,
  MapPin,
  Package,
  User,
  LogOut,
  Moon,
  Sun
} from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import { useNavigate } from 'react-router-dom';
import { useSubscription } from '../contexts/SubscriptionContext';
import { useTheme } from '../contexts/ThemeContext';
import { signOut } from '../lib/supabase';
import warrantyClaimsService, { WarrantyClaim, WarrantyClaimStats } from '../services/warrantyClaimsService';
import WarrantyClaimForm from './WarrantyClaimForm';
import NotificationDropdown from './NotificationDropdown';
import Footer from './Footer';

const WarrantyClaims: React.FC = () => {
  const { user, profilePicture, refreshProfilePicture } = useUser();
  const { theme, toggleTheme } = useTheme();
  const { subscriptionInfo } = useSubscription();
  const navigate = useNavigate();
  const [claims, setClaims] = useState<WarrantyClaim[]>([]);
  const [stats, setStats] = useState<WarrantyClaimStats>({ total_claims: 0, submitted_claims: 0, completed_claims: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewClaimForm, setShowNewClaimForm] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState<WarrantyClaim | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    if (user) {
      loadWarrantyClaims();
      loadClaimsStats();
    }
  }, [user]);

  const loadWarrantyClaims = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      setError(null);
      
      const { data, error: claimsError } = await warrantyClaimsService.getUserClaims(user.id);
      
      if (claimsError) {
        setError(claimsError);
      } else {
        setClaims(data || []);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load warranty claims');
    } finally {
      setIsLoading(false);
    }
  };

  const loadClaimsStats = async () => {
    if (!user) return;

    try {
      const { data, error: statsError } = await warrantyClaimsService.getClaimsStats(user.id);
      
      if (!statsError && data) {
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to load claims stats:', err);
    }
  };

  const handleNewClaimSubmitted = () => {
    setShowNewClaimForm(false);
    loadWarrantyClaims();
    loadClaimsStats();
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      window.location.href = '/';
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'submitted':
        return <Clock className="h-5 w-5 text-blue-600" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-50 text-green-800 border-green-200';
      case 'submitted':
        return 'bg-blue-50 text-blue-800 border-blue-200';
      default:
        return 'bg-yellow-50 text-yellow-800 border-yellow-200';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-text-secondary">Loading warranty claims...</p>
        </div>
      </div>
    );
  }

  if (showNewClaimForm) {
    return (
      <WarrantyClaimForm
        onSubmitted={handleNewClaimSubmitted}
        onCancel={() => setShowNewClaimForm(false)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background font-['Inter',sans-serif]">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white shadow-card border-b border-gray-200 flex-shrink-0">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8">
          <div className="flex justify-between items-center h-16 min-w-0">
            {/* Logo - Clickable to Dashboard */}
            <button 
              onClick={() => navigate('/dashboard')}
              className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-shrink-0 hover:opacity-80 transition-opacity duration-200"
            >
              <img 
                src="/Smart Receipt Logo.png" 
                alt="Smart Receipts Logo" 
                className="h-8 w-8 sm:h-10 sm:w-10 object-contain flex-shrink-0"
              />
              <div className="relative">
                <span className="text-lg sm:text-xl lg:text-2xl font-bold bg-gradient-to-r from-teal-500 to-blue-600 bg-clip-text text-transparent truncate">
                  Smart Receipts
                </span>
                {/* Premium Label */}
                {subscriptionInfo?.plan === 'premium' && (
                  <div className="absolute -top-3 right-0 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-lg">
                    PREMIUM
                  </div>
                )}
              </div>
            </button>

            {/* Header Actions */}
            <div className="flex items-center space-x-2 sm:space-x-4">
              {/* Notifications */}
              {user && <NotificationDropdown userId={user.id} />}

              {/* User Menu */}
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200"
                >
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-primary flex items-center justify-center">
                    {profilePicture ? (
                      <img
                        src={profilePicture}
                        alt="Profile"
                        className="w-full h-full object-cover"
                        onError={() => {
                          console.log('Profile picture failed to load in WarrantyClaims, retrying...');
                          refreshProfilePicture();
                        }}
                        onLoad={() => {
                          console.log('Profile picture loaded successfully in WarrantyClaims');
                        }}
                      />
                    ) : (
                      <User className="h-4 w-4 text-white" />
                    )}
                  </div>
                  <span className="text-sm font-medium text-text-primary hidden sm:inline">
                    {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}
                  </span>
                </button>

                {/* User Dropdown */}
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-44 sm:w-48 bg-white rounded-lg shadow-card border border-gray-200 py-2 z-50 max-w-[calc(100vw-2rem)] mr-2">
                    <div className="px-4 py-2 border-b border-gray-200">
                      <p className="text-sm font-medium text-text-primary">
                        {user?.user_metadata?.full_name || 'User'}
                      </p>
                      <p className="text-xs text-text-secondary">{user?.email}</p>
                    </div>
                    <button
                      onClick={() => {
                        navigate('/dashboard');
                        setShowUserMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-text-secondary hover:bg-gray-100 hover:text-text-primary transition-colors duration-200 flex items-center space-x-2"
                    >
                      <User className="h-4 w-4" />
                      <span>Profile Settings</span>
                    </button>

                    <button
                      onClick={() => { toggleTheme(); setShowUserMenu(false); }}
                      className="w-full text-left px-4 py-2 text-sm text-text-secondary hover:bg-gray-100 hover:text-text-primary transition-colors duration-200 flex items-center space-x-2"
                    >
                      {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                      <span>Night Mode {theme === 'dark' ? 'On' : 'Off'}</span>
                    </button>

                    <button
                      onClick={handleSignOut}
                      className="w-full text-left px-4 py-2 text-sm text-text-secondary hover:bg-gray-100 hover:text-text-primary transition-colors duration-200 flex items-center space-x-2"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-6 sm:py-8 pt-20 sm:pt-24">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-text-primary mb-2">
              Warranty Claims
            </h1>
            <p className="text-base sm:text-lg lg:text-xl text-text-secondary">
              Manage your warranty support requests
            </p>
          </div>
          
          <button
            onClick={() => setShowNewClaimForm(true)}
            className="mt-4 sm:mt-0 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white px-6 py-3 rounded-lg font-medium transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center space-x-2"
          >
            <Plus className="h-5 w-5" />
            <span>New Claim</span>
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-card border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-text-secondary">Total Claims</p>
                <p className="text-3xl font-bold text-text-primary">{stats.total_claims}</p>
              </div>
              <div className="bg-gradient-to-br from-primary/10 to-primary/20 rounded-lg p-3">
                <FileText className="h-6 w-6 text-primary" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-card border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-text-secondary">Submitted</p>
                <p className="text-3xl font-bold text-blue-600">{stats.submitted_claims}</p>
              </div>
              <div className="bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg p-3">
                <Clock className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div 
            className="bg-gray-50 p-6 rounded-xl shadow-card border border-gray-200 opacity-60 relative group cursor-help"
            title="This will be an Agentic feature where, Smart Receipts will track the status of request and continue till the issue is resolved"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Completed</p>
                <p className="text-3xl font-bold text-gray-400">{stats.completed_claims}</p>
              </div>
              <div className="bg-gradient-to-br from-gray-200 to-gray-300 rounded-lg p-3">
                <CheckCircle className="h-6 w-6 text-gray-400" />
              </div>
            </div>
            {/* Coming Soon Tag */}
            <div className="absolute -top-2 -right-2 bg-amber-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg">
              Coming Soon
            </div>
            
            {/* Enhanced Tooltip */}
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-50">
              <div className="bg-gray-900 text-white text-sm rounded-lg px-4 py-3 shadow-lg max-w-xs whitespace-normal">
                <div className="font-semibold mb-1">🤖 Agentic Feature</div>
                <div>This will be an Agentic feature where, Smart Receipts will track the status of request and continue till the issue is resolved</div>
                {/* Tooltip Arrow */}
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Claims List */}
        <div className="bg-white rounded-xl shadow-card border border-gray-100">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-text-primary">Your Warranty Claims</h2>
              {claims.length > 0 && (
                <span className="text-sm text-text-secondary">
                  {claims.length} {claims.length === 1 ? 'claim' : 'claims'}
                </span>
              )}
            </div>
          </div>

          {error ? (
            <div className="p-6">
              <div className="text-center py-8">
                <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-text-primary mb-2">Error Loading Claims</h3>
                <p className="text-text-secondary mb-4">{error}</p>
                <button
                  onClick={loadWarrantyClaims}
                  className="bg-primary text-white px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors duration-200"
                >
                  Try Again
                </button>
              </div>
            </div>
          ) : claims.length === 0 ? (
            <div className="p-6">
              <div className="text-center py-12">
                <Shield className="h-16 w-16 text-text-secondary mx-auto mb-4" />
                <h3 className="text-xl font-medium text-text-primary mb-2">No warranty claims yet</h3>
                <p className="text-text-secondary mb-6 max-w-md mx-auto">
                  Start by submitting your first warranty claim. We'll help you get the support you need for your products.
                </p>
                <button
                  onClick={() => setShowNewClaimForm(true)}
                  className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white px-6 py-3 rounded-lg font-medium transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center space-x-2 mx-auto"
                >
                  <Plus className="h-5 w-5" />
                  <span>Submit Your First Claim</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {claims.map((claim) => (
                <div key={claim.id} className="p-6 hover:bg-gray-50 transition-colors duration-200">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0 pr-4">
                      {/* Always visible: Product header */}
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="bg-gradient-to-br from-primary/10 to-primary/20 rounded-lg p-2">
                          <Package className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-3 mb-1">
                            <h3 className="text-lg font-semibold text-text-primary">{claim.product_name}</h3>
                            {claim.claim_id && (
                              <span className="bg-primary/10 text-primary px-2 py-1 rounded-md text-xs font-mono font-medium">
                                {claim.claim_id}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-text-secondary">
                            {claim.brand_name && (
                              <span className="flex items-center space-x-1">
                                <span>Brand:</span>
                                <span className="font-medium">{claim.brand_name}</span>
                              </span>
                            )}
                            {claim.model_number && (
                              <span className="flex items-center space-x-1">
                                <span>Model:</span>
                                <span className="font-medium">{claim.model_number}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Always visible: Basic info */}
                      <div className="mb-3">
                        <div className="flex items-center space-x-2 text-sm text-text-secondary">
                          <Calendar className="h-4 w-4" />
                          <span>Submitted: {formatDate(claim.created_at)}</span>
                        </div>
                      </div>

                      {/* Expandable Details */}
                      {selectedClaim?.id === claim.id && (
                        <div className="space-y-4 border-t border-gray-200 pt-4">
                          {/* Detailed Information Grid */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              {claim.store_name && (
                                <div className="flex items-center space-x-2 text-sm text-text-secondary">
                                  <Store className="h-4 w-4" />
                                  <span>{claim.store_name}</span>
                                </div>
                              )}
                              {claim.purchase_location && (
                                <div className="flex items-center space-x-2 text-sm text-text-secondary">
                                  <MapPin className="h-4 w-4" />
                                  <span>{claim.purchase_location}</span>
                                </div>
                              )}
                              {claim.amount && (
                                <div className="flex items-center space-x-2 text-sm text-text-secondary">
                                  <DollarSign className="h-4 w-4" />
                                  <span>{formatCurrency(claim.amount)}</span>
                                </div>
                              )}
                            </div>
                            <div className="space-y-2">
                              {claim.warranty_period && (
                                <div className="flex items-center space-x-2 text-sm text-text-secondary">
                                  <Shield className="h-4 w-4" />
                                  <span>Warranty: {claim.warranty_period}</span>
                                </div>
                              )}
                              {claim.user_name && (
                                <div className="flex items-center space-x-2 text-sm text-text-secondary">
                                  <User className="h-4 w-4" />
                                  <span>User: {claim.user_name}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Issue Description */}
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="text-sm font-medium text-text-primary">Issue Description:</h4>
                              {claim.claim_id && (
                                <span className="text-xs text-text-secondary">
                                  Claim ID: <span className="font-mono font-medium text-primary">{claim.claim_id}</span>
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-text-secondary bg-gray-50 p-3 rounded-lg">
                              {claim.issue_description}
                            </p>
                          </div>

                          {/* Support Response */}
                          {claim.webhook_response && (
                            <div>
                              <h4 className="text-sm font-medium text-text-primary mb-2">Support Response:</h4>
                              <div className="text-sm text-text-secondary bg-blue-50 border border-blue-200 p-3 rounded-lg max-h-40 overflow-y-auto overflow-x-hidden">
                                <div 
                                  className="max-w-full"
                                  style={{
                                    wordWrap: 'break-word',
                                    overflowWrap: 'break-word',
                                    wordBreak: 'break-word',
                                    whiteSpace: 'pre-wrap'
                                  }}
                                >
                                  {claim.webhook_response}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Receipt Image Link */}
                          {claim.receipt_image_url && (
                            <div>
                              <h4 className="text-sm font-medium text-text-primary mb-2">Receipt:</h4>
                              <a
                                href={claim.receipt_image_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center space-x-2 text-sm text-primary hover:text-primary/80 transition-colors duration-200"
                              >
                                <FileText className="h-4 w-4" />
                                <span>View Receipt Image</span>
                              </a>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-end space-y-2">
                      <div className={`flex items-center space-x-2 px-3 py-1 rounded-full border ${getStatusColor(claim.status)}`}>
                        {getStatusIcon(claim.status)}
                        <span className="text-sm font-medium capitalize">{claim.status}</span>
                      </div>
                      <button
                        onClick={() => setSelectedClaim(selectedClaim?.id === claim.id ? null : claim)}
                        className="text-primary hover:text-primary/80 text-sm font-medium transition-colors duration-200"
                      >
                        {selectedClaim?.id === claim.id ? 'Hide Details' : 'View Details'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Click outside to close user menu */}
      {showUserMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowUserMenu(false)}
        />
      )}

      <Footer />
    </div>
  );
};

export default WarrantyClaims;
