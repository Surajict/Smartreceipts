import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Search, 
  Filter, 
  Grid, 
  List, 
  Calendar, 
  DollarSign, 
  Tag, 
  Eye, 
  Edit3, 
  Trash2, 
  Download,
  Plus,
  AlertTriangle,
  CheckCircle,
  Clock,
  User,
  LogOut,
  Bell,
  SortAsc,
  SortDesc,
  X,
  Loader2
} from 'lucide-react';
import { getCurrentUser, signOut, getUserReceipts, deleteReceipt } from '../lib/supabase';

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
  image_url?: string;
  created_at: string;
}

type ViewMode = 'grid' | 'list';
type SortField = 'date' | 'amount' | 'name';
type SortOrder = 'asc' | 'desc';

const MyLibrary: React.FC<MyLibraryProps> = ({ onBackToDashboard, onShowReceiptScanning }) => {
  const [user, setUser] = useState<any>(null);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [filteredReceipts, setFilteredReceipts] = useState<Receipt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [alertsCount] = useState(3);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (user) {
      loadReceipts();
    }
  }, [user]);

  useEffect(() => {
    filterAndSortReceipts();
  }, [receipts, searchQuery, sortField, sortOrder]);

  const loadUser = async () => {
    const currentUser = await getCurrentUser();
    setUser(currentUser);
  };

  const loadReceipts = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await getUserReceipts(user.id);
      if (error) {
        console.error('Error loading receipts:', error);
      } else {
        setReceipts(data || []);
      }
    } catch (error) {
      console.error('Error loading receipts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterAndSortReceipts = () => {
    let filtered = receipts;

    // Apply search filter
    if (searchQuery) {
      filtered = receipts.filter(receipt =>
        receipt.product_description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        receipt.brand_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        receipt.store_name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortField) {
        case 'date':
          aValue = new Date(a.purchase_date);
          bValue = new Date(b.purchase_date);
          break;
        case 'amount':
          aValue = a.amount || 0;
          bValue = b.amount || 0;
          break;
        case 'name':
          aValue = a.product_description.toLowerCase();
          bValue = b.product_description.toLowerCase();
          break;
        default:
          aValue = a.created_at;
          bValue = b.created_at;
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredReceipts(filtered);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      window.location.href = '/';
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleDeleteReceipt = async (receiptId: string) => {
    if (!user || !confirm('Are you sure you want to delete this receipt?')) return;

    setIsDeleting(receiptId);
    try {
      const { error } = await deleteReceipt(user.id, receiptId);
      if (error) {
        console.error('Error deleting receipt:', error);
        alert('Failed to delete receipt. Please try again.');
      } else {
        // Remove from local state
        setReceipts(prev => prev.filter(r => r.id !== receiptId));
        setShowReceiptModal(false);
        setSelectedReceipt(null);
      }
    } catch (error) {
      console.error('Error deleting receipt:', error);
      alert('Failed to delete receipt. Please try again.');
    } finally {
      setIsDeleting(null);
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

  const getWarrantyStatus = (purchaseDate: string, warrantyPeriod: string) => {
    const purchase = new Date(purchaseDate);
    const period = warrantyPeriod.toLowerCase();
    
    let expiryDate = new Date(purchase);
    if (period.includes('year')) {
      const years = parseInt(period.match(/(\d+)/)?.[1] || '1');
      expiryDate.setFullYear(expiryDate.getFullYear() + years);
    } else if (period.includes('month')) {
      const months = parseInt(period.match(/(\d+)/)?.[1] || '12');
      expiryDate.setMonth(expiryDate.getMonth() + months);
    } else {
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);
    }

    const now = new Date();
    const daysLeft = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysLeft < 0) return { status: 'expired', color: 'text-red-600', icon: AlertTriangle };
    if (daysLeft <= 30) return { status: 'expiring', color: 'text-yellow-600', icon: Clock };
    return { status: 'active', color: 'text-green-600', icon: CheckCircle };
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

              {/* Back Button */}
              <button
                onClick={onBackToDashboard}
                className="flex items-center space-x-2 bg-white text-text-primary border-2 border-gray-300 hover:border-primary px-4 py-2 rounded-lg font-medium transition-all duration-200"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Back to Dashboard</span>
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
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-2">
              My Receipt Library
            </h1>
            <p className="text-xl text-text-secondary">
              {filteredReceipts.length} receipt{filteredReceipts.length !== 1 ? 's' : ''} in your collection
            </p>
          </div>
          
          <button
            onClick={onShowReceiptScanning}
            className="mt-4 sm:mt-0 bg-primary text-white px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors duration-200 flex items-center space-x-2"
          >
            <Plus className="h-5 w-5" />
            <span>Add Receipt</span>
          </button>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-text-secondary" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors duration-200"
                placeholder="Search receipts..."
              />
            </div>

            {/* Sort Controls */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-text-secondary">Sort by:</span>
                <select
                  value={sortField}
                  onChange={(e) => setSortField(e.target.value as SortField)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="date">Date</option>
                  <option value="amount">Amount</option>
                  <option value="name">Name</option>
                </select>
                <button
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                >
                  {sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
                </button>
              </div>

              {/* View Mode Toggle */}
              <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-md transition-colors duration-200 ${
                    viewMode === 'grid' ? 'bg-white text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <Grid className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-md transition-colors duration-200 ${
                    viewMode === 'list' ? 'bg-white text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Receipts Display */}
        {filteredReceipts.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-12">
              {searchQuery ? (
                <>
                  <Search className="h-16 w-16 text-text-secondary mx-auto mb-4" />
                  <h3 className="text-xl font-medium text-text-primary mb-2">No receipts found</h3>
                  <p className="text-text-secondary mb-6">
                    No receipts match your search for "{searchQuery}"
                  </p>
                  <button
                    onClick={() => setSearchQuery('')}
                    className="bg-primary text-white px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors duration-200"
                  >
                    Clear Search
                  </button>
                </>
              ) : (
                <>
                  <div className="bg-gradient-feature rounded-full p-6 w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                    <Plus className="h-12 w-12 text-primary" />
                  </div>
                  <h3 className="text-xl font-medium text-text-primary mb-2">No receipts yet</h3>
                  <p className="text-text-secondary mb-6">
                    Start building your receipt library by adding your first receipt
                  </p>
                  <button
                    onClick={onShowReceiptScanning}
                    className="bg-primary text-white px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors duration-200"
                  >
                    Add Your First Receipt
                  </button>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className={viewMode === 'grid' ? 'grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6' : 'space-y-4'}>
            {filteredReceipts.map((receipt) => {
              const warrantyStatus = getWarrantyStatus(receipt.purchase_date, receipt.warranty_period);
              const StatusIcon = warrantyStatus.icon;

              if (viewMode === 'grid') {
                return (
                  <div
                    key={receipt.id}
                    className="bg-white rounded-2xl shadow-card border border-gray-100 p-6 hover:shadow-card-hover transition-all duration-300 transform hover:-translate-y-1 cursor-pointer group"
                    onClick={() => {
                      setSelectedReceipt(receipt);
                      setShowReceiptModal(true);
                    }}
                  >
                    {/* Receipt Image or Placeholder */}
                    <div className="aspect-square bg-gradient-feature rounded-lg mb-4 flex items-center justify-center overflow-hidden">
                      {receipt.image_url ? (
                        <img
                          src={receipt.image_url}
                          alt={receipt.product_description}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="text-primary">
                          <Tag className="h-12 w-12" />
                        </div>
                      )}
                    </div>

                    {/* Receipt Info */}
                    <div className="space-y-2">
                      <h3 className="font-bold text-text-primary group-hover:text-primary transition-colors duration-200 line-clamp-2">
                        {receipt.product_description}
                      </h3>
                      
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-text-secondary">{receipt.brand_name}</span>
                        <div className={`flex items-center space-x-1 ${warrantyStatus.color}`}>
                          <StatusIcon className="h-4 w-4" />
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-text-secondary text-sm">{formatDate(receipt.purchase_date)}</span>
                        {receipt.amount && (
                          <span className="font-bold text-text-primary">{formatCurrency(receipt.amount)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              } else {
                return (
                  <div
                    key={receipt.id}
                    className="bg-white rounded-2xl shadow-card border border-gray-100 p-6 hover:shadow-card-hover transition-all duration-200 cursor-pointer group"
                    onClick={() => {
                      setSelectedReceipt(receipt);
                      setShowReceiptModal(true);
                    }}
                  >
                    <div className="flex items-center space-x-4">
                      {/* Receipt Image or Placeholder */}
                      <div className="w-16 h-16 bg-gradient-feature rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {receipt.image_url ? (
                          <img
                            src={receipt.image_url}
                            alt={receipt.product_description}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Tag className="h-8 w-8 text-primary" />
                        )}
                      </div>

                      {/* Receipt Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-text-primary group-hover:text-primary transition-colors duration-200 truncate">
                          {receipt.product_description}
                        </h3>
                        <div className="flex items-center space-x-4 text-sm text-text-secondary mt-1">
                          <span>{receipt.brand_name}</span>
                          <span>{formatDate(receipt.purchase_date)}</span>
                          {receipt.store_name && <span>{receipt.store_name}</span>}
                        </div>
                      </div>

                      {/* Amount and Status */}
                      <div className="flex items-center space-x-4 flex-shrink-0">
                        {receipt.amount && (
                          <span className="font-bold text-text-primary">{formatCurrency(receipt.amount)}</span>
                        )}
                        <div className={`flex items-center space-x-1 ${warrantyStatus.color}`}>
                          <StatusIcon className="h-5 w-5" />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }
            })}
          </div>
        )}
      </main>

      {/* Receipt Detail Modal */}
      {showReceiptModal && selectedReceipt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-card max-w-2xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-text-primary">Receipt Details</h2>
              <button
                onClick={() => {
                  setShowReceiptModal(false);
                  setSelectedReceipt(null);
                }}
                className="text-text-secondary hover:text-text-primary transition-colors duration-200"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Receipt Image */}
                <div>
                  <h3 className="font-medium text-text-primary mb-3">Receipt Image</h3>
                  <div className="aspect-square bg-gradient-feature rounded-lg flex items-center justify-center overflow-hidden">
                    {selectedReceipt.image_url ? (
                      <img
                        src={selectedReceipt.image_url}
                        alt={selectedReceipt.product_description}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-center text-text-secondary">
                        <Tag className="h-16 w-16 mx-auto mb-2" />
                        <p>No image available</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Receipt Details */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">Product</label>
                    <p className="text-text-primary font-medium">{selectedReceipt.product_description}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">Brand</label>
                    <p className="text-text-primary">{selectedReceipt.brand_name}</p>
                  </div>

                  {selectedReceipt.store_name && (
                    <div>
                      <label className="block text-sm font-medium text-text-secondary mb-1">Store</label>
                      <p className="text-text-primary">{selectedReceipt.store_name}</p>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">Purchase Date</label>
                    <p className="text-text-primary">{formatDate(selectedReceipt.purchase_date)}</p>
                  </div>

                  {selectedReceipt.amount && (
                    <div>
                      <label className="block text-sm font-medium text-text-secondary mb-1">Amount</label>
                      <p className="text-text-primary font-bold">{formatCurrency(selectedReceipt.amount)}</p>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">Warranty Period</label>
                    <p className="text-text-primary">{selectedReceipt.warranty_period}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">Warranty Status</label>
                    <div className={`flex items-center space-x-2 ${getWarrantyStatus(selectedReceipt.purchase_date, selectedReceipt.warranty_period).color}`}>
                      {React.createElement(getWarrantyStatus(selectedReceipt.purchase_date, selectedReceipt.warranty_period).icon, { className: "h-5 w-5" })}
                      <span className="font-medium capitalize">{getWarrantyStatus(selectedReceipt.purchase_date, selectedReceipt.warranty_period).status}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between p-6 border-t border-gray-200">
              <button
                onClick={() => handleDeleteReceipt(selectedReceipt.id)}
                disabled={isDeleting === selectedReceipt.id}
                className="flex items-center space-x-2 text-red-600 hover:text-red-700 transition-colors duration-200 disabled:opacity-50"
              >
                {isDeleting === selectedReceipt.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                <span>Delete Receipt</span>
              </button>

              <div className="flex items-center space-x-3">
                <button className="flex items-center space-x-2 text-text-secondary hover:text-text-primary transition-colors duration-200">
                  <Download className="h-4 w-4" />
                  <span>Download</span>
                </button>
                <button className="flex items-center space-x-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors duration-200">
                  <Edit3 className="h-4 w-4" />
                  <span>Edit</span>
                </button>
              </div>
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

export default MyLibrary;