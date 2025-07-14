import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Search, 
  Filter, 
  Calendar, 
  DollarSign, 
  Package, 
  Eye, 
  Edit3, 
  Trash2,
  Download,
  Upload,
  SortAsc,
  SortDesc,
  Grid,
  List,
  User,
  Store,
  Tag,
  Shield,
  Clock,
  X,
  Check,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  FileText,
  Camera
} from 'lucide-react';
import { getCurrentUser, getUserReceipts, deleteReceipt, updateReceipt, getReceiptImageSignedUrl } from '../lib/supabase';
import { MultiProductReceiptService } from '../services/multiProductReceiptService';
import NotificationDropdown from './NotificationDropdown';
import Footer from './Footer';

interface MyLibraryProps {
  onBackToDashboard: () => void;
  onShowReceiptScanning: () => void;
}

interface Receipt {
  id: string;
  product_description: string;
  brand_name: string;
  store_name: string;
  purchase_date: string;
  amount: number;
  warranty_period: string;
  model_number: string;
  image_url: string;
  is_group_receipt: boolean;
  receipt_group_id: string;
  receipt_total: number;
}

interface GroupedReceipt {
  id: string;
  type: 'single' | 'group';
  receipts?: Receipt[];
  store_name: string;
  purchase_date: string;
  receipt_total: number;
  product_count?: number;
  image_url: string;
  amount: number;
  // Single receipt fields
  product_description?: string;
  brand_name?: string;
  warranty_period?: string;
  model_number?: string;
}

type ViewMode = 'grid' | 'list';
type SortField = 'date' | 'amount' | 'name' | 'store';
type SortOrder = 'asc' | 'desc';

const MyLibrary: React.FC<MyLibraryProps> = ({ onBackToDashboard, onShowReceiptScanning }) => {
  const [user, setUser] = useState<any>(null);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [receipts, setReceipts] = useState<GroupedReceipt[]>([]);
  const [filteredReceipts, setFilteredReceipts] = useState<GroupedReceipt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<GroupedReceipt | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingReceipt, setEditingReceipt] = useState<Receipt | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Filter states
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [amountRange, setAmountRange] = useState({ min: '', max: '' });
  const [selectedStores, setSelectedStores] = useState<string[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);

  useEffect(() => {
    loadUserAndReceipts();
  }, []);

  useEffect(() => {
    applyFiltersAndSort();
  }, [receipts, searchQuery, sortField, sortOrder, dateRange, amountRange, selectedStores, selectedBrands]);

  const loadUserAndReceipts = async () => {
    try {
      setIsLoading(true);
      const currentUser = await getCurrentUser();
      
      if (currentUser) {
        setUser(currentUser);
        
        // Load profile picture if exists
        if (currentUser.user_metadata?.avatar_url) {
          setProfilePicture(currentUser.user_metadata.avatar_url);
        }
        
        await loadReceipts(currentUser.id);
      }
    } catch (error) {
      console.error('Error loading user and receipts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadReceipts = async (userId: string) => {
    try {
      const groupedReceipts = await MultiProductReceiptService.getGroupedReceipts(userId);
      
      // Process receipts to ensure proper image URLs
      const processedReceipts = await Promise.all(
        groupedReceipts.map(async (receipt) => {
          if (receipt.image_url) {
            const signedUrl = await getReceiptImageSignedUrl(receipt.image_url);
            return {
              ...receipt,
              image_url: signedUrl || receipt.image_url
            };
          }
          return receipt;
        })
      );
      
      setReceipts(processedReceipts);
    } catch (error) {
      console.error('Error loading receipts:', error);
    }
  };

  const applyFiltersAndSort = () => {
    let filtered = [...receipts];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(receipt => {
        if (receipt.type === 'group') {
          return receipt.receipts?.some(r => 
            r.product_description?.toLowerCase().includes(query) ||
            r.brand_name?.toLowerCase().includes(query) ||
            r.store_name?.toLowerCase().includes(query) ||
            r.model_number?.toLowerCase().includes(query)
          ) || receipt.store_name?.toLowerCase().includes(query);
        } else {
          return receipt.product_description?.toLowerCase().includes(query) ||
                 receipt.brand_name?.toLowerCase().includes(query) ||
                 receipt.store_name?.toLowerCase().includes(query) ||
                 receipt.model_number?.toLowerCase().includes(query);
        }
      });
    }

    // Apply date range filter
    if (dateRange.start || dateRange.end) {
      filtered = filtered.filter(receipt => {
        const receiptDate = new Date(receipt.purchase_date);
        const startDate = dateRange.start ? new Date(dateRange.start) : new Date('1900-01-01');
        const endDate = dateRange.end ? new Date(dateRange.end) : new Date('2100-12-31');
        return receiptDate >= startDate && receiptDate <= endDate;
      });
    }

    // Apply amount range filter
    if (amountRange.min || amountRange.max) {
      filtered = filtered.filter(receipt => {
        const amount = receipt.amount || 0;
        const minAmount = amountRange.min ? parseFloat(amountRange.min) : 0;
        const maxAmount = amountRange.max ? parseFloat(amountRange.max) : Infinity;
        return amount >= minAmount && amount <= maxAmount;
      });
    }

    // Apply store filter
    if (selectedStores.length > 0) {
      filtered = filtered.filter(receipt => 
        selectedStores.includes(receipt.store_name || '')
      );
    }

    // Apply brand filter
    if (selectedBrands.length > 0) {
      filtered = filtered.filter(receipt => {
        if (receipt.type === 'group') {
          return receipt.receipts?.some(r => selectedBrands.includes(r.brand_name || ''));
        } else {
          return selectedBrands.includes(receipt.brand_name || '');
        }
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortField) {
        case 'date':
          aValue = new Date(a.purchase_date).getTime();
          bValue = new Date(b.purchase_date).getTime();
          break;
        case 'amount':
          aValue = a.amount || 0;
          bValue = b.amount || 0;
          break;
        case 'name':
          aValue = (a.product_description || a.store_name || '').toLowerCase();
          bValue = (b.product_description || b.store_name || '').toLowerCase();
          break;
        case 'store':
          aValue = (a.store_name || '').toLowerCase();
          bValue = (b.store_name || '').toLowerCase();
          break;
        default:
          aValue = new Date(a.purchase_date).getTime();
          bValue = new Date(b.purchase_date).getTime();
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredReceipts(filtered);
  };

  const handleViewReceipt = (receipt: GroupedReceipt) => {
    setSelectedReceipt(receipt);
    setShowReceiptModal(true);
  };

  const handleEditReceipt = (receipt: Receipt) => {
    setEditingReceipt(receipt);
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!editingReceipt || !user) return;

    try {
      const { error } = await updateReceipt(user.id, editingReceipt.id, editingReceipt);
      
      if (error) {
        console.error('Error updating receipt:', error);
        return;
      }

      // Reload receipts
      await loadReceipts(user.id);
      setIsEditing(false);
      setEditingReceipt(null);
    } catch (error) {
      console.error('Error saving receipt:', error);
    }
  };

  const handleDeleteReceipt = async (receipt: GroupedReceipt) => {
    if (!user) return;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      let result;
      
      if (receipt.type === 'group') {
        // Delete entire group
        result = await deleteReceipt(user.id, undefined, receipt.id);
      } else {
        // Delete single receipt
        result = await deleteReceipt(user.id, receipt.id);
      }

      if (result.error) {
        setDeleteError(result.error.message);
        return;
      }

      // Reload receipts
      await loadReceipts(user.id);
      setShowReceiptModal(false);
    } catch (error: any) {
      console.error('Error deleting receipt:', error);
      setDeleteError(error.message || 'Failed to delete receipt');
    } finally {
      setIsDeleting(false);
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

  const getUniqueStores = () => {
    const stores = new Set<string>();
    receipts.forEach(receipt => {
      if (receipt.store_name) stores.add(receipt.store_name);
    });
    return Array.from(stores).sort();
  };

  const getUniqueBrands = () => {
    const brands = new Set<string>();
    receipts.forEach(receipt => {
      if (receipt.type === 'group') {
        receipt.receipts?.forEach(r => {
          if (r.brand_name) brands.add(r.brand_name);
        });
      } else {
        if (receipt.brand_name) brands.add(receipt.brand_name);
      }
    });
    return Array.from(brands).sort();
  };

  const clearFilters = () => {
    setSearchQuery('');
    setDateRange({ start: '', end: '' });
    setAmountRange({ min: '', max: '' });
    setSelectedStores([]);
    setSelectedBrands([]);
  };

  if (isLoading) {
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
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={onBackToDashboard}
                className="flex items-center space-x-2 text-text-secondary hover:text-text-primary transition-colors duration-200"
              >
                <ArrowLeft className="h-5 w-5" />
                <span>Back to Dashboard</span>
              </button>
              <div className="h-6 w-px bg-gray-300"></div>
              <h1 className="text-2xl font-bold text-text-primary">My Receipt Library</h1>
            </div>
            <div className="flex items-center space-x-4">
              {/* Notifications */}
              {user && <NotificationDropdown userId={user.id} />}
              {/* User Avatar */}
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
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Controls */}
        <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            {/* Search */}
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-text-secondary" />
                <input
                  type="text"
                  placeholder="Search receipts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center space-x-4">
              {/* View Mode Toggle */}
              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded ${viewMode === 'grid' ? 'bg-white shadow-sm' : ''}`}
                >
                  <Grid className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded ${viewMode === 'list' ? 'bg-white shadow-sm' : ''}`}
                >
                  <List className="h-4 w-4" />
                </button>
              </div>

              {/* Sort */}
              <select
                value={`${sortField}-${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split('-');
                  setSortField(field as SortField);
                  setSortOrder(order as SortOrder);
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="date-desc">Newest First</option>
                <option value="date-asc">Oldest First</option>
                <option value="amount-desc">Highest Amount</option>
                <option value="amount-asc">Lowest Amount</option>
                <option value="name-asc">Name A-Z</option>
                <option value="name-desc">Name Z-A</option>
                <option value="store-asc">Store A-Z</option>
                <option value="store-desc">Store Z-A</option>
              </select>

              {/* Filters */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200"
              >
                <Filter className="h-4 w-4" />
                <span>Filters</span>
                {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>

              {/* Add Receipt */}
              <button
                onClick={onShowReceiptScanning}
                className="flex items-center space-x-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors duration-200"
              >
                <Camera className="h-4 w-4" />
                <span>Add Receipt</span>
              </button>
            </div>
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Date Range */}
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">Date Range</label>
                  <div className="space-y-2">
                    <input
                      type="date"
                      value={dateRange.start}
                      onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                    <input
                      type="date"
                      value={dateRange.end}
                      onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Amount Range */}
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">Amount Range</label>
                  <div className="space-y-2">
                    <input
                      type="number"
                      placeholder="Min amount"
                      value={amountRange.min}
                      onChange={(e) => setAmountRange(prev => ({ ...prev, min: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                    <input
                      type="number"
                      placeholder="Max amount"
                      value={amountRange.max}
                      onChange={(e) => setAmountRange(prev => ({ ...prev, max: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Stores */}
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">Stores</label>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {getUniqueStores().map(store => (
                      <label key={store} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={selectedStores.includes(store)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedStores(prev => [...prev, store]);
                            } else {
                              setSelectedStores(prev => prev.filter(s => s !== store));
                            }
                          }}
                          className="rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <span className="text-sm text-text-secondary">{store}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Brands */}
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">Brands</label>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {getUniqueBrands().map(brand => (
                      <label key={brand} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={selectedBrands.includes(brand)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedBrands(prev => [...prev, brand]);
                            } else {
                              setSelectedBrands(prev => prev.filter(b => b !== brand));
                            }
                          }}
                          className="rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <span className="text-sm text-text-secondary">{brand}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 text-text-secondary hover:text-text-primary transition-colors duration-200"
                >
                  Clear All Filters
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Results Summary */}
        <div className="mb-6">
          <p className="text-text-secondary">
            Showing {filteredReceipts.length} of {receipts.length} receipts
          </p>
        </div>

        {/* Receipts Grid/List */}
        {filteredReceipts.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-12 text-center">
            <FileText className="h-12 w-12 text-text-secondary mx-auto mb-4" />
            <h3 className="text-lg font-medium text-text-primary mb-2">
              {receipts.length === 0 ? 'No receipts yet' : 'No receipts match your filters'}
            </h3>
            <p className="text-text-secondary mb-6">
              {receipts.length === 0 
                ? 'Start by scanning your first receipt to build your digital library'
                : 'Try adjusting your search or filter criteria'
              }
            </p>
            {receipts.length === 0 && (
              <button
                onClick={onShowReceiptScanning}
                className="bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors duration-200"
              >
                Scan Your First Receipt
              </button>
            )}
          </div>
        ) : (
          <div className={viewMode === 'grid' 
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
            : 'space-y-4'
          }>
            {filteredReceipts.map((receipt) => (
              <div
                key={receipt.id}
                className={`bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden hover:shadow-card-hover transition-all duration-200 cursor-pointer ${
                  viewMode === 'list' ? 'flex items-center p-4' : 'p-6'
                }`}
                onClick={() => handleViewReceipt(receipt)}
              >
                {viewMode === 'grid' ? (
                  <>
                    {/* Receipt Image */}
                    {receipt.image_url && (
                      <div className="aspect-video bg-gray-100 rounded-lg mb-4 overflow-hidden">
                        <img
                          src={receipt.image_url}
                          alt="Receipt"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    {/* Receipt Info */}
                    <div className="space-y-3">
                      <div>
                        <h3 className="font-bold text-text-primary line-clamp-2">
                          {receipt.type === 'group' 
                            ? `${receipt.product_count} items from ${receipt.store_name}`
                            : receipt.product_description
                          }
                        </h3>
                        {receipt.type === 'single' && (
                          <p className="text-sm text-text-secondary">{receipt.brand_name}</p>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-text-secondary">{receipt.store_name}</span>
                        <span className="font-medium text-text-primary">
                          {formatCurrency(receipt.amount)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-text-secondary">{formatDate(receipt.purchase_date)}</span>
                        {receipt.type === 'group' && (
                          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                            {receipt.product_count} items
                          </span>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* List View */}
                    <div className="flex-1 flex items-center space-x-4">
                      {receipt.image_url && (
                        <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                          <img
                            src={receipt.image_url}
                            alt="Receipt"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-text-primary truncate">
                          {receipt.type === 'group' 
                            ? `${receipt.product_count} items from ${receipt.store_name}`
                            : receipt.product_description
                          }
                        </h3>
                        <p className="text-sm text-text-secondary">
                          {receipt.type === 'single' ? receipt.brand_name : receipt.store_name}
                        </p>
                        <p className="text-sm text-text-secondary">{formatDate(receipt.purchase_date)}</p>
                      </div>
                      
                      <div className="text-right">
                        <p className="font-bold text-text-primary">{formatCurrency(receipt.amount)}</p>
                        {receipt.type === 'group' && (
                          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                            {receipt.product_count} items
                          </span>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Receipt Detail Modal */}
      {showReceiptModal && selectedReceipt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-text-primary">
                  {selectedReceipt.type === 'group' ? 'Receipt Group Details' : 'Receipt Details'}
                </h2>
                <button
                  onClick={() => setShowReceiptModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="p-6">
              {selectedReceipt.type === 'group' ? (
                // Group Receipt Details
                <div className="space-y-6">
                  {/* Group Summary */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-bold text-text-primary mb-2">Receipt Summary</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-text-secondary">Store</label>
                        <p className="text-text-primary">{selectedReceipt.store_name}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-text-secondary">Date</label>
                        <p className="text-text-primary">{formatDate(selectedReceipt.purchase_date)}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-text-secondary">Total Amount</label>
                        <p className="text-text-primary font-bold">{formatCurrency(selectedReceipt.amount)}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-text-secondary">Items</label>
                        <p className="text-text-primary">{selectedReceipt.product_count} products</p>
                      </div>
                    </div>
                  </div>

                  {/* Individual Products */}
                  <div>
                    <h3 className="font-bold text-text-primary mb-4">Products in this Receipt</h3>
                    <div className="space-y-4">
                      {selectedReceipt.receipts?.map((product, index) => (
                        <div key={product.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium text-text-primary">{product.product_description}</h4>
                              <p className="text-sm text-text-secondary">{product.brand_name}</p>
                              {product.model_number && (
                                <p className="text-sm text-text-secondary">Model: {product.model_number}</p>
                              )}
                              <p className="text-sm text-text-secondary">Warranty: {product.warranty_period}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-text-primary">{formatCurrency(product.amount)}</p>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditReceipt(product);
                                }}
                                className="mt-2 text-primary hover:text-primary/80 transition-colors duration-200"
                              >
                                <Edit3 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                // Single Receipt Details
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="font-bold text-text-primary mb-4">Product Information</h3>
                      <div className="space-y-3">
                        <div>
                          <label className="text-sm font-medium text-text-secondary">Product</label>
                          <p className="text-text-primary">{selectedReceipt.product_description}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-text-secondary">Brand</label>
                          <p className="text-text-primary">{selectedReceipt.brand_name}</p>
                        </div>
                        {selectedReceipt.model_number && (
                          <div>
                            <label className="text-sm font-medium text-text-secondary">Model</label>
                            <p className="text-text-primary">{selectedReceipt.model_number}</p>
                          </div>
                        )}
                        <div>
                          <label className="text-sm font-medium text-text-secondary">Warranty</label>
                          <p className="text-text-primary">{selectedReceipt.warranty_period}</p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-bold text-text-primary mb-4">Purchase Information</h3>
                      <div className="space-y-3">
                        <div>
                          <label className="text-sm font-medium text-text-secondary">Store</label>
                          <p className="text-text-primary">{selectedReceipt.store_name}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-text-secondary">Date</label>
                          <p className="text-text-primary">{formatDate(selectedReceipt.purchase_date)}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-text-secondary">Amount</label>
                          <p className="text-text-primary font-bold">{formatCurrency(selectedReceipt.amount)}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Receipt Image */}
                  {selectedReceipt.image_url && (
                    <div>
                      <h3 className="font-bold text-text-primary mb-4">Receipt Image</h3>
                      <img
                        src={selectedReceipt.image_url}
                        alt="Receipt"
                        className="max-w-full h-auto rounded-lg border border-gray-200"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="mt-8 flex items-center justify-between pt-6 border-t border-gray-200">
                <div className="flex items-center space-x-4">
                  {selectedReceipt.type === 'single' && (
                    <button
                      onClick={() => handleEditReceipt(selectedReceipt as any)}
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
                    >
                      <Edit3 className="h-4 w-4" />
                      <span>Edit</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center space-x-4">
                  {deleteError && (
                    <p className="text-red-600 text-sm">{deleteError}</p>
                  )}
                  <button
                    onClick={() => handleDeleteReceipt(selectedReceipt)}
                    disabled={isDeleting}
                    className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200 disabled:opacity-50"
                  >
                    {isDeleting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Receipt Modal */}
      {isEditing && editingReceipt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-text-primary">Edit Receipt</h2>
                <button
                  onClick={() => setIsEditing(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">Product Description</label>
                  <input
                    type="text"
                    value={editingReceipt.product_description}
                    onChange={(e) => setEditingReceipt(prev => prev ? { ...prev, product_description: e.target.value } : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">Brand</label>
                  <input
                    type="text"
                    value={editingReceipt.brand_name}
                    onChange={(e) => setEditingReceipt(prev => prev ? { ...prev, brand_name: e.target.value } : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">Store</label>
                  <input
                    type="text"
                    value={editingReceipt.store_name}
                    onChange={(e) => setEditingReceipt(prev => prev ? { ...prev, store_name: e.target.value } : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingReceipt.amount}
                    onChange={(e) => setEditingReceipt(prev => prev ? { ...prev, amount: parseFloat(e.target.value) || 0 } : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">Purchase Date</label>
                  <input
                    type="date"
                    value={editingReceipt.purchase_date}
                    onChange={(e) => setEditingReceipt(prev => prev ? { ...prev, purchase_date: e.target.value } : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">Warranty Period</label>
                  <input
                    type="text"
                    value={editingReceipt.warranty_period}
                    onChange={(e) => setEditingReceipt(prev => prev ? { ...prev, warranty_period: e.target.value } : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
              </div>

              <div className="mt-8 flex items-center justify-end space-x-4">
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 border border-gray-300 text-text-secondary rounded-lg hover:bg-gray-50 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors duration-200"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default MyLibrary;