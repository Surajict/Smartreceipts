import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Search, 
  Filter, 
  Calendar, 
  Clock, 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  MapPin,
  Store,
  Tag,
  Package,
  Info,
  ChevronDown,
  ChevronUp,
  SortAsc,
  SortDesc,
  User,
  FileText,
  Bell,
  LogOut,
  Settings
} from 'lucide-react';
import { getReceiptImageSignedUrl, supabase, signOut } from '../lib/supabase';
import { useUser } from '../contexts/UserContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import { MultiProductReceiptService } from '../services/multiProductReceiptService';
import { useLocation } from 'react-router-dom';
import Footer from './Footer';
import NotificationDropdown from './NotificationDropdown';
import { useTheme } from '../contexts/ThemeContext';
import { Moon, Sun } from 'lucide-react';
import PDFViewer from './PDFViewer';

interface WarrantyPageProps {
  onBackToDashboard: () => void;
  onShowProfile?: () => void;
}

interface WarrantyItem {
  id: string;
  itemName: string;
  brandName: string;
  modelNumber: string;
  purchaseDate: string;
  expiryDate: string;
  daysLeft: number;
  urgency: 'low' | 'medium' | 'high' | 'critical' | 'expired';
  warrantyPeriod: string;
  storeName: string;
  purchaseLocation: string;
  amount: number;
  country: string;
  extendedWarranty: string;
  imageUrl: string;
}

type FilterType = 'all' | 'active' | 'expiring' | 'expired';
type SortType = 'daysLeft' | 'purchaseDate' | 'itemName' | 'amount';

const WarrantyPage: React.FC<WarrantyPageProps> = ({ onBackToDashboard, onShowProfile }) => {
  const { user, profilePicture } = useUser();
  const { theme, toggleTheme } = useTheme();
  const { subscriptionInfo } = useSubscription();
  const [warrantyItems, setWarrantyItems] = useState<WarrantyItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<WarrantyItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [sortType, setSortType] = useState<SortType>('daysLeft');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showFilters, setShowFilters] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [showUserMenu, setShowUserMenu] = useState(false);
  const location = useLocation();
  const selectedId = location.state?.id;

  // Add PDF detection utility function
  const isPdfFile = (url: string): boolean => {
    if (!url) return false;
    const lowerUrl = url.toLowerCase();
    return lowerUrl.includes('.pdf') || 
           lowerUrl.includes('application/pdf') ||
           lowerUrl.includes('content-type=application/pdf') ||
           lowerUrl.includes('mimetype=application/pdf');
  };



  useEffect(() => {
    if (user) {
      loadWarrantyData(user.id);
        }
  }, [user]);

  useEffect(() => {
    applyFiltersAndSort();
  }, [warrantyItems, searchQuery, filterType, sortType, sortOrder]);

  // Add this effect to filter by selectedId if present
  useEffect(() => {
    if (selectedId && warrantyItems.length > 0) {
      setFilteredItems(warrantyItems.filter(item => item.id === selectedId));
    }
  }, [selectedId, warrantyItems]);

  const loadWarrantyData = async (userId: string) => {
    try {
      setIsLoading(true);
      
      // Load grouped receipts using the service
      const groupedReceipts = await MultiProductReceiptService.getGroupedReceipts(userId);
      
      // Flatten all receipts (including grouped ones)
      const allReceipts = groupedReceipts.flatMap(receipt => {
        if (receipt.type === 'group') {
          return receipt.receipts;
        } else {
          return [receipt];
        }
      });

      // Process into warranty items
      const items: WarrantyItem[] = await Promise.all(
        allReceipts
          .filter(receipt => receipt.purchase_date) // Only items with purchase dates
          .map(async receipt => {
            // Use enhanced warranty period detection for electronics
            let warrantyPeriod = receipt.warranty_period;
            if (!warrantyPeriod || warrantyPeriod.trim() === '') {
              warrantyPeriod = getDefaultWarrantyPeriod(receipt.product_description, receipt.brand_name);
            }
            
            const warrantyExpiry = calculateWarrantyExpiry(receipt.purchase_date, warrantyPeriod);
            const daysLeft = Math.ceil((warrantyExpiry.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
            
            // Generate signed URL for image
            let signedUrl = '';
            if (receipt.image_url) {
              signedUrl = (await getReceiptImageSignedUrl(receipt.image_url)) || '';
            }

            return {
              id: receipt.id,
              itemName: receipt.product_description || 'Unknown Product',
              brandName: receipt.brand_name || 'Unknown Brand',
              modelNumber: receipt.model_number || 'N/A',
              purchaseDate: receipt.purchase_date,
              expiryDate: warrantyExpiry.toISOString().split('T')[0],
              daysLeft,
              urgency: daysLeft < 0 ? 'expired' : daysLeft <= 7 ? 'critical' : daysLeft <= 30 ? 'high' : daysLeft <= 90 ? 'medium' : 'low',
              warrantyPeriod: warrantyPeriod,
              storeName: receipt.store_name || 'Unknown Store',
              purchaseLocation: receipt.purchase_location || 'Unknown Location',
              amount: receipt.amount || 0,
              country: receipt.country || 'Unknown Country',
              extendedWarranty: receipt.extended_warranty || 'None',
              imageUrl: signedUrl
            };
          })
      );

      setWarrantyItems(items);
    } catch (error) {
      console.error('Error loading warranty data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateWarrantyExpiry = (purchaseDate: string, warrantyPeriod: string): Date => {
    const purchase = new Date(purchaseDate);
    
    if (!warrantyPeriod || warrantyPeriod.trim() === '') {
      purchase.setFullYear(purchase.getFullYear() + 1);
      return purchase;
    }
    
    const period = warrantyPeriod.toLowerCase();
    
    if (period.includes('lifetime')) {
      return new Date('2099-12-31');
    }
    
    // Extract years
    const years = period.match(/(\d+)\s*year/);
    if (years) {
      purchase.setFullYear(purchase.getFullYear() + parseInt(years[1]));
      return purchase;
    }
    
    // Extract months
    const months = period.match(/(\d+)\s*month/);
    if (months) {
      purchase.setMonth(purchase.getMonth() + parseInt(months[1]));
      return purchase;
    }
    
    // Extract days (THIS WAS MISSING!)
    const days = period.match(/(\d+)\s*day/);
    if (days) {
      purchase.setDate(purchase.getDate() + parseInt(days[1]));
      return purchase;
    }
    
    // Default to 1 year if no specific period found
    purchase.setFullYear(purchase.getFullYear() + 1);
    return purchase;
  };

  const getDefaultWarrantyPeriod = (productDescription: string, brandName: string): string => {
    if (!productDescription && !brandName) return '1 year';
    
    const text = `${productDescription} ${brandName}`.toLowerCase();
    
    // Gaming consoles
    if (text.includes('nintendo') || text.includes('xbox') || text.includes('playstation') || 
        text.includes('switch') || text.includes('ps5') || text.includes('ps4')) {
      return '1 year';
    }
    
    // Computers and tablets
    if (text.includes('surface') || text.includes('macbook') || text.includes('ipad') || 
        text.includes('laptop') || text.includes('computer') || text.includes('tablet')) {
      return '1 year';
    }
    
    // Drones and cameras
    if (text.includes('dji') || text.includes('drone') || text.includes('camera') || 
        text.includes('gopro')) {
      return '1 year';
    }
    
    // Electronics
    if (text.includes('tv') || text.includes('microwave') || text.includes('appliance') || 
        text.includes('electronic') || text.includes('device')) {
      return '1 year';
    }
    
    return '1 year';
  };

  const applyFiltersAndSort = () => {
    let filtered = [...warrantyItems];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        item.itemName.toLowerCase().includes(query) ||
        item.brandName.toLowerCase().includes(query) ||
        item.storeName.toLowerCase().includes(query) ||
        item.modelNumber.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (filterType !== 'all') {
      filtered = filtered.filter(item => {
        switch (filterType) {
          case 'active':
            return item.daysLeft > 90;
          case 'expiring':
            return item.daysLeft >= 0 && item.daysLeft <= 90; // Includes critical items
          case 'expired':
            return item.daysLeft < 0;
          default:
            return true;
        }
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortType) {
        case 'daysLeft':
          aValue = a.daysLeft;
          bValue = b.daysLeft;
          break;
        case 'purchaseDate':
          aValue = new Date(a.purchaseDate).getTime();
          bValue = new Date(b.purchaseDate).getTime();
          break;
        case 'itemName':
          aValue = a.itemName.toLowerCase();
          bValue = b.itemName.toLowerCase();
          break;
        case 'amount':
          aValue = a.amount;
          bValue = b.amount;
          break;
        default:
          aValue = a.daysLeft;
          bValue = b.daysLeft;
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredItems(filtered);
  };

  const toggleItemExpansion = (itemId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high':
        return 'border-red-200 bg-red-50';
      case 'medium':
        return 'border-yellow-200 bg-yellow-50';
      case 'critical':
        return 'border-red-600 bg-red-100';
      case 'expired':
        return 'border-gray-200 bg-gray-50';
      default:
        return 'border-green-200 bg-green-50';
    }
  };

  const getUrgencyIcon = (urgency: string) => {
    switch (urgency) {
      case 'high':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'medium':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'critical':
        return <AlertTriangle className="h-5 w-5 text-red-600 animate-pulse" />;
      case 'expired':
        return <XCircle className="h-5 w-5 text-gray-500" />;
      default:
        return <CheckCircle className="h-5 w-5 text-green-500" />;
    }
  };

  const getStatusBadge = (item: WarrantyItem) => {
    if (item.daysLeft < 0) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          Expired
        </span>
      );
    } else if (item.daysLeft <= 7) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 animate-pulse">
          🚨 Critical
        </span>
      );
    } else if (item.daysLeft <= 30) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          Expires Soon
        </span>
      );
    } else if (item.daysLeft <= 90) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          Expiring
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          Active
        </span>
      );
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getFilterCounts = () => {
    return {
      all: warrantyItems.length,
      active: warrantyItems.filter(item => item.daysLeft > 90).length,
      expiring: warrantyItems.filter(item => item.daysLeft >= 0 && item.daysLeft <= 90).length,
      expired: warrantyItems.filter(item => item.daysLeft < 0).length
    };
  };

  const filterCounts = getFilterCounts();

  const handleSignOut = async () => {
    try {
      await signOut();
      window.location.href = '/';
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-text-secondary">Loading warranty information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white shadow-card border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8">
          <div className="flex justify-between items-center h-16 min-w-0">
            {/* Logo - Clickable to Dashboard */}
            <button 
              onClick={onBackToDashboard}
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
                        onError={() => {}}
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
                        onShowProfile ? onShowProfile() : onBackToDashboard();
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

      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-6 sm:py-8 pt-20 sm:pt-24">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-text-primary mb-2">
              Warranty Management
            </h1>
            <div className="flex items-center space-x-4 text-text-secondary">
              <div className="flex items-center space-x-2">
                <Shield className="h-5 w-5 text-primary" />
                <span>
                  {filteredItems.length} of {warrantyItems.length} items
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filter Controls */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-3 sm:space-y-4 lg:space-y-0">
            {/* Search */}
            <div className="flex-1 lg:max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-text-secondary" />
                <input
                  type="text"
                  placeholder="Search items, brands, or stores..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>

            {/* Filter and Sort Controls */}
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200"
              >
                <Filter className="h-4 w-4" />
                <span>Filters</span>
                {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Status Filter */}
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">Filter by Status</label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { key: 'all', label: 'All', count: filterCounts.all },
                      { key: 'active', label: 'Active', count: filterCounts.active },
                      { key: 'expiring', label: 'Expiring', count: filterCounts.expiring },
                      { key: 'expired', label: 'Expired', count: filterCounts.expired }
                    ].map(({ key, label, count }) => (
                      <button
                        key={key}
                        onClick={() => setFilterType(key as FilterType)}
                        className={`px-3 py-1 rounded-full text-sm font-medium transition-colors duration-200 ${
                          filterType === key
                            ? 'bg-primary text-white'
                            : 'bg-gray-100 text-text-secondary hover:bg-gray-200'
                        }`}
                      >
                        {label} ({count})
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sort Options */}
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">Sort by</label>
                  <div className="flex items-center space-x-2">
                    <select
                      value={sortType}
                      onChange={(e) => setSortType(e.target.value as SortType)}
                      className="px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      <option value="daysLeft">Days Left</option>
                      <option value="purchaseDate">Purchase Date</option>
                      <option value="itemName">Item Name</option>
                      <option value="amount">Amount</option>
                    </select>
                    <button
                      onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                      className="p-1 border border-gray-300 rounded hover:bg-gray-50 transition-colors duration-200"
                    >
                      {sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Warranty Items List */}
        {filteredItems.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <Shield className="h-12 w-12 text-text-secondary mx-auto mb-4" />
            <h3 className="text-lg font-medium text-text-primary mb-2">
              {searchQuery || filterType !== 'all' ? 'No items found' : 'No warranty items'}
            </h3>
            <p className="text-text-secondary">
              {searchQuery || filterType !== 'all' 
                ? 'Try adjusting your search or filter criteria' 
                : 'Start by scanning some receipts to track your warranties'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className={`bg-white rounded-lg shadow-sm border-2 ${getUrgencyColor(item.urgency)} transition-all duration-200 hover:shadow-md`}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        {getUrgencyIcon(item.urgency)}
                        <h3 className="text-lg font-bold text-text-primary">{item.itemName}</h3>
                        {getStatusBadge(item)}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                        <div>
                          <label className="block text-xs font-medium text-text-secondary mb-1">Brand</label>
                          <p className="text-sm text-text-primary">{item.brandName}</p>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-text-secondary mb-1">Model</label>
                          <p className="text-sm text-text-primary">{item.modelNumber}</p>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-text-secondary mb-1">Purchase Date</label>
                          <p className="text-sm text-text-primary">{formatDate(item.purchaseDate)}</p>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-text-secondary mb-1">Amount</label>
                          <p className="text-sm text-text-primary font-medium">{formatCurrency(item.amount)}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-6">
                          <div className="flex items-center space-x-2">
                            <Calendar className="h-4 w-4 text-text-secondary" />
                            <span className="text-sm text-text-secondary">
                              Expires: {formatDate(item.expiryDate)}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Clock className="h-4 w-4 text-text-secondary" />
                            <span className="text-sm text-text-secondary">
                              {item.daysLeft < 0 
                                ? `Expired ${Math.abs(item.daysLeft)} days ago`
                                : `${item.daysLeft} days remaining`
                              }
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => toggleItemExpansion(item.id)}
                          className="flex items-center space-x-1 text-primary hover:text-primary/80 transition-colors duration-200"
                        >
                          <Info className="h-4 w-4" />
                          <span className="text-sm">Details</span>
                          {expandedItems.has(item.id) ? 
                            <ChevronUp className="h-4 w-4" /> : 
                            <ChevronDown className="h-4 w-4" />
                          }
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {expandedItems.has(item.id) && (
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div>
                          <h4 className="font-medium text-text-primary mb-3 flex items-center">
                            <Store className="h-4 w-4 mr-2" />
                            Purchase Information
                          </h4>
                          <div className="space-y-2">
                            <div>
                              <label className="block text-xs font-medium text-text-secondary mb-1">Store</label>
                              <p className="text-sm text-text-primary">{item.storeName}</p>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-text-secondary mb-1">Location</label>
                              <p className="text-sm text-text-primary">{item.purchaseLocation}</p>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-text-secondary mb-1">Country</label>
                              <p className="text-sm text-text-primary">{item.country}</p>
                            </div>
                          </div>
                        </div>

                        <div>
                          <h4 className="font-medium text-text-primary mb-3 flex items-center">
                            <Shield className="h-4 w-4 mr-2" />
                            Warranty Details
                          </h4>
                          <div className="space-y-2">
                            <div>
                              <label className="block text-xs font-medium text-text-secondary mb-1">Warranty Period</label>
                              <p className="text-sm text-text-primary">{item.warrantyPeriod}</p>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-text-secondary mb-1">Extended Warranty</label>
                              <p className="text-sm text-text-primary">{item.extendedWarranty}</p>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-text-secondary mb-1">Status</label>
                              <div className="flex items-center space-x-2">
                                {getUrgencyIcon(item.urgency)}
                                <span className="text-sm text-text-primary capitalize">{item.urgency}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div>
                          <h4 className="font-medium text-text-primary mb-3 flex items-center">
                            <Package className="h-4 w-4 mr-2" />
                            Product Details
                          </h4>
                          <div className="space-y-2">
                            <div>
                              <label className="block text-xs font-medium text-text-secondary mb-1">Full Name</label>
                              <p className="text-sm text-text-primary">{item.itemName}</p>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-text-secondary mb-1">Brand</label>
                              <p className="text-sm text-text-primary">{item.brandName}</p>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-text-secondary mb-1">Model Number</label>
                              <p className="text-sm text-text-primary">{item.modelNumber}</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {item.imageUrl && (
                        <div className="mt-6">
                          <h4 className="font-medium text-text-primary mb-3">Receipt Image</h4>
                          {isPdfFile(item.imageUrl) ? (
                            <PDFViewer
                              url={item.imageUrl}
                              alt="Receipt"
                              className="max-w-xs h-auto rounded-lg border border-gray-200 shadow-sm"
                            />
                          ) : (
                          <img
                            src={item.imageUrl}
                            alt="Receipt"
                            className="max-w-xs h-auto rounded-lg border border-gray-200 shadow-sm"
                          />
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
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

export default WarrantyPage; 