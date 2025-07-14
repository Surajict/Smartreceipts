import React, { useState, useEffect } from 'react';
import { 
  Camera, 
  FileText, 
  User, 
  Shield, 
  Search, 
  TrendingUp, 
  Calendar, 
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Clock,
  Bell,
  LogOut,
  Loader2,
  Zap,
  Database,
  RefreshCw
} from 'lucide-react';
import { getCurrentUser, getUserReceipts, getUserNotifications, signOut } from '../lib/supabase';
import { RAGService } from '../services/ragService';
import { generateEmbeddingsForAllReceipts, checkEmbeddingStatus } from '../utils/generateEmbeddings';
import NotificationDropdown from './NotificationDropdown';
import Footer from './Footer';

interface DashboardProps {
  onSignOut: () => void;
  onShowReceiptScanning: () => void;
  onShowProfile: () => void;
  onShowLibrary: () => void;
  onShowWarranty: () => void;
}

interface DashboardStats {
  totalReceipts: number;
  totalValue: number;
  expiringWarranties: number;
  activeWarranties: number;
}

interface SmartSearchResult {
  id: string;
  title: string;
  brand: string;
  purchaseDate: string;
  amount: number;
  relevanceScore: number;
}

const Dashboard: React.FC<DashboardProps> = ({
  onSignOut,
  onShowReceiptScanning,
  onShowProfile,
  onShowLibrary,
  onShowWarranty
}) => {
  const [user, setUser] = useState<any>(null);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    totalReceipts: 0,
    totalValue: 0,
    expiringWarranties: 0,
    activeWarranties: 0
  });
  const [recentReceipts, setRecentReceipts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showUserMenu, setShowUserMenu] = useState(false);
  
  // Smart Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SmartSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [ragResponse, setRagResponse] = useState<string | null>(null);
  
  // Embedding States
  const [embeddingStatus, setEmbeddingStatus] = useState<any>(null);
  const [isGeneratingEmbeddings, setIsGeneratingEmbeddings] = useState(false);
  const [embeddingProgress, setEmbeddingProgress] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      const currentUser = await getCurrentUser();
      
      if (currentUser) {
        setUser(currentUser);
        
        // Load profile picture if exists
        if (currentUser.user_metadata?.avatar_url) {
          // Implementation for loading profile picture
          setProfilePicture(currentUser.user_metadata.avatar_url);
        }
        
        // Load dashboard stats and recent receipts
        await Promise.all([
          loadStats(currentUser.id),
          loadRecentReceipts(currentUser.id),
          loadEmbeddingStatus(currentUser.id)
        ]);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async (userId: string) => {
    try {
      const { data: receipts } = await getUserReceipts(userId, 1000);
      
      if (receipts) {
        const totalReceipts = receipts.length;
        const totalValue = receipts.reduce((sum, receipt) => sum + (receipt.amount || 0), 0);
        
        // Calculate warranty stats
        const now = new Date();
        let expiringWarranties = 0;
        let activeWarranties = 0;
        
        receipts.forEach(receipt => {
          if (receipt.warranty_period && receipt.purchase_date) {
            const warrantyExpiry = calculateWarrantyExpiry(receipt.purchase_date, receipt.warranty_period);
            const daysLeft = Math.ceil((warrantyExpiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            
            if (daysLeft > 0) {
              activeWarranties++;
              if (daysLeft <= 90) {
                expiringWarranties++;
              }
            }
          }
        });
        
        setStats({
          totalReceipts,
          totalValue,
          expiringWarranties,
          activeWarranties
        });
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadRecentReceipts = async (userId: string) => {
    try {
      const { data: receipts } = await getUserReceipts(userId, 5);
      setRecentReceipts(receipts || []);
    } catch (error) {
      console.error('Error loading recent receipts:', error);
    }
  };

  const loadEmbeddingStatus = async (userId: string) => {
    try {
      const status = await checkEmbeddingStatus(userId);
      setEmbeddingStatus(status);
    } catch (error) {
      console.error('Error loading embedding status:', error);
    }
  };

  const calculateWarrantyExpiry = (purchaseDate: string, warrantyPeriod: string): Date => {
    const purchase = new Date(purchaseDate);
    const period = warrantyPeriod.toLowerCase();
    
    if (period.includes('lifetime')) {
      return new Date('2099-12-31');
    }
    
    const years = period.match(/(\d+)\s*year/);
    const months = period.match(/(\d+)\s*month/);
    
    if (years) {
      purchase.setFullYear(purchase.getFullYear() + parseInt(years[1]));
    } else if (months) {
      purchase.setMonth(purchase.getMonth() + parseInt(months[1]));
    } else {
      purchase.setFullYear(purchase.getFullYear() + 1);
    }
    
    return purchase;
  };

  const handleSmartSearch = async () => {
    if (!searchQuery.trim() || !user) return;
    
    setIsSearching(true);
    setSearchError(null);
    setSearchResults([]);
    setRagResponse(null);
    
    try {
      // First try vector search via edge function
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/smart-search`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: searchQuery,
          userId: user.id,
          limit: 5
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data.results && data.results.length > 0) {
          setSearchResults(data.results);
          
          // If this looks like a complex query, also generate RAG response
          if (RAGService.isRAGQuery(searchQuery)) {
            const ragResult = await RAGService.processQuery(searchQuery, data.results, user.id);
            setRagResponse(ragResult.answer);
          }
        } else {
          setSearchError('No results found. Try different search terms or check if your receipts have been indexed.');
        }
      } else {
        throw new Error('Search service unavailable');
      }
    } catch (error) {
      console.error('Smart search error:', error);
      setSearchError('Search failed. Please try again or use the library search.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleGenerateEmbeddings = async () => {
    if (!user) return;
    
    setIsGeneratingEmbeddings(true);
    setEmbeddingProgress('Starting embedding generation...');
    
    try {
      const result = await generateEmbeddingsForAllReceipts(user.id);
      
      if (result.success) {
        setEmbeddingProgress(`Successfully processed ${result.successful} receipts!`);
        await loadEmbeddingStatus(user.id);
        
        setTimeout(() => {
          setEmbeddingProgress(null);
        }, 3000);
      } else {
        setEmbeddingProgress(`Failed: ${result.message}`);
      }
    } catch (error) {
      console.error('Embedding generation error:', error);
      setEmbeddingProgress('Failed to generate embeddings. Please try again.');
    } finally {
      setIsGeneratingEmbeddings(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      onSignOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-text-secondary">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background font-['Inter',sans-serif]">
      {/* Header */}
      <header className="bg-white shadow-card border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <img 
                src="/Smart Receipt Logo.png" 
                alt="Smart Receipts Logo" 
                className="h-10 w-10 object-contain"
              />
              <span className="text-2xl font-bold bg-gradient-to-r from-teal-500 to-blue-600 bg-clip-text text-transparent">
                Smart Receipts
              </span>
            </div>

            {/* Header Actions */}
            <div className="flex items-center space-x-4">
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
                        onError={() => setProfilePicture(null)}
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
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-card border border-gray-200 py-2 z-50">
                    <div className="px-4 py-2 border-b border-gray-200">
                      <p className="text-sm font-medium text-text-primary">
                        {user?.user_metadata?.full_name || 'User'}
                      </p>
                      <p className="text-xs text-text-secondary">{user?.email}</p>
                    </div>
                    <button
                      onClick={onShowProfile}
                      className="w-full text-left px-4 py-2 text-sm text-text-secondary hover:bg-gray-100 hover:text-text-primary transition-colors duration-200 flex items-center space-x-2"
                    >
                      <User className="h-4 w-4" />
                      <span>Profile Settings</span>
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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-4">
            Welcome back, {user?.user_metadata?.full_name?.split(' ')[0] || 'there'}! 👋
          </h1>
          <p className="text-xl text-text-secondary">
            Manage your receipts and track warranties with AI-powered insights
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-text-secondary">Total Receipts</p>
                <p className="text-2xl font-bold text-text-primary">{stats.totalReceipts}</p>
              </div>
              <div className="bg-blue-100 rounded-full p-3">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-text-secondary">Total Value</p>
                <p className="text-2xl font-bold text-text-primary">{formatCurrency(stats.totalValue)}</p>
              </div>
              <div className="bg-green-100 rounded-full p-3">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-text-secondary">Active Warranties</p>
                <p className="text-2xl font-bold text-text-primary">{stats.activeWarranties}</p>
              </div>
              <div className="bg-purple-100 rounded-full p-3">
                <Shield className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-text-secondary">Expiring Soon</p>
                <p className="text-2xl font-bold text-text-primary">{stats.expiringWarranties}</p>
              </div>
              <div className="bg-yellow-100 rounded-full p-3">
                <AlertTriangle className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6 mb-8">
          <h2 className="text-xl font-bold text-text-primary mb-6">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              onClick={onShowReceiptScanning}
              className="flex items-center space-x-3 p-4 bg-gradient-to-r from-primary to-teal-600 text-white rounded-lg hover:from-primary/90 hover:to-teal-600/90 transition-all duration-200 shadow-card hover:shadow-card-hover"
            >
              <Camera className="h-6 w-6" />
              <span className="font-medium">Scan Receipt</span>
            </button>

            <button
              onClick={onShowLibrary}
              className="flex items-center space-x-3 p-4 bg-gradient-to-r from-secondary to-purple-600 text-white rounded-lg hover:from-secondary/90 hover:to-purple-600/90 transition-all duration-200 shadow-card hover:shadow-card-hover"
            >
              <FileText className="h-6 w-6" />
              <span className="font-medium">My Library</span>
            </button>

            <button
              onClick={onShowWarranty}
              className="flex items-center space-x-3 p-4 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-lg hover:from-yellow-500/90 hover:to-orange-500/90 transition-all duration-200 shadow-card hover:shadow-card-hover"
            >
              <Shield className="h-6 w-6" />
              <span className="font-medium">Warranties</span>
            </button>

            <button
              onClick={onShowProfile}
              className="flex items-center space-x-3 p-4 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-lg hover:from-gray-600/90 hover:to-gray-700/90 transition-all duration-200 shadow-card hover:shadow-card-hover"
            >
              <User className="h-6 w-6" />
              <span className="font-medium">Profile</span>
            </button>
          </div>
        </div>

        {/* Smart Search Section */}
        <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-text-primary flex items-center space-x-2">
              <Search className="h-5 w-5" />
              <span>Smart Search</span>
            </h2>
            
            {/* Embedding Status Indicator */}
            {embeddingStatus && (
              <div className="flex items-center space-x-2 text-sm">
                {embeddingStatus.withoutEmbeddings > 0 ? (
                  <>
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    <span className="text-text-secondary">
                      {embeddingStatus.withoutEmbeddings} receipts need indexing
                    </span>
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-text-secondary">All receipts indexed</span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Embedding Status Warning */}
          {embeddingStatus && embeddingStatus.withoutEmbeddings > 0 && (
            <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium text-yellow-800">Smart Search Setup Required</h4>
                  <p className="text-sm text-yellow-700 mt-1">
                    {embeddingStatus.withoutEmbeddings} of your receipts need to be indexed for AI-powered search. 
                    This enables semantic search like "laptop computer" or "kitchen appliance".
                  </p>
                  <button
                    onClick={handleGenerateEmbeddings}
                    disabled={isGeneratingEmbeddings}
                    className="mt-3 flex items-center space-x-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors duration-200 disabled:opacity-50"
                  >
                    {isGeneratingEmbeddings ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Zap className="h-4 w-4" />
                    )}
                    <span>
                      {isGeneratingEmbeddings ? 'Indexing...' : 'Index Receipts'}
                    </span>
                  </button>
                  {embeddingProgress && (
                    <p className="text-sm text-yellow-700 mt-2">{embeddingProgress}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Search Input */}
          <div className="flex space-x-4 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-text-secondary" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSmartSearch()}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors duration-200"
                placeholder="Search receipts with AI (e.g., 'laptop computer', 'kitchen appliance', 'electronics warranty')"
              />
            </div>
            <button
              onClick={handleSmartSearch}
              disabled={isSearching || !searchQuery.trim()}
              className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isSearching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              <span>Search</span>
            </button>
          </div>

          {/* Search Results */}
          {searchError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-4">
              <p className="text-red-700">{searchError}</p>
            </div>
          )}

          {ragResponse && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-4">
              <h4 className="font-medium text-blue-800 mb-2">AI Analysis:</h4>
              <p className="text-blue-700">{ragResponse}</p>
            </div>
          )}

          {searchResults.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium text-text-primary">Search Results:</h4>
              {searchResults.map((result, index) => (
                <div key={index} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h5 className="font-medium text-text-primary">{result.title}</h5>
                      <p className="text-sm text-text-secondary">
                        {result.brand} • {formatDate(result.purchaseDate)} • {formatCurrency(result.amount)}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs bg-primary text-white px-2 py-1 rounded">
                        {Math.round(result.relevanceScore * 100)}% match
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Search Examples */}
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-text-secondary mb-2">Try searching for:</h4>
            <div className="flex flex-wrap gap-2">
              {[
                'laptop computer',
                'phone charger',
                'kitchen appliance',
                'electronics warranty',
                'expensive purchase'
              ].map((example) => (
                <button
                  key={example}
                  onClick={() => setSearchQuery(example)}
                  className="px-3 py-1 bg-white border border-gray-300 rounded-full text-sm text-text-secondary hover:bg-gray-100 transition-colors duration-200"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Receipts */}
        <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-text-primary">Recent Receipts</h2>
            <button
              onClick={onShowLibrary}
              className="text-primary hover:text-primary/80 transition-colors duration-200 font-medium"
            >
              View All
            </button>
          </div>

          {recentReceipts.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-text-secondary mx-auto mb-4" />
              <h3 className="text-lg font-medium text-text-primary mb-2">No receipts yet</h3>
              <p className="text-text-secondary mb-4">Start by scanning your first receipt</p>
              <button
                onClick={onShowReceiptScanning}
                className="bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors duration-200"
              >
                Scan Receipt
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {recentReceipts.map((receipt) => (
                <div key={receipt.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex-1">
                    <h4 className="font-medium text-text-primary">{receipt.product_description}</h4>
                    <p className="text-sm text-text-secondary">
                      {receipt.brand_name} • {receipt.store_name} • {formatDate(receipt.purchase_date)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-text-primary">{formatCurrency(receipt.amount || 0)}</p>
                    <p className="text-xs text-text-secondary">{receipt.warranty_period}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />

      {/* Click outside to close user menu */}
      {showUserMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowUserMenu(false)}
        />
      )}
    </div>
  );
};

export default Dashboard;