import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Camera, 
  Filter, 
  SortAsc, 
  Search, 
  Bell, 
  Calendar,
  DollarSign,
  Tag,
  MapPin,
  Store,
  ChevronDown,
  X,
  AlertTriangle,
  CheckCircle,
  Clock,
  Receipt,
  Edit3,
  Trash2,
  Eye
} from 'lucide-react';
import { supabase, getCurrentUser } from '../lib/supabase';

interface MyLibraryProps {
  onBackToDashboard: () => void;
  onShowReceiptScanning: () => void;
}

interface ReceiptData {
  id: string;
  user_id: string;
  purchase_date: string;
  country: string;
  product_description: string;
  brand_name: string;
  model_number?: string;
  warranty_period: string;
  extended_warranty?: string;
  amount?: number;
  image_path?: string;
  store_name?: string;
  purchase_location?: string;
  created_at: string;
  updated_at: string;
}

interface FilterState {
  brands: string[];
  categories: string[];
  warrantyStatus: string[];
  priceRange: { min: number; max: number };
}

type SortOption = 'value-desc' | 'value-asc' | 'brand-asc' | 'warranty-expiry' | 'date-desc' | 'date-asc';

const MyLibrary: React.FC<MyLibraryProps> = ({ onBackToDashboard, onShowReceiptScanning }) => {
  const [receipts, setReceipts] = useState<ReceiptData[]>([]);
  const [filteredReceipts, setFilteredReceipts] = useState<ReceiptData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [alertsCount] = useState(3);
  
  // Filter and sort states
  const [filters, setFilters] = useState<FilterState>({
    brands: [],
    categories: [],
    warrantyStatus: [],
    priceRange: { min: 0, max: 10000 }
  });
  
  const [sortBy, setSortBy] = useState<SortOption>('date-desc');
  
  // Available filter options
  const categories = ['Electronics', 'Automobile', 'Home Appliances', 'Fashion', 'Miscellaneous'];
  const warrantyStatusOptions = [
    { value: 'expiring-3m', label: 'Expiring in next 3 months' },
    { value: 'expiring-6m', label: 'Expiring in next 6 months' },
    { value: 'expired', label: 'Already expired' },
    { value: 'active', label: 'Active warranties' }
  ];
  
  const sortOptions = [
    { value: 'value-desc', label: 'By product value (Highest to lowest)' },
    { value: 'value-asc', label: 'By product value (Lowest to highest)' },
    { value: 'brand-asc', label: 'By brand (A-Z)' },
    { value: 'warranty-expiry', label: 'By nearest warranty expiry date' },
    { value: 'date-desc', label: 'By date added (Newest first)' },
    { value: 'date-asc', label: 'By date added (Oldest first)' }
  ];

  useEffect(() => {
    loadReceipts();
  }, []);

  useEffect(() => {
    applyFiltersAndSort();
  }, [receipts, filters, sortBy, searchQuery]);

  const loadReceipts = async () => {
    try {
      setLoading(true);
      const user = await getCurrentUser();
      
      if (!user) {
        setError('User not authenticated');
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('receipts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      setReceipts(data || []);
    } catch (err: any) {
      console.error('Error loading receipts:', err);
      setError(err.message || 'Failed to load receipts');
    } finally {
      setLoading(false);
    }
  };

  const applyFiltersAndSort = () => {
    let filtered = [...receipts];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(receipt => 
        receipt.product_description.toLowerCase().includes(query) ||
        receipt.brand_name.toLowerCase().includes(query) ||
        receipt.model_number?.toLowerCase().includes(query) ||
        receipt.store_name?.toLowerCase().includes(query) ||
        receipt.purchase_location?.toLowerCase().includes(query)
      );
    }

    // Apply brand filter
    if (filters.brands.length > 0) {
      filtered = filtered.filter(receipt => 
        filters.brands.includes(receipt.brand_name)
      );
    }

    // Apply category filter (simplified - would need category field in database)
    if (filters.categories.length > 0) {
      // For now, categorize based on product description keywords
      filtered = filtered.filter(receipt => {
        const description = receipt.product_description.toLowerCase();
        return filters.categories.some(category => {
          switch (category) {
            case 'Electronics':
              return description.includes('phone') || description.includes('laptop') || 
                     description.includes('camera') || description.includes('tv') ||
                     description.includes('computer') || description.includes('tablet');
            case 'Automobile':
              return description.includes('car') || description.includes('auto') || 
                     description.includes('vehicle') || description.includes('tire');
            case 'Home Appliances':
              return description.includes('refrigerator') || description.includes('washer') || 
                     description.includes('dryer') || description.includes('microwave') ||
                     description.includes('dishwasher') || description.includes('oven');
            case 'Fashion':
              return description.includes('shirt') || description.includes('shoes') || 
                     description.includes('dress') || description.includes('jacket') ||
                     description.includes('clothing') || description.includes('apparel');
            default:
              return true;
          }
        });
      });
    }

    // Apply warranty status filter
    if (filters.warrantyStatus.length > 0) {
      filtered = filtered.filter(receipt => {
        const warrantyExpiry = calculateWarrantyExpiry(receipt.purchase_date, receipt.warranty_period);
        const daysUntilExpiry = Math.ceil((warrantyExpiry.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
        
        return filters.warrantyStatus.some(status => {
          switch (status) {
            case 'expiring-3m':
              return daysUntilExpiry > 0 && daysUntilExpiry <= 90;
            case 'expiring-6m':
              return daysUntilExpiry > 0 && daysUntilExpiry <= 180;
            case 'expired':
              return daysUntilExpiry <= 0;
            case 'active':
              return daysUntilExpiry > 0;
            default:
              return true;
          }
        });
      });
    }

    // Apply price range filter
    filtered = filtered.filter(receipt => {
      const amount = receipt.amount || 0;
      return amount >= filters.priceRange.min && amount <= filters.priceRange.max;
    });

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'value-desc':
          return (b.amount || 0) - (a.amount || 0);
        case 'value-asc':
          return (a.amount || 0) - (b.amount || 0);
        case 'brand-asc':
          return a.brand_name.localeCompare(b.brand_name);
        case 'warranty-expiry':
          const expiryA = calculateWarrantyExpiry(a.purchase_date, a.warranty_period);
          const expiryB = calculateWarrantyExpiry(b.purchase_date, b.warranty_period);
          return expiryA.getTime() - expiryB.getTime();
        case 'date-asc':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'date-desc':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

    setFilteredReceipts(filtered);
  };

  const calculateWarrantyExpiry = (purchaseDate: string, warrantyPeriod: string): Date => {
    const purchase = new Date(purchaseDate);
    const period = warrantyPeriod.toLowerCase();
    
    if (period.includes('lifetime')) {
      return new Date('2099-12-31'); // Far future date for lifetime warranty
    }
    
    const years = period.match(/(\d+)\s*year/);
    const months = period.match(/(\d+)\s*month/);
    
    if (years) {
      purchase.setFullYear(purchase.getFullYear() + parseInt(years[1]));
    } else if (months) {
      purchase.setMonth(purchase.getMonth() + parseInt(months[1]));
    }
    
    return purchase;
  };

  const getWarrantyStatus = (purchaseDate: string, warrantyPeriod: string) => {
    const expiry = calculateWarrantyExpiry(purchaseDate, warrantyPeriod);
    const daysUntilExpiry = Math.ceil((expiry.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry <= 0) {
      return { status: 'expired', color: 'text-accent-red bg-red-50 border-red-200', icon: AlertTriangle };
    } else if (daysUntilExpiry <= 30) {
      return { status: 'expiring-soon', color: 'text-accent-red bg-red-50 border-red-200', icon: AlertTriangle };
    } else if (daysUntilExpiry <= 90) {
      return { status: 'expiring-medium', color: 'text-accent-yellow bg-yellow-50 border-yellow-200', icon: Clock };
    } else {
      return { status: 'active', color: 'text-green-600 bg-green-50 border-green-200', icon: CheckCircle };
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

  const clearFilters = () => {
    setFilters({
      brands: [],
      categories: [],
      warrantyStatus: [],
      priceRange: { min: 0, max: 10000 }
    });
    setSearchQuery('');
  };

  const toggleFilter = (type: keyof FilterState, value: string) => {
    setFilters(prev => ({
      ...prev,
      [type]: prev[type].includes(value) 
        ? prev[type].filter(item => item !== value)
        : [...prev[type], value]
    }));
  };

  // Get unique brands from receipts
  const availableBrands = [...new Set(receipts.map(r => r.brand_name))].sort();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-text-secondary">Loading your receipt library...</p>
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

              {/* Filter Button */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                  showFilters 
                    ? 'bg-primary text-white' 
                    : 'bg-white text-text-primary border-2 border-gray-300 hover:border-primary'
                }`}
              >
                <Filter className="h-4 w-4" />
                <span className="hidden sm:inline">Filter</span>
              </button>

              {/* Sort Button */}
              <div className="relative">
                <button
                  onClick={() => setShowSortMenu(!showSortMenu)}
                  className="flex items-center space-x-2 bg-white text-text-primary border-2 border-gray-300 hover:border-primary px-4 py-2 rounded-lg font-medium transition-all duration-200"
                >
                  <SortAsc className="h-4 w-4" />
                  <span className="hidden sm:inline">Sort</span>
                  <ChevronDown className="h-4 w-4" />
                </button>

                {/* Sort Dropdown */}
                {showSortMenu && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-card border border-gray-200 py-2 z-50">
                    {sortOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => {
                          setSortBy(option.value as SortOption);
                          setShowSortMenu(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-sm transition-colors duration-200 ${
                          sortBy === option.value
                            ? 'bg-primary text-white'
                            : 'text-text-secondary hover:bg-gray-100 hover:text-text-primary'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Scan New Receipt */}
              <button
                onClick={onShowReceiptScanning}
                className="bg-primary text-white px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-all duration-200 flex items-center space-x-2"
              >
                <Camera className="h-4 w-4" />
                <span className="hidden sm:inline">Scan New Receipt</span>
              </button>

              {/* Back to Dashboard */}
              <button
                onClick={onBackToDashboard}
                className="flex items-center space-x-2 bg-white text-primary border-2 border-primary px-4 py-2 rounded-lg font-medium hover:bg-primary hover:text-white transition-all duration-200"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Back to Dashboard</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-4">
            My Receipt Library
          </h1>
          <p className="text-xl text-text-secondary">
            {filteredReceipts.length} of {receipts.length} receipts
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative max-w-2xl mx-auto">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-text-secondary" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-3 py-4 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors duration-200 text-lg"
              placeholder="Search receipts by product, brand, store, or location..."
            />
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-text-primary">Filters</h3>
              <div className="flex items-center space-x-4">
                <button
                  onClick={clearFilters}
                  className="text-text-secondary hover:text-text-primary transition-colors duration-200 text-sm"
                >
                  Clear All
                </button>
                <button
                  onClick={() => setShowFilters(false)}
                  className="text-text-secondary hover:text-text-primary transition-colors duration-200"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Brand Filter */}
              <div>
                <h4 className="font-medium text-text-primary mb-3">Brand</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {availableBrands.map((brand) => (
                    <label key={brand} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filters.brands.includes(brand)}
                        onChange={() => toggleFilter('brands', brand)}
                        className="rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <span className="text-sm text-text-secondary">{brand}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Category Filter */}
              <div>
                <h4 className="font-medium text-text-primary mb-3">Category</h4>
                <div className="space-y-2">
                  {categories.map((category) => (
                    <label key={category} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filters.categories.includes(category)}
                        onChange={() => toggleFilter('categories', category)}
                        className="rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <span className="text-sm text-text-secondary">{category}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Warranty Status Filter */}
              <div>
                <h4 className="font-medium text-text-primary mb-3">Warranty Status</h4>
                <div className="space-y-2">
                  {warrantyStatusOptions.map((option) => (
                    <label key={option.value} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filters.warrantyStatus.includes(option.value)}
                        onChange={() => toggleFilter('warrantyStatus', option.value)}
                        className="rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <span className="text-sm text-text-secondary">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Price Range Filter */}
              <div>
                <h4 className="font-medium text-text-primary mb-3">Price Range</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-text-secondary mb-1">Min Price</label>
                    <input
                      type="number"
                      value={filters.priceRange.min}
                      onChange={(e) => setFilters(prev => ({
                        ...prev,
                        priceRange: { ...prev.priceRange, min: Number(e.target.value) }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-text-secondary mb-1">Max Price</label>
                    <input
                      type="number"
                      value={filters.priceRange.max}
                      onChange={(e) => setFilters(prev => ({
                        ...prev,
                        priceRange: { ...prev.priceRange, max: Number(e.target.value) }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                      placeholder="10000"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Receipt Grid */}
        {filteredReceipts.length === 0 ? (
          <div className="text-center py-16">
            <Receipt className="h-16 w-16 text-text-secondary mx-auto mb-4" />
            <h3 className="text-xl font-bold text-text-primary mb-2">
              {receipts.length === 0 ? 'No receipts yet' : 'No receipts match your filters'}
            </h3>
            <p className="text-text-secondary mb-6">
              {receipts.length === 0 
                ? 'Start by scanning your first receipt to build your digital library.'
                : 'Try adjusting your search or filter criteria to find more receipts.'
              }
            </p>
            <button
              onClick={onShowReceiptScanning}
              className="bg-primary text-white px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors duration-200 flex items-center space-x-2 mx-auto"
            >
              <Camera className="h-5 w-5" />
              <span>Scan Your First Receipt</span>
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredReceipts.map((receipt) => {
              const warrantyStatus = getWarrantyStatus(receipt.purchase_date, receipt.warranty_period);
              const StatusIcon = warrantyStatus.icon;
              
              return (
                <div
                  key={receipt.id}
                  className="bg-white rounded-2xl shadow-card border border-gray-100 p-6 hover:shadow-card-hover transition-all duration-300 transform hover:-translate-y-1 group"
                >
                  {/* Receipt Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="font-bold text-text-primary text-lg mb-1 group-hover:text-primary transition-colors duration-200">
                        {receipt.product_description}
                      </h3>
                      <p className="text-text-secondary text-sm">
                        {receipt.brand_name}
                        {receipt.model_number && ` • ${receipt.model_number}`}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button className="text-text-secondary hover:text-primary transition-colors duration-200">
                        <Eye className="h-4 w-4" />
                      </button>
                      <button className="text-text-secondary hover:text-primary transition-colors duration-200">
                        <Edit3 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Receipt Details */}
                  <div className="space-y-3 mb-4">
                    {receipt.store_name && (
                      <div className="flex items-center space-x-2 text-sm">
                        <Store className="h-4 w-4 text-text-secondary" />
                        <span className="text-text-secondary">{receipt.store_name}</span>
                      </div>
                    )}
                    
                    {receipt.purchase_location && (
                      <div className="flex items-center space-x-2 text-sm">
                        <MapPin className="h-4 w-4 text-text-secondary" />
                        <span className="text-text-secondary">{receipt.purchase_location}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center space-x-2 text-sm">
                      <Calendar className="h-4 w-4 text-text-secondary" />
                      <span className="text-text-secondary">
                        Purchased: {formatDate(receipt.purchase_date)}
                      </span>
                    </div>
                    
                    {receipt.amount && (
                      <div className="flex items-center space-x-2 text-sm">
                        <DollarSign className="h-4 w-4 text-text-secondary" />
                        <span className="font-medium text-text-primary">
                          {formatCurrency(receipt.amount)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Warranty Status */}
                  <div className={`flex items-center space-x-2 p-3 rounded-lg border ${warrantyStatus.color} mb-4`}>
                    <StatusIcon className="h-4 w-4" />
                    <div className="flex-1">
                      <div className="text-sm font-medium">
                        Warranty: {receipt.warranty_period}
                        {receipt.extended_warranty && ` + ${receipt.extended_warranty}`}
                      </div>
                      <div className="text-xs opacity-75">
                        Expires: {formatDate(calculateWarrantyExpiry(receipt.purchase_date, receipt.warranty_period).toISOString())}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <button className="text-primary hover:text-primary/80 font-medium text-sm transition-colors duration-200">
                      View Details
                    </button>
                    <div className="flex items-center space-x-2">
                      <button className="text-text-secondary hover:text-accent-red transition-colors duration-200">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Click outside to close dropdowns */}
      {(showSortMenu || showFilters) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setShowSortMenu(false);
            setShowFilters(false);
          }}
        />
      )}
    </div>
  );
};

export default MyLibrary;