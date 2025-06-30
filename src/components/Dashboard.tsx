import React, { useState, useEffect } from 'react';
import { 
  Camera, 
  FolderOpen, 
  Search, 
  Bell, 
  Settings, 
  User, 
  LogOut,
  Receipt,
  DollarSign,
  Tag,
  Shield,
  ChevronRight,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  X,
  Loader2
} from 'lucide-react';
import { signOut, getCurrentUser, supabase } from '../lib/supabase';

interface DashboardProps {
  onSignOut: () => void;
  onShowReceiptScanning: () => void;
  onShowProfile: () => void;
  onShowLibrary: () => void;
}

interface WarrantyAlert {
  id: string;
  itemName: string;
  purchaseDate: string;
  expiryDate: string;
  daysLeft: number;
  urgency: 'low' | 'medium' | 'high';
}

interface RecentReceipt {
  id: string;
  productName: string;
  storeName: string;
  brandName: string;
  date: string;
  amount: number;
  items: number;
}

interface SummaryStats {
  receiptsScanned: number;
  totalAmount: number;
  itemsCaptured: number;
  warrantiesClaimed: number;
}

interface SearchResult {
  id: string;
  title: string;
  brand: string;
  model?: string;
  purchaseDate: string;
  amount?: number;
  warrantyPeriod: string;
  relevanceScore: number;
}

const Dashboard: React.FC<DashboardProps> = ({ onSignOut, onShowReceiptScanning, onShowProfile, onShowLibrary }) => {
  const [user, setUser] = useState<any>(null);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [alertsCount, setAlertsCount] = useState(0);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotificationMenu, setShowNotificationMenu] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  
  const [summaryStats, setSummaryStats] = useState<SummaryStats>({
    receiptsScanned: 0,
    totalAmount: 0,
    itemsCaptured: 0,
    warrantiesClaimed: 0
  });
  const [warrantyAlerts, setWarrantyAlerts] = useState<WarrantyAlert[]>([]);
  const [recentReceipts, setRecentReceipts] = useState<RecentReceipt[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      
      // Load profile picture if exists
      if (currentUser?.user_metadata?.avatar_url) {
        try {
          const { data } = supabase.storage
            .from('profile-pictures')
            .getPublicUrl(currentUser.user_metadata.avatar_url);
          setProfilePicture(data.publicUrl);
        } catch (error) {
          console.error('Error loading profile picture:', error);
        }
      }

      // Load actual data from database
      if (currentUser) {
        await loadDashboardData(currentUser.id);
      }
    };
    loadUser();

    // Update time every minute
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  const loadDashboardData = async (userId: string) => {
    try {
      setIsLoading(true);

      // Load receipts data
      const { data: receipts, error: receiptsError } = await supabase
        .from('receipts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (receiptsError) {
        console.error('Error loading receipts:', receiptsError);
        return;
      }

      // Calculate summary statistics
      const stats: SummaryStats = {
        receiptsScanned: receipts?.length || 0,
        totalAmount: receipts?.reduce((sum, receipt) => sum + (receipt.amount || 0), 0) || 0,
        itemsCaptured: receipts?.length || 0, // Assuming 1 item per receipt for now
        warrantiesClaimed: 0 // This would need a separate tracking mechanism
      };
      setSummaryStats(stats);

      // Process recent receipts with product name and store name
      const recentReceiptsData: RecentReceipt[] = (receipts || [])
        .slice(0, 4)
        .map(receipt => ({
          id: receipt.id,
          productName: receipt.product_description || 'Unknown Product',
          storeName: receipt.store_name || 'Unknown Store',
          brandName: receipt.brand_name || 'Unknown Brand',
          date: receipt.purchase_date,
          amount: receipt.amount || 0,
          items: 1 // Assuming 1 item per receipt for now
        }));
      setRecentReceipts(recentReceiptsData);

      // Calculate warranty alerts
      const alerts: WarrantyAlert[] = (receipts || [])
        .map(receipt => {
          const warrantyExpiry = calculateWarrantyExpiry(receipt.purchase_date, receipt.warranty_period);
          const daysLeft = Math.ceil((warrantyExpiry.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
          
          // Only include items with warranties expiring in the next 6 months
          if (daysLeft > 0 && daysLeft <= 180) {
            return {
              id: receipt.id,
              itemName: receipt.product_description,
              purchaseDate: receipt.purchase_date,
              expiryDate: warrantyExpiry.toISOString().split('T')[0],
              daysLeft,
              urgency: daysLeft <= 30 ? 'high' : daysLeft <= 90 ? 'medium' : 'low'
            };
          }
          return null;
        })
        .filter(alert => alert !== null)
        .sort((a, b) => a!.daysLeft - b!.daysLeft)
        .slice(0, 3) as WarrantyAlert[];

      setWarrantyAlerts(alerts);
      setAlertsCount(alerts.length);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setIsLoading(false);
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
      // Default to 1 year if no specific period found
      purchase.setFullYear(purchase.getFullYear() + 1);
    }
    
    return purchase;
  };

  // Smart Search functionality using Supabase Edge Function
  const performSmartSearch = async (query: string) => {
    if (!query.trim() || !user) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    setSearchError(null);

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/smart-search`;
      
      const headers = {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      };

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          query: query.trim(),
          userId: user.id
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Search failed: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      setSearchResults(data.results || []);
    } catch (err: any) {
      console.error('Smart search error:', err);
      setSearchError(err.message || 'Search failed. Please try again.');
      
      // Fallback to local search
      performLocalSearch(query);
    } finally {
      setIsSearching(false);
    }
  };

  // Fallback local search
  const performLocalSearch = async (query: string) => {
    try {
      const { data: receipts, error } = await supabase
        .from('receipts')
        .select('*')
        .eq('user_id', user.id)
        .or(`product_description.ilike.%${query}%,brand_name.ilike.%${query}%,model_number.ilike.%${query}%,store_name.ilike.%${query}%,purchase_location.ilike.%${query}%`)
        .limit(5);

      if (error) {
        console.error('Local search error:', error);
        return;
      }

      const localResults = (receipts || []).map(receipt => ({
        id: receipt.id,
        title: receipt.product_description,
        brand: receipt.brand_name,
        model: receipt.model_number,
        purchaseDate: receipt.purchase_date,
        amount: receipt.amount,
        warrantyPeriod: receipt.warranty_period,
        relevanceScore: 0.7 // Mock score for local search
      }));

      setSearchResults(localResults);
    } catch (error) {
      console.error('Local search failed:', error);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performSmartSearch(searchQuery);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setSearchError(null);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      onSignOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return 'border-accent-red bg-red-50';
      case 'medium': return 'border-accent-yellow bg-yellow-50';
      case 'low': return 'border-primary bg-green-50';
      default: return 'border-gray-300 bg-gray-50';
    }
  };

  const getUrgencyIcon = (urgency: string) => {
    switch (urgency) {
      case 'high': return <AlertTriangle className="h-5 w-5 text-accent-red" />;
      case 'medium': return <Clock className="h-5 w-5 text-accent-yellow" />;
      case 'low': return <CheckCircle className="h-5 w-5 text-primary" />;
      default: return <Clock className="h-5 w-5 text-gray-500" />;
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
      month: 'short',
      day: 'numeric',
      year: 'numeric'
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
              <div className="relative">
                <button 
                  onClick={() => setShowNotificationMenu(!showNotificationMenu)}
                  className="relative p-2 text-text-secondary hover:text-text-primary transition-colors duration-200"
                >
                  <Bell className="h-6 w-6" />
                  {alertsCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-accent-red text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                      {alertsCount}
                    </span>
                  )}
                </button>

                {/* Notification Dropdown */}
                {showNotificationMenu && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-card border border-gray-200 py-2 z-50">
                    <div className="px-4 py-2 border-b border-gray-200">
                      <h3 className="font-medium text-text-primary">Notifications</h3>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {warrantyAlerts.length === 0 ? (
                        <div className="px-4 py-8 text-center">
                          <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                          <p className="text-sm text-text-secondary">No warranty alerts at this time</p>
                        </div>
                      ) : (
                        warrantyAlerts.map((alert) => (
                          <div key={alert.id} className="px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0">
                            <div className="flex items-start space-x-3">
                              {getUrgencyIcon(alert.urgency)}
                              <div className="flex-1">
                                <p className="text-sm font-medium text-text-primary">{alert.itemName}</p>
                                <p className="text-xs text-text-secondary">
                                  Warranty expires in {alert.daysLeft} days
                                </p>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    <div className="px-4 py-2 border-t border-gray-200">
                      <button className="text-sm text-primary hover:text-primary/80 font-medium">
                        View all notifications
                      </button>
                    </div>
                  </div>
                )}
              </div>

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
                      onClick={() => {
                        onShowProfile();
                        setShowUserMenu(false);
                      }}
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
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-2">
            {getGreeting()}, {user?.user_metadata?.full_name?.split(' ')[0] || 'there'}!
          </h1>
          <p className="text-xl text-text-secondary">
            Ready to manage your receipts and warranties smartly?
          </p>
        </div>

        {/* Quick Access Tiles */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <button 
            onClick={onShowReceiptScanning}
            className="group bg-gradient-to-br from-primary to-teal-600 p-8 rounded-2xl shadow-card hover:shadow-card-hover transition-all duration-300 transform hover:-translate-y-2 text-white"
          >
            <div className="flex flex-col items-center text-center">
              <div className="bg-white/20 rounded-full p-4 mb-4 group-hover:bg-white/30 transition-colors duration-300">
                <Camera className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-bold mb-2">Scan Receipt</h3>
              <p className="text-white/90">Capture and digitize your receipts instantly</p>
            </div>
          </button>

          <button 
            onClick={onShowLibrary}
            className="group bg-gradient-to-br from-secondary to-purple-600 p-8 rounded-2xl shadow-card hover:shadow-card-hover transition-all duration-300 transform hover:-translate-y-2 text-white"
          >
            <div className="flex flex-col items-center text-center">
              <div className="bg-white/20 rounded-full p-4 mb-4 group-hover:bg-white/30 transition-colors duration-300">
                <FolderOpen className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-bold mb-2">My Library</h3>
              <p className="text-white/90">Browse and organize your receipt collection</p>
            </div>
          </button>

          <button 
            onClick={() => setShowSearchModal(true)}
            className="group bg-gradient-to-br from-accent-yellow to-yellow-500 p-8 rounded-2xl shadow-card hover:shadow-card-hover transition-all duration-300 transform hover:-translate-y-2 text-white"
          >
            <div className="flex flex-col items-center text-center">
              <div className="bg-white/20 rounded-full p-4 mb-4 group-hover:bg-white/30 transition-colors duration-300">
                <Search className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-bold mb-2">Search</h3>
              <p className="text-white/90">Find receipts and items quickly</p>
            </div>
          </button>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-card border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-gradient-to-br from-primary/10 to-primary/20 rounded-lg p-2 sm:p-3 flex-shrink-0">
                <Receipt className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-text-primary mb-1">
              {summaryStats.receiptsScanned}
            </div>
            <div className="text-xs sm:text-sm text-text-secondary">Receipts Scanned</div>
          </div>

          <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-card border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-gradient-to-br from-secondary/10 to-secondary/20 rounded-lg p-2 sm:p-3 flex-shrink-0">
                <DollarSign className="h-5 w-5 sm:h-6 sm:w-6 text-secondary" />
              </div>
            </div>
            <div className="text-xl sm:text-3xl font-bold text-text-primary mb-1 break-words">
              {formatCurrency(summaryStats.totalAmount)}
            </div>
            <div className="text-xs sm:text-sm text-text-secondary">Total Amount Captured</div>
          </div>

          <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-card border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-gradient-to-br from-accent-yellow/10 to-accent-yellow/20 rounded-lg p-2 sm:p-3 flex-shrink-0">
                <Tag className="h-5 w-5 sm:h-6 sm:w-6 text-accent-yellow" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-text-primary mb-1">
              {summaryStats.itemsCaptured}
            </div>
            <div className="text-xs sm:text-sm text-text-secondary">Items Captured</div>
          </div>

          <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-card border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-gradient-to-br from-green-100 to-green-200 rounded-lg p-2 sm:p-3 flex-shrink-0">
                <Shield className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-text-primary mb-1">
              {summaryStats.warrantiesClaimed}
            </div>
            <div className="text-xs sm:text-sm text-text-secondary">Warranties Claimed</div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Warranty Alerts */}
          <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-text-primary">
                Upcoming Warranty Alerts
              </h2>
              <span className="text-sm text-text-secondary">Next 6 Months</span>
            </div>

            <div className="space-y-4">
              {warrantyAlerts.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-text-primary mb-2">All warranties are current</h3>
                  <p className="text-text-secondary">No warranties expiring in the next 6 months</p>
                </div>
              ) : (
                warrantyAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-4 rounded-lg border-2 ${getUrgencyColor(alert.urgency)} hover:shadow-md transition-shadow duration-200`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          {getUrgencyIcon(alert.urgency)}
                          <h3 className="font-bold text-text-primary">{alert.itemName}</h3>
                        </div>
                        <div className="text-sm text-text-secondary space-y-1">
                          <div className="flex items-center space-x-2">
                            <Calendar className="h-4 w-4" />
                            <span>Purchased: {formatDate(alert.purchaseDate)}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Clock className="h-4 w-4" />
                            <span>Expires: {formatDate(alert.expiryDate)}</span>
                          </div>
                          <div className="font-medium text-text-primary">
                            {alert.daysLeft} days remaining
                          </div>
                        </div>
                      </div>
                      <button className="text-primary hover:text-primary/80 transition-colors duration-200">
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <button className="w-full mt-4 text-center text-primary hover:text-primary/80 font-medium py-2 transition-colors duration-200">
              View All Warranties
            </button>
          </div>

          {/* Recent Receipts */}
          <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-text-primary">Recent Receipts</h2>
              <button 
                onClick={onShowLibrary}
                className="text-primary hover:text-primary/80 font-medium transition-colors duration-200"
              >
                View All
              </button>
            </div>

            <div className="space-y-4">
              {recentReceipts.length === 0 ? (
                <div className="text-center py-8">
                  <Receipt className="h-12 w-12 text-text-secondary mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-text-primary mb-2">No receipts yet</h3>
                  <p className="text-text-secondary mb-4">Start by scanning your first receipt</p>
                  <button
                    onClick={onShowReceiptScanning}
                    className="bg-primary text-white px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors duration-200"
                  >
                    Scan Receipt
                  </button>
                </div>
              ) : (
                recentReceipts.map((receipt) => (
                  <div
                    key={receipt.id}
                    className="flex items-center justify-between p-4 rounded-lg hover:bg-gray-50 transition-colors duration-200 cursor-pointer group"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="bg-gradient-feature rounded-lg p-3">
                        <Receipt className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-text-primary group-hover:text-primary transition-colors duration-200 truncate">
                          {receipt.productName}
                        </h3>
                        <div className="text-sm text-text-secondary space-y-1">
                          <div className="flex items-center space-x-1">
                            <span className="font-medium">Store:</span>
                            <span className="truncate">{receipt.storeName}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <span className="font-medium">Brand:</span>
                            <span className="truncate">{receipt.brandName}</span>
                          </div>
                          <div className="text-xs text-text-secondary">
                            {formatDate(receipt.date)} • {receipt.items} items
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-4">
                      <div className="font-bold text-text-primary">
                        {formatCurrency(receipt.amount)}
                      </div>
                      <ChevronRight className="h-4 w-4 text-text-secondary group-hover:text-primary transition-colors duration-200 ml-auto" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Smart Search Modal */}
      {showSearchModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-card max-w-2xl w-full max-h-[80vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-text-primary">Smart Search</h2>
              <button
                onClick={() => {
                  setShowSearchModal(false);
                  clearSearch();
                }}
                className="text-text-secondary hover:text-text-primary transition-colors duration-200"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Search Form */}
            <div className="p-6 border-b border-gray-200">
              <form onSubmit={handleSearchSubmit} className="relative">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-text-secondary" />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="block w-full pl-12 pr-32 py-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors duration-200 text-lg bg-white"
                    placeholder="Search receipts by product, brand, store, or location..."
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center space-x-2 pr-3">
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={clearSearch}
                        className="text-text-secondary hover:text-text-primary transition-colors duration-200 p-1"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={isSearching || !searchQuery.trim()}
                      className="bg-primary text-white px-6 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                    >
                      {isSearching ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="hidden sm:inline">Searching...</span>
                        </>
                      ) : (
                        <>
                          <Search className="h-4 w-4" />
                          <span className="hidden sm:inline">Search</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>

              {/* Search Error */}
              {searchError && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700">{searchError}</p>
                </div>
              )}
            </div>

            {/* Search Results */}
            <div className="max-h-96 overflow-y-auto">
              {searchResults.length === 0 && searchQuery && !isSearching ? (
                <div className="px-6 py-8 text-center">
                  <Search className="h-12 w-12 text-text-secondary mx-auto mb-4" />
                  <p className="text-text-secondary">No receipts found matching your search.</p>
                </div>
              ) : searchResults.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {searchResults.map((result, index) => (
                    <div
                      key={result.id}
                      className="px-6 py-4 hover:bg-gray-50 transition-colors duration-200 cursor-pointer"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-3 mb-2">
                            <h4 className="text-base font-semibold text-text-primary truncate">
                              {result.title}
                            </h4>
                            <div className="flex items-center space-x-1 text-xs text-text-secondary bg-gray-100 px-2 py-1 rounded-full">
                              <span>Relevance:</span>
                              <span className="font-medium">{Math.round(result.relevanceScore * 100)}%</span>
                            </div>
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-4 text-sm text-text-secondary">
                            <div className="flex items-center space-x-1">
                              <Tag className="h-4 w-4" />
                              <span>{result.brand}</span>
                              {result.model && <span>• {result.model}</span>}
                            </div>
                            
                            <div className="flex items-center space-x-1">
                              <Calendar className="h-4 w-4" />
                              <span>{formatDate(result.purchaseDate)}</span>
                            </div>
                            
                            {result.amount && (
                              <div className="flex items-center space-x-1">
                                <DollarSign className="h-4 w-4" />
                                <span className="font-medium text-text-primary">
                                  {formatCurrency(result.amount)}
                                </span>
                              </div>
                            )}
                            
                            <div className="flex items-center space-x-1">
                              <Clock className="h-4 w-4" />
                              <span>Warranty: {result.warrantyPeriod}</span>
                            </div>
                          </div>
                        </div>
                        
                        <button className="ml-4 text-primary hover:text-primary/80 transition-colors duration-200">
                          <ChevronRight className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : searchQuery && !isSearching ? null : (
                <div className="px-6 py-8 text-center">
                  <Search className="h-12 w-12 text-text-secondary mx-auto mb-4" />
                  <p className="text-text-secondary">Enter a search term to find your receipts</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close menus */}
      {(showUserMenu || showNotificationMenu) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setShowUserMenu(false);
            setShowNotificationMenu(false);
          }}
        />
      )}
    </div>
  );
};

export default Dashboard;