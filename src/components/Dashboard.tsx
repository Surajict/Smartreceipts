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
  Clock
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
  merchant: string;
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

const Dashboard: React.FC<DashboardProps> = ({ onSignOut, onShowReceiptScanning, onShowProfile, onShowLibrary }) => {
  const [user, setUser] = useState<any>(null);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [alertsCount, setAlertsCount] = useState(3);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotificationMenu, setShowNotificationMenu] = useState(false);

  // Mock data - in a real app, this would come from your database
  const [summaryStats] = useState<SummaryStats>({
    receiptsScanned: 152,
    totalAmount: 4320.50,
    itemsCaptured: 87,
    warrantiesClaimed: 12
  });

  const [warrantyAlerts] = useState<WarrantyAlert[]>([
    {
      id: '1',
      itemName: 'MacBook Pro 16"',
      purchaseDate: '2023-01-15',
      expiryDate: '2025-01-15',
      daysLeft: 45,
      urgency: 'medium'
    },
    {
      id: '2',
      itemName: 'Samsung 4K Monitor',
      purchaseDate: '2023-06-20',
      expiryDate: '2025-06-20',
      daysLeft: 180,
      urgency: 'low'
    },
    {
      id: '3',
      itemName: 'Canon EOS R5 Camera',
      purchaseDate: '2023-11-10',
      expiryDate: '2024-11-10',
      daysLeft: 15,
      urgency: 'high'
    }
  ]);

  const [recentReceipts] = useState<RecentReceipt[]>([
    {
      id: '1',
      merchant: 'Apple Store',
      date: '2024-01-15',
      amount: 2499.00,
      items: 3
    },
    {
      id: '2',
      merchant: 'Best Buy',
      date: '2024-01-12',
      amount: 899.99,
      items: 2
    },
    {
      id: '3',
      merchant: 'Amazon',
      date: '2024-01-10',
      amount: 156.78,
      items: 5
    },
    {
      id: '4',
      merchant: 'Target',
      date: '2024-01-08',
      amount: 89.45,
      items: 8
    }
  ]);

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
    };
    loadUser();

    // Update time every minute
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

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
                      {warrantyAlerts.slice(0, 3).map((alert) => (
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
                      ))}
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

          <button className="group bg-gradient-to-br from-accent-yellow to-yellow-500 p-8 rounded-2xl shadow-card hover:shadow-card-hover transition-all duration-300 transform hover:-translate-y-2 text-white">
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
          </div>
        </div>
      </main>

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