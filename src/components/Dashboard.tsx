import React, { useState, useEffect } from 'react';
import { 
  Camera, 
  FolderOpen, 
  Search, 
  Bell, 
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
  Loader2,
  X,
  Edit3,
  Settings,
  Database,
  Trash2,
  RefreshCw
} from 'lucide-react';
import { signOut, getCurrentUser, supabase } from '../lib/supabase';

interface DashboardProps {
  onSignOut: () => void;
  onShowReceiptScanning: () => void;
  onShowProfile?: () => void;
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
  merchant: string;
  date: string;
  amount: number;
  items: number;
  product_description?: string;
  brand_name?: string;
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
  amount: number;
  warrantyPeriod: string;
  relevanceScore: number;
}

interface NotificationSettings {
  warranty_alerts: boolean;
  auto_system_update: boolean;
  marketing_notifications: boolean;
}

interface PrivacySettings {
  data_collection: boolean;
  data_analysis: 'allowed' | 'not_allowed';
  biometric_login: boolean;
  two_factor_auth: boolean;
}

const Dashboard: React.FC<DashboardProps> = ({ onSignOut, onShowReceiptScanning, onShowProfile }) => {
  const [user, setUser] = useState<any>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [alertsCount, setAlertsCount] = useState(3);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  const [showAccountSettings, setShowAccountSettings] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);

  // Settings states
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    warranty_alerts: true,
    auto_system_update: true,
    marketing_notifications: false
  });

  const [privacySettings, setPrivacySettings] = useState<PrivacySettings>({
    data_collection: true,
    data_analysis: 'allowed',
    biometric_login: false,
    two_factor_auth: false
  });

  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);

  // Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);

  // Dynamic data states
  const [summaryStats, setSummaryStats] = useState<SummaryStats>({
    receiptsScanned: 0,
    totalAmount: 0,
    itemsCaptured: 0,
    warrantiesClaimed: 0
  });

  const [recentReceipts, setRecentReceipts] = useState<RecentReceipt[]>([]);
  const [warrantyAlerts, setWarrantyAlerts] = useState<WarrantyAlert[]>([]);

  // Load user and initial data
  useEffect(() => {
    const loadUserAndData = async () => {
      try {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
        
        if (currentUser) {
          await loadDashboardData(currentUser.id);
          await loadUserSettings(currentUser.id);
          
          // Load profile picture if exists
          if (currentUser.user_metadata?.avatar_url) {
            const { data } = supabase.storage
              .from('profile-pictures')
              .getPublicUrl(currentUser.user_metadata.avatar_url);
            setProfilePicture(data.publicUrl);
          }
        }
      } catch (error) {
        console.error('Error loading user and data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUserAndData();

    // Update time every minute
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  // Set up real-time subscription for receipts
  useEffect(() => {
    if (!user) return;

    const subscription = supabase
      .channel('receipts_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'receipts',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Receipt change detected:', payload);
          // Reload dashboard data when receipts change
          loadDashboardData(user.id);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  const loadUserSettings = async (userId: string) => {
    try {
      // Load notification settings
      const { data: notifData, error: notifError } = await supabase
        .from('user_notification_settings')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (notifError) {
        console.error('Error loading notification settings:', notifError);
      } else if (notifData) {
        setNotificationSettings({
          warranty_alerts: notifData.warranty_alerts,
          auto_system_update: notifData.auto_system_update,
          marketing_notifications: notifData.marketing_notifications
        });
      }

      // Load privacy settings
      const { data: privacyData, error: privacyError } = await supabase
        .from('user_privacy_settings')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (privacyError) {
        console.error('Error loading privacy settings:', privacyError);
      } else if (privacyData) {
        setPrivacySettings({
          data_collection: privacyData.data_collection,
          data_analysis: privacyData.data_analysis,
          biometric_login: privacyData.biometric_login,
          two_factor_auth: privacyData.two_factor_auth
        });
      }
    } catch (error) {
      console.error('Error loading user settings:', error);
    }
  };

  const updateNotificationSettings = async (newSettings: Partial<NotificationSettings>) => {
    if (!user) return;

    setIsUpdatingSettings(true);
    try {
      const updatedSettings = { ...notificationSettings, ...newSettings };
      
      const { error } = await supabase
        .from('user_notification_settings')
        .upsert({
          user_id: user.id,
          ...updatedSettings
        });

      if (error) throw error;

      setNotificationSettings(updatedSettings);
    } catch (error) {
      console.error('Error updating notification settings:', error);
    } finally {
      setIsUpdatingSettings(false);
    }
  };

  const updatePrivacySettings = async (newSettings: Partial<PrivacySettings>) => {
    if (!user) return;

    setIsUpdatingSettings(true);
    try {
      const updatedSettings = { ...privacySettings, ...newSettings };
      
      const { error } = await supabase
        .from('user_privacy_settings')
        .upsert({
          user_id: user.id,
          ...updatedSettings
        });

      if (error) throw error;

      setPrivacySettings(updatedSettings);
    } catch (error) {
      console.error('Error updating privacy settings:', error);
    } finally {
      setIsUpdatingSettings(false);
    }
  };

  const handleDataManagementAction = async (action: 'backup' | 'clean_cache' | 'sync') => {
    if (!user) return;

    setIsUpdatingSettings(true);
    try {
      switch (action) {
        case 'backup':
          // Implement backup logic
          console.log('Backing up user data...');
          // You could create an edge function to handle data export
          break;
        case 'clean_cache':
          // Clear local storage and refresh
          localStorage.clear();
          sessionStorage.clear();
          window.location.reload();
          break;
        case 'sync':
          // Reload all user data
          await loadDashboardData(user.id);
          await loadUserSettings(user.id);
          break;
      }
    } catch (error) {
      console.error(`Error performing ${action}:`, error);
    } finally {
      setIsUpdatingSettings(false);
    }
  };

  const loadDashboardData = async (userId: string) => {
    try {
      // Fetch receipts data
      const { data: receipts, error } = await supabase
        .from('receipts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching receipts:', error);
        return;
      }

      // Calculate summary stats
      const stats = calculateSummaryStats(receipts || []);
      setSummaryStats(stats);

      // Format recent receipts
      const formattedReceipts = formatRecentReceipts(receipts || []);
      setRecentReceipts(formattedReceipts);

      // Generate warranty alerts
      const alerts = generateWarrantyAlerts(receipts || []);
      setWarrantyAlerts(alerts);
      setAlertsCount(alerts.filter(alert => alert.urgency === 'high').length);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  const handleSmartSearch = async () => {
    if (!searchQuery.trim() || !user) return;

    setIsSearching(true);

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/smart-search`;
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: searchQuery,
          userId: user.id
        })
      });

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();
      setSearchResults(data.results || []);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
  };

  const openSearchModal = () => {
    setShowSearchModal(true);
    setSearchResults([]);
    setSearchQuery('');
  };

  const closeSearchModal = () => {
    setShowSearchModal(false);
    clearSearch();
  };

  const calculateSummaryStats = (receipts: any[]): SummaryStats => {
    const totalAmount = receipts.reduce((sum, receipt) => {
      return sum + (parseFloat(receipt.amount) || 0);
    }, 0);

    return {
      receiptsScanned: receipts.length,
      totalAmount: totalAmount,
      itemsCaptured: receipts.length, // Assuming 1 item per receipt for now
      warrantiesClaimed: Math.floor(receipts.length * 0.1) // Mock calculation
    };
  };

  const formatRecentReceipts = (receipts: any[]): RecentReceipt[] => {
    return receipts.slice(0, 4).map(receipt => ({
      id: receipt.id,
      merchant: receipt.brand_name || 'Unknown Merchant',
      date: receipt.purchase_date,
      amount: parseFloat(receipt.amount) || 0,
      items: 1, // Assuming 1 item per receipt
      product_description: receipt.product_description,
      brand_name: receipt.brand_name
    }));
  };

  const generateWarrantyAlerts = (receipts: any[]): WarrantyAlert[] => {
    const alerts: WarrantyAlert[] = [];

    receipts.forEach(receipt => {
      const purchaseDate = new Date(receipt.purchase_date);
      const warrantyPeriod = receipt.warranty_period;
      
      // Calculate warranty expiry date
      let expiryDate = new Date(purchaseDate);
      
      if (warrantyPeriod.includes('year')) {
        const years = parseInt(warrantyPeriod.match(/\d+/)?.[0] || '1');
        expiryDate.setFullYear(expiryDate.getFullYear() + years);
      } else if (warrantyPeriod.includes('month')) {
        const months = parseInt(warrantyPeriod.match(/\d+/)?.[0] || '6');
        expiryDate.setMonth(expiryDate.getMonth() + months);
      }

      // Calculate days left
      const today = new Date();
      const daysLeft = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      // Only include future warranties
      if (daysLeft > 0) {
        let urgency: 'low' | 'medium' | 'high' = 'low';
        if (daysLeft <= 30) urgency = 'high';
        else if (daysLeft <= 90) urgency = 'medium';

        alerts.push({
          id: receipt.id,
          itemName: receipt.product_description || 'Unknown Item',
          purchaseDate: receipt.purchase_date,
          expiryDate: expiryDate.toISOString().split('T')[0],
          daysLeft,
          urgency
        });
      }
    });

    // Sort by urgency and days left
    return alerts.sort((a, b) => {
      const urgencyOrder = { high: 3, medium: 2, low: 1 };
      if (urgencyOrder[a.urgency] !== urgencyOrder[b.urgency]) {
        return urgencyOrder[b.urgency] - urgencyOrder[a.urgency];
      }
      return a.daysLeft - b.daysLeft;
    }).slice(0, 5); // Show top 5 alerts
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

  if (loading) {
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
              {/* Alerts */}
              <button className="relative p-2 text-text-secondary hover:text-text-primary transition-colors duration-200">
                <Bell className="h-6 w-6" />
                {alertsCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-accent-red text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                    {alertsCount}
                  </span>
                )}
              </button>

              {/* User Menu */}
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200 group"
                >
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-primary ring-2 ring-transparent group-hover:ring-primary/20 transition-all duration-200">
                    {profilePicture ? (
                      <img
                        src={profilePicture}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <User className="h-4 w-4 text-white" />
                      </div>
                    )}
                  </div>
                  <span className="text-sm font-medium text-text-primary hidden sm:inline group-hover:text-primary transition-colors duration-200 flex items-center space-x-1">
                    <span>{user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}</span>
                    <Edit3 className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                  </span>
                </button>

                {/* Enhanced User Dropdown */}
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-card border border-gray-200 py-2 z-50">
                    {/* User Info Header */}
                    <div className="px-4 py-3 border-b border-gray-200">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-primary">
                          {profilePicture ? (
                            <img
                              src={profilePicture}
                              alt="Profile"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <User className="h-5 w-5 text-white" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-text-primary truncate">
                            {user?.user_metadata?.full_name || 'User'}
                          </p>
                          <p className="text-xs text-text-secondary truncate">{user?.email}</p>
                        </div>
                      </div>
                    </div>

                    {/* Menu Items */}
                    <div className="py-1">
                      {onShowProfile && (
                        <button
                          onClick={() => {
                            onShowProfile();
                            setShowUserMenu(false);
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-text-secondary hover:bg-gray-100 hover:text-text-primary transition-colors duration-200 flex items-center space-x-3"
                        >
                          <User className="h-4 w-4" />
                          <div>
                            <div className="font-medium">Update Profile</div>
                            <div className="text-xs text-text-secondary">Change picture, name & email</div>
                          </div>
                        </button>
                      )}
                      
                      <button 
                        onClick={() => {
                          setShowAccountSettings(true);
                          setShowUserMenu(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-text-secondary hover:bg-gray-100 hover:text-text-primary transition-colors duration-200 flex items-center space-x-3"
                      >
                        <Settings className="h-4 w-4" />
                        <div>
                          <div className="font-medium">Account Settings</div>
                          <div className="text-xs text-text-secondary">Privacy & security</div>
                        </div>
                      </button>

                      <button 
                        onClick={() => {
                          setShowNotificationSettings(true);
                          setShowUserMenu(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-text-secondary hover:bg-gray-100 hover:text-text-primary transition-colors duration-200 flex items-center space-x-3"
                      >
                        <Bell className="h-4 w-4" />
                        <div>
                          <div className="font-medium">Notifications</div>
                          <div className="text-xs text-text-secondary">Manage alerts</div>
                        </div>
                      </button>
                    </div>

                    {/* Sign Out */}
                    <div className="border-t border-gray-200 pt-1">
                      <button
                        onClick={handleSignOut}
                        className="w-full text-left px-4 py-2 text-sm text-text-secondary hover:bg-gray-100 hover:text-text-primary transition-colors duration-200 flex items-center space-x-3"
                      >
                        <LogOut className="h-4 w-4" />
                        <span>Sign Out</span>
                      </button>
                    </div>
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

          <button className="group bg-gradient-to-br from-secondary to-purple-600 p-8 rounded-2xl shadow-card hover:shadow-card-hover transition-all duration-300 transform hover:-translate-y-2 text-white">
            <div className="flex flex-col items-center text-center">
              <div className="bg-white/20 rounded-full p-4 mb-4 group-hover:bg-white/30 transition-colors duration-300">
                <FolderOpen className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-bold mb-2">My Library</h3>
              <p className="text-white/90">Browse and organize your receipt collection</p>
            </div>
          </button>

          <button 
            onClick={openSearchModal}
            className="group bg-gradient-to-br from-accent-yellow to-yellow-500 p-8 rounded-2xl shadow-card hover:shadow-card-hover transition-all duration-300 transform hover:-translate-y-2 text-white"
          >
            <div className="flex flex-col items-center text-center">
              <div className="bg-white/20 rounded-full p-4 mb-4 group-hover:bg-white/30 transition-colors duration-300">
                <Search className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-bold mb-2">Smart Search</h3>
              <p className="text-white/90">Find receipts and items quickly with AI</p>
            </div>
          </button>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <div className="bg-white p-6 rounded-2xl shadow-card border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-gradient-to-br from-primary/10 to-primary/20 rounded-lg p-3">
                <Receipt className="h-6 w-6 text-primary" />
              </div>
            </div>
            <div className="text-3xl font-bold text-text-primary mb-1">
              {summaryStats.receiptsScanned}
            </div>
            <div className="text-sm text-text-secondary">Receipts Scanned</div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-card border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-gradient-to-br from-secondary/10 to-secondary/20 rounded-lg p-3">
                <DollarSign className="h-6 w-6 text-secondary" />
              </div>
            </div>
            <div className="text-3xl font-bold text-text-primary mb-1">
              {formatCurrency(summaryStats.totalAmount)}
            </div>
            <div className="text-sm text-text-secondary">Total Amount Captured</div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-card border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-gradient-to-br from-accent-yellow/10 to-accent-yellow/20 rounded-lg p-3">
                <Tag className="h-6 w-6 text-accent-yellow" />
              </div>
            </div>
            <div className="text-3xl font-bold text-text-primary mb-1">
              {summaryStats.itemsCaptured}
            </div>
            <div className="text-sm text-text-secondary">Items Captured</div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-card border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-gradient-to-br from-green-100 to-green-200 rounded-lg p-3">
                <Shield className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <div className="text-3xl font-bold text-text-primary mb-1">
              {summaryStats.warrantiesClaimed}
            </div>
            <div className="text-sm text-text-secondary">Warranties Claimed</div>
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

            {warrantyAlerts.length > 0 ? (
              <div className="space-y-4">
                {warrantyAlerts.map((alert) => (
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
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Shield className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-text-secondary">No warranty alerts at this time</p>
                <p className="text-sm text-text-secondary mt-2">Add receipts to track warranties</p>
              </div>
            )}

            <button className="w-full mt-4 text-center text-primary hover:text-primary/80 font-medium py-2 transition-colors duration-200">
              View All Warranties
            </button>
          </div>

          {/* Recent Receipts */}
          <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-text-primary">Recent Receipts</h2>
              <button className="text-primary hover:text-primary/80 font-medium transition-colors duration-200">
                View All
              </button>
            </div>

            {recentReceipts.length > 0 ? (
              <div className="space-y-4">
                {recentReceipts.map((receipt) => (
                  <div
                    key={receipt.id}
                    className="flex items-center justify-between p-4 rounded-lg hover:bg-gray-50 transition-colors duration-200 cursor-pointer group"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="bg-gradient-feature rounded-lg p-3">
                        <Receipt className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-bold text-text-primary group-hover:text-primary transition-colors duration-200">
                          {receipt.merchant}
                        </h3>
                        <div className="text-sm text-text-secondary">
                          {formatDate(receipt.date)} • {receipt.items} items
                        </div>
                        {receipt.product_description && (
                          <div className="text-xs text-text-secondary mt-1">
                            {receipt.product_description}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-text-primary">
                        {formatCurrency(receipt.amount)}
                      </div>
                      <ChevronRight className="h-4 w-4 text-text-secondary group-hover:text-primary transition-colors duration-200 ml-auto" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Receipt className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-text-secondary">No receipts yet</p>
                <p className="text-sm text-text-secondary mt-2">Start by scanning your first receipt</p>
                <button
                  onClick={onShowReceiptScanning}
                  className="mt-4 bg-primary text-white px-6 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors duration-200"
                >
                  Scan Receipt
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Notification Settings Modal */}
      {showNotificationSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-card max-w-2xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-text-primary">Notification Settings</h2>
              <button
                onClick={() => setShowNotificationSettings(false)}
                className="p-2 text-text-secondary hover:text-text-primary transition-colors duration-200"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Warranty Alerts */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <h3 className="font-medium text-text-primary">Warranty Alerts</h3>
                  <p className="text-sm text-text-secondary">Get notified before warranties expire</p>
                </div>
                <button
                  onClick={() => updateNotificationSettings({ warranty_alerts: !notificationSettings.warranty_alerts })}
                  disabled={isUpdatingSettings}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
                    notificationSettings.warranty_alerts ? 'bg-primary' : 'bg-gray-300'
                  } ${isUpdatingSettings ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                      notificationSettings.warranty_alerts ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Auto System Update */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <h3 className="font-medium text-text-primary">Auto System Update</h3>
                  <p className="text-sm text-text-secondary">Automatically update the app when new versions are available</p>
                </div>
                <button
                  onClick={() => updateNotificationSettings({ auto_system_update: !notificationSettings.auto_system_update })}
                  disabled={isUpdatingSettings}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
                    notificationSettings.auto_system_update ? 'bg-primary' : 'bg-gray-300'
                  } ${isUpdatingSettings ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                      notificationSettings.auto_system_update ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Marketing Notifications */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <h3 className="font-medium text-text-primary">Marketing Notifications</h3>
                  <p className="text-sm text-text-secondary">Receive updates about new features and promotions</p>
                </div>
                <button
                  onClick={() => updateNotificationSettings({ marketing_notifications: !notificationSettings.marketing_notifications })}
                  disabled={isUpdatingSettings}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
                    notificationSettings.marketing_notifications ? 'bg-primary' : 'bg-gray-300'
                  } ${isUpdatingSettings ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                      notificationSettings.marketing_notifications ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Account Settings Modal */}
      {showAccountSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-card max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-text-primary">Account Settings</h2>
              <button
                onClick={() => setShowAccountSettings(false)}
                className="p-2 text-text-secondary hover:text-text-primary transition-colors duration-200"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-8">
              {/* Privacy and Security Section */}
              <div>
                <h3 className="text-xl font-bold text-text-primary mb-4 flex items-center">
                  <Shield className="h-5 w-5 mr-2" />
                  Privacy and Security
                </h3>
                <div className="space-y-4">
                  {/* Data Collection */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <h4 className="font-medium text-text-primary">Data Collection</h4>
                      <p className="text-sm text-text-secondary">Allow collection of usage data to improve the service</p>
                    </div>
                    <button
                      onClick={() => updatePrivacySettings({ data_collection: !privacySettings.data_collection })}
                      disabled={isUpdatingSettings}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
                        privacySettings.data_collection ? 'bg-primary' : 'bg-gray-300'
                      } ${isUpdatingSettings ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                          privacySettings.data_collection ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Data Analysis */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <h4 className="font-medium text-text-primary">Data Analysis</h4>
                      <p className="text-sm text-text-secondary">Allow analysis of your data for personalized insights</p>
                    </div>
                    <select
                      value={privacySettings.data_analysis}
                      onChange={(e) => updatePrivacySettings({ data_analysis: e.target.value as 'allowed' | 'not_allowed' })}
                      disabled={isUpdatingSettings}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors duration-200 disabled:opacity-50"
                    >
                      <option value="allowed">Allowed</option>
                      <option value="not_allowed">Not Allowed</option>
                    </select>
                  </div>

                  {/* Biometric Login */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <h4 className="font-medium text-text-primary">Biometric Login</h4>
                      <p className="text-sm text-text-secondary">Use fingerprint or face recognition to sign in</p>
                    </div>
                    <button
                      onClick={() => updatePrivacySettings({ biometric_login: !privacySettings.biometric_login })}
                      disabled={isUpdatingSettings}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
                        privacySettings.biometric_login ? 'bg-primary' : 'bg-gray-300'
                      } ${isUpdatingSettings ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                          privacySettings.biometric_login ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Two Factor Authentication */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <h4 className="font-medium text-text-primary">Two Factor Authentication</h4>
                      <p className="text-sm text-text-secondary">Add an extra layer of security to your account</p>
                    </div>
                    <button
                      onClick={() => updatePrivacySettings({ two_factor_auth: !privacySettings.two_factor_auth })}
                      disabled={isUpdatingSettings}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
                        privacySettings.two_factor_auth ? 'bg-primary' : 'bg-gray-300'
                      } ${isUpdatingSettings ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                          privacySettings.two_factor_auth ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* Data Management Section */}
              <div>
                <h3 className="text-xl font-bold text-text-primary mb-4 flex items-center">
                  <Database className="h-5 w-5 mr-2" />
                  Data Management
                </h3>
                <div className="grid md:grid-cols-3 gap-4">
                  {/* Backup Data */}
                  <button
                    onClick={() => handleDataManagementAction('backup')}
                    disabled={isUpdatingSettings}
                    className="flex flex-col items-center p-6 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isUpdatingSettings ? (
                      <Loader2 className="h-8 w-8 text-primary animate-spin mb-3" />
                    ) : (
                      <Database className="h-8 w-8 text-primary mb-3" />
                    )}
                    <h4 className="font-medium text-text-primary mb-2">Backup Data</h4>
                    <p className="text-sm text-text-secondary text-center">Export your receipts and settings</p>
                  </button>

                  {/* Clean Cache */}
                  <button
                    onClick={() => handleDataManagementAction('clean_cache')}
                    disabled={isUpdatingSettings}
                    className="flex flex-col items-center p-6 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isUpdatingSettings ? (
                      <Loader2 className="h-8 w-8 text-accent-yellow animate-spin mb-3" />
                    ) : (
                      <Trash2 className="h-8 w-8 text-accent-yellow mb-3" />
                    )}
                    <h4 className="font-medium text-text-primary mb-2">Clean Cache</h4>
                    <p className="text-sm text-text-secondary text-center">Clear temporary files and data</p>
                  </button>

                  {/* Sync Now */}
                  <button
                    onClick={() => handleDataManagementAction('sync')}
                    disabled={isUpdatingSettings}
                    className="flex flex-col items-center p-6 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isUpdatingSettings ? (
                      <Loader2 className="h-8 w-8 text-secondary animate-spin mb-3" />
                    ) : (
                      <RefreshCw className="h-8 w-8 text-secondary mb-3" />
                    )}
                    <h4 className="font-medium text-text-primary mb-2">Sync Now</h4>
                    <p className="text-sm text-text-secondary text-center">Refresh all data from server</p>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search Modal */}
      {showSearchModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-card max-w-4xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-text-primary">Smart Search</h2>
              <button
                onClick={closeSearchModal}
                className="p-2 text-text-secondary hover:text-text-primary transition-colors duration-200"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Search Input */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-text-secondary" />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSmartSearch()}
                    placeholder="Find receipts by product, brand, or description..."
                    className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors duration-200"
                    autoFocus
                  />
                  {searchQuery && (
                    <button
                      onClick={clearSearch}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-secondary hover:text-text-primary transition-colors duration-200"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  )}
                </div>
                <button
                  onClick={handleSmartSearch}
                  disabled={!searchQuery.trim() || isSearching}
                  className="bg-primary text-white px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 whitespace-nowrap"
                >
                  {isSearching ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Searching...</span>
                    </>
                  ) : (
                    <>
                      <Search className="h-5 w-5" />
                      <span>Search</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Search Results */}
            <div className="p-6 max-h-96 overflow-y-auto">
              {searchResults.length > 0 ? (
                <div className="space-y-3">
                  <h3 className="text-lg font-bold text-text-primary mb-4">
                    Search Results ({searchResults.length})
                  </h3>
                  {searchResults.map((result) => (
                    <div
                      key={result.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200 cursor-pointer group"
                    >
                      <div className="flex items-center space-x-4 flex-1">
                        <div className="bg-primary/10 rounded-lg p-2">
                          <Receipt className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-text-primary group-hover:text-primary transition-colors duration-200 truncate">
                            {result.title}
                          </h4>
                          <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 text-sm text-text-secondary">
                            <span className="font-medium">{result.brand}</span>
                            {result.model && <span>Model: {result.model}</span>}
                            <span>{formatDate(result.purchaseDate)}</span>
                            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                              {result.warrantyPeriod}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right flex items-center space-x-3">
                        <div className="font-bold text-text-primary">
                          {formatCurrency(result.amount)}
                        </div>
                        <ChevronRight className="h-4 w-4 text-text-secondary group-hover:text-primary transition-colors duration-200" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : searchQuery && !isSearching ? (
                <div className="text-center py-8">
                  <Search className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-text-secondary">No receipts found matching your search</p>
                  <p className="text-sm text-text-secondary mt-2">
                    Try searching for product names, brands, or descriptions
                  </p>
                </div>
              ) : !searchQuery ? (
                <div className="text-center py-8">
                  <Search className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-text-secondary">Enter a search term to find your receipts</p>
                  <p className="text-sm text-text-secondary mt-2">
                    Search by product name, brand, model, or description
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

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