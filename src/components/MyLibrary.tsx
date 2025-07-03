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
  Eye,
  User,
  LogOut,
  Loader2,
  Image as ImageIcon,
  FileText,
  Download,
  ExternalLink
} from 'lucide-react';
import { 
  supabase, 
  getCurrentUser, 
  signOut, 
  getUserReceipts, 
  searchUserReceipts 
} from '../lib/supabase';

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
  image_url?: string;
  store_name?: string;
  purchase_location?: string;
  processing_method?: string;
  ocr_confidence?: number;
  extracted_text?: string;
  created_at: string;
  updated_at: string;
}

interface SearchResult {
  id: string;
  product_description: string;
  brand_name: string;
  store_name?: string;
  purchase_date: string;
  amount?: number;
  warranty_period: string;
  relevance_score: number;
}

interface FilterState {
  brands: string[];
  categories: string[];
  warrantyStatus: string[];
  priceRange: { min: number; max: number };
}

type SortOption = 'value-desc' | 'value-asc' | 'brand-asc' | 'warranty-expiry' | 'date-desc' | 'date-asc';

const MyLibrary: React.FC<MyLibraryProps> = ({ onBackToDashboard, onShowReceiptScanning }) => {
  const [user, setUser] = useState<any>(null);
  const [receipts, setReceipts] = useState<ReceiptData[]>([]);
  const [filteredReceipts, setFilteredReceipts] = useState<ReceiptData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptData | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
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
    loadUserAndReceipts();
  }, []);

  useEffect(() => {
    if (!showSearchResults) {
      applyFiltersAndSort();
    }
  }, [receipts, filters, sortBy, showSearchResults]);

  const loadUserAndReceipts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const currentUser = await getCurrentUser();
      
      if (!currentUser) {
        setError('User not authenticated');
        onBackToDashboard();
        return;
      }

      console.log('Loading receipts for user:', currentUser.id);
      setUser(currentUser);

      // Load receipts using the enhanced function
      const { data, error: fetchError } = await getUserReceipts(currentUser.id);

      if (fetchError) {
        console.error('Error loading receipts:', fetchError);
        throw new Error(fetchError.message);
      }

      console.log('Loaded receipts:', data?.length || 0);
      setReceipts(data || []);
      
      if (data && data.length === 0) {
        console.log('No receipts found for user');
      }

    } catch (err: any) {
      console.error('Error loading receipts:', err);
      setError(err.message || 'Failed to load receipts');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      window.location.href = '/';
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Enhanced search using the database function
  const performSearch = async (query: string) => {
    if (!query.trim() || !user) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    setIsSearching(true);
    setSearchError(null);

    try {
      console.log('Performing search for:', query);
      
      const { data, error } = await searchUserReceipts(user.id, query.trim(), 10);

      if (error) {
        throw new Error(error.message);
      }

      console.log('Search results:', data);
      setSearchResults(data || []);
      setShowSearchResults(true);
    } catch (err: any) {
      console.error('Search error:', err);
      setSearchError(err.message || 'Search failed. Please try again.');
      
      // Fallback to local search
      performLocalSearch(query);
    } finally {
      setIsSearching(false);
    }
  };

  // Fallback local search
  const performLocalSearch = (query: string) => {
    const localResults = receipts
      .filter(receipt => 
        receipt.product_description.toLowerCase().includes(query.toLowerCase()) ||
        receipt.brand_name.toLowerCase().includes(query.toLowerCase()) ||
        receipt.model_number?.toLowerCase().includes(query.toLowerCase()) ||
        receipt.store_name?.toLowerCase().includes(query.toLowerCase()) ||
        receipt.purchase_location?.toLowerCase().includes(query.toLowerCase()) ||
        receipt.extracted_text?.toLowerCase().includes(query.toLowerCase())
      )
      .slice(0, 10)
      .map(receipt => ({
        id: receipt.id,
        product_description: receipt.product_description,
        brand_name: receipt.brand_name,
        store_name: receipt.store_name,
        purchase_date: receipt.purchase_date,
        amount: receipt.amount,
        warranty_period: receipt.warranty_period,
        relevance_score: 0.7 // Mock score for local search
      }));

    setSearchResults(localResults);
    setShowSearchResults(true);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(searchQuery);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setShowSearchResults(false);
    setSearchError(null);
  };

  const applyFiltersAndSort = () => {
    let filtered = [...receipts];

    // Apply brand filter
    if (filters.brands.length > 0) {
      filtered = filtered.filter(receipt => 
        filters.brands.includes(receipt.brand_name)
      );
    }

    // Apply category filter (simplified - would need category field in database)
    if (filters.categories.length > 0) {
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
  };

  const toggleFilter = (type: keyof FilterState, value: string) => {
    setFilters(prev => ({
      ...prev,
      [type]: prev[type].includes(value) 
        ? prev[type].filter(item => item !== value)
        : [...prev[type], value]
    }));
  };

  const handleReceiptClick = (receipt: ReceiptData) => {
    setSelectedReceipt(receipt);
    setShowReceiptModal(true);
  };

  const getImageUrl = (receipt: ReceiptData) => {
    if (receipt.image_url) {
      return receipt.image_url;
    }
    if (receipt.image_path) {
      // Generate public URL from image path
      const { data } = supabase.storage
        .from('receipt-images')
        .getPublicUrl(receipt.image_path);
      return data.publicUrl;
    }
    return null;
  };

  const downloadImage = async (receipt: ReceiptData) => {
    const imageUrl = getImageUrl(receipt);
    if (imageUrl) {
      try {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `receipt-${receipt.product_description.replace(/[^a-zA-Z0-9]/g, '-')}.jpg`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } catch (error) {
        console.error('Error downloading image:', error);
      }
    }
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

  const displayedReceipts = showSearchResults ? [] : filteredReceipts;

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
                <span className="hidden sm:inline leading-none">Scan New Receipt</span>
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
                      onClick={onBackToDashboard}
                      className="w-full text-left px-4 py-2 text-sm text-text-secondary hover:bg-gray-100 hover:text-text-primary transition-colors duration-200 flex items-center space-x-2"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      <span>Back to Dashboard</span>
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
        {/* Page Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-4">
            My Receipt Library
          </h1>
          <p className="text-xl text-text-secondary">
            {showSearchResults 
              ? `${searchResults.length} search results for "${searchQuery}"`
              : `${filteredReceipts.length} of ${receipts.length} receipts`
            }
          </p>
        </div>

        {/* Smart Search Bar */}
        <div className="mb-8">
          <form onSubmit={handleSearchSubmit} className="relative max-w-2xl mx-auto">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-text-secondary" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-12 pr-32 py-4 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors duration-200 text-lg bg-white shadow-sm"
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
            <div className="mt-4 max-w-2xl mx-auto p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700 text-center">{searchError}</p>
            </div>
          )}

          {/* Search Results */}
          {showSearchResults && (
            <div className="mt-6 max-w-2xl mx-auto">
              <div className="bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-text-primary">
                      Search Results ({searchResults.length})
                    </h3>
                    <button
                      onClick={clearSearch}
                      className="text-text-secondary hover:text-text-primary transition-colors duration-200"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>
                
                {searchResults.length === 0 ? (
                  <div className="px-6 py-8 text-center">
                    <Search className="h-12 w-12 text-text-secondary mx-auto mb-4" />
                    <p className="text-text-secondary">No receipts found matching your search.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {searchResults.map((result, index) => (
                      <div
                        key={result.id}
                        className="px-6 py-4 hover:bg-gray-50 transition-colors duration-200 cursor-pointer"
                        onClick={() => {
                          const fullReceipt = receipts.find(r => r.id === result.id);
                          if (fullReceipt) handleReceiptClick(fullReceipt);
                        }}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-3 mb-2">
                              <h4 className="text-base font-semibold text-text-primary truncate">
                                {result.product_description}
                              </h4>
                              <div className="flex items-center space-x-1 text-xs text-text-secondary bg-gray-100 px-2 py-1 rounded-full">
                                <span>Relevance:</span>
                                <span className="font-medium">{Math.round(result.relevance_score * 100)}%</span>
                              </div>
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-4 text-sm text-text-secondary">
                              <div className="flex items-center space-x-1">
                                <Tag className="h-4 w-4" />
                                <span>{result.brand_name}</span>
                              </div>
                              
                              {result.store_name && (
                                <div className="flex items-center space-x-1">
                                  <Store className="h-4 w-4" />
                                  <span>{result.store_name}</span>
                                </div>
                              )}
                              
                              <div className="flex items-center space-x-1">
                                <Calendar className="h-4 w-4" />
                                <span>{formatDate(result.purchase_date)}</span>
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
                                <span>Warranty: {result.warranty_period}</span>
                              </div>
                            </div>
                          </div>
                          
                          <button className="ml-4 text-primary hover:text-primary/80 transition-colors duration-200">
                            <Eye className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Filters Panel */}
        {showFilters && !showSearchResults && (
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
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Receipt Grid */}
        {!showSearchResults && (
          <>
            {displayedReceipts.length === 0 ? (
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
                {displayedReceipts.map((receipt) => {
                  const warrantyStatus = getWarrantyStatus(receipt.purchase_date, receipt.warranty_period);
                  const StatusIcon = warrantyStatus.icon;
                  const imageUrl = getImageUrl(receipt);
                  
                  return (
                    <div
                      key={receipt.id}
                      className="bg-white rounded-2xl shadow-card border border-gray-100 p-6 hover:shadow-card-hover transition-all duration-300 transform hover:-translate-y-1 group cursor-pointer"
                      onClick={() => handleReceiptClick(receipt)}
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
                          {imageUrl && (
                            <div className="text-primary">
                              <ImageIcon className="h-4 w-4" />
                            </div>
                          )}
                          {receipt.extracted_text && (
                            <div className="text-secondary">
                              <FileText className="h-4 w-4" />
                            </div>
                          )}
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReceiptClick(receipt);
                            }}
                            className="text-text-secondary hover:text-primary transition-colors duration-200"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {/* Receipt Image Preview */}
                      {imageUrl && (
                        <div className="mb-4">
                          <img
                            src={imageUrl}
                            alt="Receipt"
                            className="w-full h-32 object-cover rounded-lg border border-gray-200"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        </div>
                      )}

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

                        {/* Processing Method Badge */}
                        {receipt.processing_method && receipt.processing_method !== 'manual' && (
                          <div className="flex items-center space-x-2">
                            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                              {receipt.processing_method.replace('_', ' ')}
                            </span>
                            {receipt.ocr_confidence && (
                              <span className="text-xs text-text-secondary">
                                {Math.round(receipt.ocr_confidence * 100)}% confidence
                              </span>
                            )}
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
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReceiptClick(receipt);
                          }}
                          className="text-primary hover:text-primary/80 font-medium text-sm transition-colors duration-200"
                        >
                          View Details
                        </button>
                        <div className="flex items-center space-x-2">
                          {imageUrl && (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                downloadImage(receipt);
                              }}
                              className="text-text-secondary hover:text-primary transition-colors duration-200"
                              title="Download Image"
                            >
                              <Download className="h-4 w-4" />
                            </button>
                          )}
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              // Add edit functionality here
                            }}
                            className="text-text-secondary hover:text-primary transition-colors duration-200"
                            title="Edit Receipt"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              // Add delete functionality here
                            }}
                            className="text-text-secondary hover:text-accent-red transition-colors duration-200"
                            title="Delete Receipt"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>

      {/* Receipt Detail Modal */}
      {showReceiptModal && selectedReceipt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-card max-w-4xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-text-primary">Receipt Details</h2>
              <button
                onClick={() => setShowReceiptModal(false)}
                className="text-text-secondary hover:text-text-primary transition-colors duration-200"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="grid lg:grid-cols-2 gap-8">
                {/* Receipt Image */}
                <div>
                  {getImageUrl(selectedReceipt) ? (
                    <div className="space-y-4">
                      <img
                        src={getImageUrl(selectedReceipt)!}
                        alt="Receipt"
                        className="w-full rounded-lg border border-gray-200"
                      />
                      <div className="flex space-x-2">
                        <button
                          onClick={() => downloadImage(selectedReceipt)}
                          className="flex items-center space-x-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors duration-200"
                        >
                          <Download className="h-4 w-4" />
                          <span>Download</span>
                        </button>
                        <button
                          onClick={() => window.open(getImageUrl(selectedReceipt)!, '_blank')}
                          className="flex items-center space-x-2 border border-gray-300 text-text-secondary px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                        >
                          <ExternalLink className="h-4 w-4" />
                          <span>Open in New Tab</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-100 rounded-lg p-8 text-center">
                      <ImageIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No image available</p>
                    </div>
                  )}
                </div>

                {/* Receipt Information */}
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-bold text-text-primary mb-4">Product Information</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-text-secondary">Product Description</label>
                        <p className="text-text-primary font-medium">{selectedReceipt.product_description}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-text-secondary">Brand</label>
                        <p className="text-text-primary">{selectedReceipt.brand_name}</p>
                      </div>
                      {selectedReceipt.model_number && (
                        <div>
                          <label className="text-sm font-medium text-text-secondary">Model Number</label>
                          <p className="text-text-primary">{selectedReceipt.model_number}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-text-primary mb-4">Purchase Details</h3>
                    <div className="space-y-3">
                      {selectedReceipt.store_name && (
                        <div>
                          <label className="text-sm font-medium text-text-secondary">Store</label>
                          <p className="text-text-primary">{selectedReceipt.store_name}</p>
                        </div>
                      )}
                      {selectedReceipt.purchase_location && (
                        <div>
                          <label className="text-sm font-medium text-text-secondary">Location</label>
                          <p className="text-text-primary">{selectedReceipt.purchase_location}</p>
                        </div>
                      )}
                      <div>
                        <label className="text-sm font-medium text-text-secondary">Purchase Date</label>
                        <p className="text-text-primary">{formatDate(selectedReceipt.purchase_date)}</p>
                      </div>
                      {selectedReceipt.amount && (
                        <div>
                          <label className="text-sm font-medium text-text-secondary">Amount</label>
                          <p className="text-text-primary font-medium">{formatCurrency(selectedReceipt.amount)}</p>
                        </div>
                      )}
                      <div>
                        <label className="text-sm font-medium text-text-secondary">Country</label>
                        <p className="text-text-primary">{selectedReceipt.country}</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-text-primary mb-4">Warranty Information</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-text-secondary">Warranty Period</label>
                        <p className="text-text-primary">{selectedReceipt.warranty_period}</p>
                      </div>
                      {selectedReceipt.extended_warranty && (
                        <div>
                          <label className="text-sm font-medium text-text-secondary">Extended Warranty</label>
                          <p className="text-text-primary">{selectedReceipt.extended_warranty}</p>
                        </div>
                      )}
                      <div>
                        <label className="text-sm font-medium text-text-secondary">Warranty Expires</label>
                        <p className="text-text-primary">
                          {formatDate(calculateWarrantyExpiry(selectedReceipt.purchase_date, selectedReceipt.warranty_period).toISOString())}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Processing Information */}
                  {selectedReceipt.processing_method && (
                    <div>
                      <h3 className="text-xl font-bold text-text-primary mb-4">Processing Information</h3>
                      <div className="space-y-3">
                        <div>
                          <label className="text-sm font-medium text-text-secondary">Processing Method</label>
                          <p className="text-text-primary capitalize">{selectedReceipt.processing_method.replace('_', ' ')}</p>
                        </div>
                        {selectedReceipt.ocr_confidence && (
                          <div>
                            <label className="text-sm font-medium text-text-secondary">OCR Confidence</label>
                            <p className="text-text-primary">{Math.round(selectedReceipt.ocr_confidence * 100)}%</p>
                          </div>
                        )}
                        <div>
                          <label className="text-sm font-medium text-text-secondary">Added</label>
                          <p className="text-text-primary">{formatDate(selectedReceipt.created_at)}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Extracted Text */}
                  {selectedReceipt.extracted_text && (
                    <div>
                      <h3 className="text-xl font-bold text-text-primary mb-4">Extracted Text</h3>
                      <div className="bg-gray-50 rounded-lg p-4 max-h-40 overflow-y-auto">
                        <pre className="text-sm text-text-secondary whitespace-pre-wrap font-mono">
                          {selectedReceipt.extracted_text}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close dropdowns */}
      {(showSortMenu || showFilters || showUserMenu) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setShowSortMenu(false);
            setShowFilters(false);
            setShowUserMenu(false);
          }}
        />
      )}
    </div>
  );
};

export default MyLibrary;