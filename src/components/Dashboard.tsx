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

const Dashboard: React.FC<DashboardProps> = ({ onSignOut, onShowReceiptScanning }) => {
  const [user, setUser] = useState<any>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [alertsCount, setAlertsCount] = useState(3);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [loading, setLoading] = useState(true);

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

              {/* Settings */}
              <button className="p-2 text-text-secondary hover:text-text-primary transition-colors duration-200">
                <Settings className="h-6 w-6" />
              </button>

              {/* User Menu */}
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200"
                >
                  <div className="bg-primary rounded-full p-2">
                    <User className="h-4 w-4 text-white" />
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

          <button className="group bg-gradient-to-br from-secondary to-purple-600 p-8 rounded-2xl shadow-card hover:shadow-card-hover transition-all duration-300 transform hover:-translate-y-2 text-white">
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