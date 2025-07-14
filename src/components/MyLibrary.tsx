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
  Loader2,
  Package,
  ChevronDown,
  ChevronUp,
  MapPin,
  AlertCircle
} from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { getCurrentUser, signOut, getUserReceipts, deleteReceipt, getReceiptImageSignedUrl, updateReceipt, getUserNotifications, archiveNotification, archiveAllNotifications, cleanupDuplicateNotifications, Notification, supabase } from '../lib/supabase';
import { MultiProductReceiptService } from '../services/multiProductReceiptService';
import Footer from './Footer';

interface MyLibraryProps {
  onBackToDashboard: () => void;
  onShowReceiptScanning: () => void;
}

interface Receipt {
  id: string;
  type?: 'single' | 'group';
  product_description?: string;
  brand_name?: string;
  store_name: string;
  purchase_date: string;
  amount: number;
  warranty_period?: string;
  image_url?: string;
  created_at: string;
  // For grouped receipts
  receipts?: any[];
  receipt_total?: number;
  product_count?: number;
  receipt_group_id?: string; // Added for grouped receipts
}

type ViewMode = 'grid' | 'list';
type SortField = 'date' | 'amount' | 'name';
type SortOrder = 'asc' | 'desc';

const MyLibrary: React.FC<MyLibraryProps> = ({ onBackToDashboard, onShowReceiptScanning }) => {
  const location = useLocation();
  const [user, setUser] = useState<any>(null);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [filteredReceipts, setFilteredReceipts] = useState<Receipt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [alertsCount, setAlertsCount] = useState(0);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editForm, setEditForm] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Notification state
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState<string | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (user) {
      loadReceipts();
      loadNotifications(user.id);
    }
  }, [user]);

  useEffect(() => {
    filterAndSortReceipts();
  }, [receipts, searchQuery, sortField, sortOrder]);

  // Handle auto-opening receipt from navigation state
  useEffect(() => {
    const openReceiptId = location.state?.openReceiptId;
    if (openReceiptId && receipts.length > 0) {
      const receiptToOpen = receipts.find(r => r.id === openReceiptId);
      if (receiptToOpen) {
        setSelectedReceipt(receiptToOpen);
        setShowReceiptModal(true);
        // Clear the state to prevent reopening on re-renders
        window.history.replaceState({}, document.title);
      }
    }
  }, [location.state, receipts]);

  const loadUser = async () => {
    const currentUser = await getCurrentUser();
    setUser(currentUser);
    // Load profile picture if exists
    if (currentUser?.user_metadata?.avatar_url) {
      try {
        const { data, error } = await supabase.storage
          .from('profile-pictures')
          .createSignedUrl(currentUser.user_metadata.avatar_url, 365 * 24 * 60 * 60); // 1 year expiry
        if (error) {
          console.error('Error creating signed URL:', error);
        } else if (data?.signedUrl) {
          setProfilePicture(data.signedUrl);
        }
      } catch (error) {
        console.error('Error loading profile picture:', error);
      }
    }
  };

  const loadReceipts = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const groupedReceipts = await MultiProductReceiptService.getGroupedReceipts(user.id);
      setReceipts(groupedReceipts || []);
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
      filtered = receipts.filter(receipt => {
        const query = searchQuery.toLowerCase();
        return (
          receipt.product_description?.toLowerCase().includes(query) ||
          receipt.brand_name?.toLowerCase().includes(query) ||
          receipt.store_name?.toLowerCase().includes(query) ||
          // For grouped receipts, search within individual products
          (receipt.type === 'group' && receipt.receipts?.some(r => 
            r.product_description?.toLowerCase().includes(query) ||
            r.brand_name?.toLowerCase().includes(query)
          ))
        );
      });
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
          aValue = a.product_description?.toLowerCase() || '';
          bValue = b.product_description?.toLowerCase() || '';
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

  const loadNotifications = async (userId: string) => {
    setNotificationsLoading(true);
    setNotificationsError(null);
    try {
      const { data, error } = await getUserNotifications(userId);
      if (error) {
        setNotificationsError('Failed to load notifications');
      } else {
        // Clean up duplicates in database first
        await cleanupDuplicateNotifications(userId);
        // Then clean up duplicates in the UI
        const cleanedNotifications = removeDuplicateNotifications(data || []);
        setNotifications(cleanedNotifications);
        setAlertsCount(cleanedNotifications.filter(n => !n.read && !n.archived).length);
      }
    } catch (err) {
      setNotificationsError('Failed to load notifications');
    } finally {
      setNotificationsLoading(false);
    }
  };

  // Function to remove duplicate notifications based on item name
  const removeDuplicateNotifications = (notifications: Notification[]): Notification[] => {
    const seen = new Set<string>();
    const uniqueNotifications: Notification[] = [];
    
    // Sort by created_at descending to keep the most recent
    const sortedNotifications = [...notifications].sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    
    for (const notification of sortedNotifications) {
      if (notification.type === 'warranty_alert') {
        // Extract item name from warranty message
        const match = notification.message.match(/Warranty for (.+?) expires in/);
        const itemName = match ? match[1] : notification.message;
        
        if (!seen.has(itemName)) {
          seen.add(itemName);
          uniqueNotifications.push(notification);
        }
      } else {
        // For non-warranty notifications, keep all
        uniqueNotifications.push(notification);
      }
    }
    
    return uniqueNotifications;
  };

  const handleArchiveNotification = async (notificationId: string) => {
    if (!user) return;
    
    try {
      await archiveNotification(notificationId);
      setNotifications(notifications.filter(n => n.id !== notificationId));
      setAlertsCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error archiving notification:', error);
    }
  };

  const handleArchiveAllNotifications = async () => {
    if (!user) return;
    
    try {
      await archiveAllNotifications(user.id);
      setNotifications([]);
      setAlertsCount(0);
      setShowNotifications(false);
    } catch (error) {
      console.error('Error archiving all notifications:', error);
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

  const handleDeleteReceipt = async (receipt: Receipt) => {
    if (!user) return;

    // Confirmation dialog
    const confirmMsg = receipt.type === 'group'
      ? 'Are you sure you want to delete this entire receipt and all its items? This action cannot be undone.'
      : 'Are you sure you want to delete this receipt? This action cannot be undone.';
    if (!window.confirm(confirmMsg)) return;

    setIsDeleting(receipt.id);
    try {
      let error;
      if (receipt.type === 'group' && receipt.receipts && receipt.receipts.length > 0) {
        // Delete all items in the group by receipt_group_id
        const groupId = receipt.receipts[0].receipt_group_id;
        if (groupId) {
          const res = await deleteReceipt(user.id, undefined, groupId); // undefined for id, pass groupId
          error = res.error;
        } else {
          // fallback: delete all by id
          for (const item of receipt.receipts) {
            const res = await deleteReceipt(user.id, item.id);
            if (res.error) error = res.error;
          }
        }
      } else {
        // Single receipt
        const res = await deleteReceipt(user.id, receipt.id);
        error = res.error;
      }
      if (error) {
        console.error('Error deleting receipt:', error);
        alert('Failed to delete receipt');
      } else {
        setReceipts(receipts.filter(r => {
          if (receipt.type === 'group' && receipt.receipts) {
            // Remove all items in the group
            return r.id !== receipt.id && !receipt.receipts.some(item => item.id === r.id);
          } else {
            return r.id !== receipt.id;
          }
        }));
        setShowReceiptModal(false);
        setSelectedReceipt(null);
      }
    } catch (error) {
      console.error('Error deleting receipt:', error);
      alert('Failed to delete receipt');
    } finally {
      setIsDeleting(null);
    }
  };

  // Helper function to get signed URL for receipt image
  const getSignedImageUrl = async (imageUrl: string | undefined): Promise<string | null> => {
    if (!imageUrl) return null;
    return await getReceiptImageSignedUrl(imageUrl);
  };

  // State for signed URLs cache
  const [signedUrls, setSignedUrls] = useState<{[key: string]: string}>({});

  // Load signed URLs for visible receipts
  useEffect(() => {
    const loadSignedUrls = async () => {
      const urlMap: {[key: string]: string} = {};
      
      for (const receipt of receipts) {
        if (receipt.image_url && !signedUrls[receipt.image_url]) {
          try {
            console.log(`Loading signed URL for receipt ${receipt.id}:`, receipt.image_url);
            const signedUrl = await getSignedImageUrl(receipt.image_url);
            if (signedUrl) {
              urlMap[receipt.image_url] = signedUrl;
              console.log(`✓ Signed URL loaded for receipt ${receipt.id}`);
            } else {
              console.warn(`⚠️ No signed URL returned for receipt ${receipt.id}:`, receipt.image_url);
            }
          } catch (error) {
            console.error(`❌ Failed to get signed URL for receipt ${receipt.id}:`, error);
          }
        } else if (!receipt.image_url) {
          console.log(`ℹ️ Receipt ${receipt.id} has no image_url`);
        }
      }
      
      if (Object.keys(urlMap).length > 0) {
        setSignedUrls(prev => ({ ...prev, ...urlMap }));
      }
    };

    if (receipts.length > 0) {
      loadSignedUrls();
    }
  }, [receipts]);

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

    if (daysLeft < 0) return { status: 'expired', color: 'text-red-600', icon: AlertCircle };
    if (daysLeft <= 30) return { status: 'expiring', color: 'text-yellow-600', icon: Clock };
    return { status: 'active', color: 'text-green-600', icon: CheckCircle };
  };

  // Download handler for receipt image
  const handleDownloadReceiptImage = async () => {
    if (!selectedReceipt || !selectedReceipt.image_url) return;
    const url = signedUrls[selectedReceipt.image_url] || selectedReceipt.image_url;
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      
      // Determine file extension from blob type or URL
      let extension = 'jpg'; // default fallback
      if (blob.type) {
        const mimeToExt: {[key: string]: string} = {
          'image/jpeg': 'jpg',
          'image/jpg': 'jpg',
          'image/png': 'png',
          'image/webp': 'webp',
          'image/gif': 'gif',
          'image/bmp': 'bmp',
          'image/tiff': 'tiff',
          'application/pdf': 'pdf'
        };
        extension = mimeToExt[blob.type] || 'jpg';
      } else {
        // Try to get extension from URL
        const urlParts = url.split('.');
        if (urlParts.length > 1) {
          const urlExt = urlParts[urlParts.length - 1].split('?')[0].toLowerCase();
          if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'tiff', 'pdf'].includes(urlExt)) {
            extension = urlExt === 'jpeg' ? 'jpg' : urlExt;
          }
        }
      }
      
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      
      // Use product description or fallback for filename
      const filename = `${selectedReceipt.product_description ? selectedReceipt.product_description.replace(/[^a-z0-9]/gi, '_').toLowerCase() : 'receipt'}_${selectedReceipt.id}.${extension}`;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the blob URL
      window.URL.revokeObjectURL(link.href);
    } catch (err) {
      console.error('Download error:', err);
      alert('Failed to download receipt image.');
    }
  };

  // Start editing
  const handleEditClick = () => {
    if (!selectedReceipt) return;
    if (selectedReceipt.type === 'group' && selectedReceipt.receipts) {
      setEditForm({
        type: 'group',
        store_name: selectedReceipt.store_name,
        purchase_date: selectedReceipt.purchase_date,
        receipts: selectedReceipt.receipts.map((item: any) => ({ ...item })),
      });
    } else {
      setEditForm({ ...selectedReceipt });
    }
    setIsEditMode(true);
  };

  // Handle form changes
  const handleEditFormChange = (field: string, value: any, idx?: number) => {
    setEditForm((prev: any) => {
      if (prev.type === 'group' && typeof idx === 'number') {
        const newReceipts = [...prev.receipts];
        newReceipts[idx] = { ...newReceipts[idx], [field]: value };
        return { ...prev, receipts: newReceipts };
      } else {
        return { ...prev, [field]: value };
      }
    });
  };

  // Save changes
  const handleSaveEdit = async () => {
    if (!user || !editForm) return;
    setIsSaving(true);
    try {
      if (editForm.type === 'group' && editForm.receipts) {
        // Update all items in the group
        await Promise.all(editForm.receipts.map((item: any) => {
          const updateData = {
            product_description: item.product_description,
            brand_name: item.brand_name,
            store_name: editForm.store_name,
            purchase_date: editForm.purchase_date,
            amount: item.amount,
            warranty_period: item.warranty_period,
            model_number: item.model_number,
            extended_warranty: item.extended_warranty,
            country: item.country,
          };
          return updateReceipt(user.id, item.id, updateData);
        }));
        // Update local state
        setReceipts(receipts.map(r => {
          if (r.id === selectedReceipt?.id) {
            return {
              ...r,
              store_name: editForm.store_name,
              purchase_date: editForm.purchase_date,
              receipts: editForm.receipts.map((item: any) => ({ ...item })),
            };
          } else {
            return r;
          }
        }));
        setSelectedReceipt((prev) => prev && prev.id === selectedReceipt?.id ? {
          ...prev,
          store_name: editForm.store_name,
          purchase_date: editForm.purchase_date,
          receipts: editForm.receipts.map((item: any) => ({ ...item })),
        } : prev);
      } else {
        // Single receipt
        const updateData = {
          product_description: editForm.product_description,
          brand_name: editForm.brand_name,
          store_name: editForm.store_name,
          purchase_date: editForm.purchase_date,
          amount: editForm.amount,
          warranty_period: editForm.warranty_period,
          model_number: editForm.model_number,
          extended_warranty: editForm.extended_warranty,
          country: editForm.country,
        };
        await updateReceipt(user.id, editForm.id, updateData);
        setReceipts(receipts.map(r => r.id === editForm.id ? { ...r, ...updateData } : r));
        setSelectedReceipt((prev) => prev && prev.id === editForm.id ? { ...prev, ...updateData } : prev);
      }
      setIsEditMode(false);
    } catch (err) {
      alert('Failed to update receipt.');
    } finally {
      setIsSaving(false);
    }
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setIsEditMode(false);
    setEditForm(null);
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
              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2 text-text-secondary hover:text-text-primary transition-colors duration-200"
                >
                  <Bell className="h-6 w-6" />
                  {alertsCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-accent-red text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                      {alertsCount}
                    </span>
                  )}
                </button>

                {/* Notifications Dropdown */}
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-card border border-gray-200 py-2 z-50 max-h-96 overflow-y-auto">
                    <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200">
                      <h3 className="font-medium text-text-primary">Notifications</h3>
                      {notifications.length > 0 && (
                        <button
                          onClick={handleArchiveAllNotifications}
                          className="text-xs text-primary hover:text-primary/80 transition-colors duration-200"
                        >
                          Clear All
                        </button>
                      )}
                    </div>
                    
                    {notificationsLoading ? (
                      <div className="px-4 py-8 text-center">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-text-secondary" />
                        <p className="text-sm text-text-secondary">Loading notifications...</p>
                      </div>
                    ) : notificationsError ? (
                      <div className="px-4 py-8 text-center">
                        <AlertCircle className="h-6 w-6 mx-auto mb-2 text-red-500" />
                        <p className="text-sm text-red-600">{notificationsError}</p>
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="px-4 py-8 text-center">
                        <Bell className="h-6 w-6 mx-auto mb-2 text-text-secondary" />
                        <p className="text-sm text-text-secondary">No notifications</p>
                      </div>
                    ) : (
                      <div className="max-h-64 overflow-y-auto">
                        {notifications.map((notification) => (
                          <div
                            key={notification.id}
                            className={`px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 ${
                              !notification.read ? 'bg-blue-50' : ''
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-text-primary mb-1">
                                  {notification.message}
                                </p>
                                <p className="text-xs text-text-secondary">
                                  {new Date(notification.created_at).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </p>
                              </div>
                              <button
                                onClick={() => handleArchiveNotification(notification.id)}
                                className="ml-2 text-text-secondary hover:text-text-primary transition-colors duration-200"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

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
              const warrantyStatus = receipt.warranty_period 
                ? getWarrantyStatus(receipt.purchase_date, receipt.warranty_period)
                : { status: 'unknown', color: 'text-gray-500', icon: Clock };
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
                          src={signedUrls[receipt.image_url] || receipt.image_url}
                          alt={receipt.product_description || 'Receipt'}
                          className="w-full h-full object-cover object-center"
                          onError={(e) => {
                            console.error(`Failed to load image for receipt ${receipt.id}:`, receipt.image_url);
                            console.error('Tried URLs:', receipt.image_url ? (signedUrls[receipt.image_url] || receipt.image_url) : 'No image URL');
                            (e.currentTarget as HTMLImageElement).src = '/receipt-placeholder.svg';
                          }}
                          onLoad={() => {
                            console.log(`✓ Image loaded successfully for receipt ${receipt.id}`);
                          }}
                        />
                      ) : (
                        <img
                          src="/receipt-placeholder.svg"
                          alt="Receipt Placeholder"
                          className="w-16 h-16 object-contain opacity-60"
                        />
                      )}
                    </div>

                    {/* Receipt Info */}
                    <div className="space-y-2">
                      <h3 className="font-bold text-text-primary group-hover:text-primary transition-colors duration-200 line-clamp-2">
                        {receipt.type === 'group' 
                          ? `${receipt.product_count} Products` 
                          : receipt.product_description || 'Receipt'
                        }
                      </h3>
                      
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-text-secondary">
                          {receipt.type === 'group' ? 'Multiple Brands' : (receipt.brand_name || 'Unknown')}
                        </span>
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

                      {receipt.type === 'group' && receipt.receipts && (
                        <div className="text-xs text-text-secondary bg-blue-50 rounded px-2 py-1 mt-2">
                          {receipt.receipts.slice(0, 2).map(r => r.product_description).join(', ')}
                          {receipt.receipts.length > 2 && ` +${receipt.receipts.length - 2} more`}
                        </div>
                      )}
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
                            src={signedUrls[receipt.image_url] || receipt.image_url}
                            alt={receipt.product_description || 'Receipt'}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              console.error(`Failed to load image for receipt ${receipt.id} (list view):`, receipt.image_url);
                              console.error('Tried URLs:', receipt.image_url ? (signedUrls[receipt.image_url] || receipt.image_url) : 'No image URL');
                              (e.currentTarget as HTMLImageElement).src = '/receipt-placeholder.svg';
                            }}
                            onLoad={() => {
                              console.log(`✓ Image loaded successfully for receipt ${receipt.id} (list view)`);
                            }}
                          />
                        ) : (
                          receipt.type === 'group' ? (
                            <Package className="h-8 w-8 text-primary" />
                          ) : (
                            <Tag className="h-8 w-8 text-primary" />
                          )
                        )}
                      </div>

                      {/* Receipt Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-text-primary group-hover:text-primary transition-colors duration-200 truncate">
                          {receipt.type === 'group' 
                            ? `${receipt.product_count} Products` 
                            : receipt.product_description || 'Receipt'
                          }
                        </h3>
                        <div className="flex items-center space-x-4 text-sm text-text-secondary mt-1">
                          <span>
                            {receipt.type === 'group' ? 'Multiple Brands' : (receipt.brand_name || 'Unknown')}
                          </span>
                          <span>{formatDate(receipt.purchase_date)}</span>
                          {receipt.store_name && <span>{receipt.store_name}</span>}
                        </div>
                        {receipt.type === 'group' && receipt.receipts && (
                          <div className="text-xs text-text-secondary bg-blue-50 rounded px-2 py-1 mt-2">
                            Products: {receipt.receipts.slice(0, 3).map(r => r.product_description).join(', ')}
                            {receipt.receipts.length > 3 && ` +${receipt.receipts.length - 3} more`}
                          </div>
                        )}
                      </div>

                      {/* Amount and Status */}
                      <div className="flex items-center space-x-4 flex-shrink-0">
                        {receipt.amount && (
                          <div className="text-right">
                            <span className="font-bold text-text-primary">{formatCurrency(receipt.amount)}</span>
                            {receipt.type === 'group' && (
                              <div className="text-xs text-text-secondary">Total</div>
                            )}
                          </div>
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
      <Footer />

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
                        src={signedUrls[selectedReceipt.image_url] || selectedReceipt.image_url}
                        alt={selectedReceipt.product_description || 'Receipt'}
                        className="w-full h-full object-cover object-center"
                        onError={(e) => {
                          console.error(`Failed to load image for receipt ${selectedReceipt.id} (modal):`, selectedReceipt.image_url);
                          console.error('Tried URLs:', selectedReceipt.image_url ? (signedUrls[selectedReceipt.image_url] || selectedReceipt.image_url) : 'No image URL');
                          (e.currentTarget as HTMLImageElement).src = '/receipt-placeholder.svg';
                        }}
                        onLoad={() => {
                          console.log(`✓ Image loaded successfully for receipt ${selectedReceipt.id} (modal)`);
                        }}
                      />
                    ) : (
                      <img
                        src="/receipt-placeholder.svg"
                        alt="Receipt Placeholder"
                        className="w-24 h-24 object-contain opacity-60"
                      />
                    )}
                  </div>
                </div>
                {/* Receipt Details or Edit Form */}
                <div className="space-y-4">
                  {isEditMode ? (
                    editForm.type === 'group' && editForm.receipts ? (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-text-secondary mb-1">Store</label>
                          <input type="text" className="w-full border rounded px-3 py-2" value={editForm.store_name || ''} onChange={e => handleEditFormChange('store_name', e.target.value)} />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-text-secondary mb-1">Purchase Date</label>
                          <input type="date" className="w-full border rounded px-3 py-2" value={editForm.purchase_date || ''} onChange={e => handleEditFormChange('purchase_date', e.target.value)} />
                        </div>
                        <div className="space-y-6 mt-4">
                          {editForm.receipts.map((item: any, idx: number) => (
                            <div key={item.id || idx} className="border rounded-lg p-4 bg-gray-50">
                              <div className="font-semibold mb-2">Product {idx + 1}</div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-xs font-medium text-text-secondary mb-1">Product</label>
                                  <input type="text" className="w-full border rounded px-3 py-2" value={item.product_description || ''} onChange={e => handleEditFormChange('product_description', e.target.value, idx)} />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-text-secondary mb-1">Brand</label>
                                  <input type="text" className="w-full border rounded px-3 py-2" value={item.brand_name || ''} onChange={e => handleEditFormChange('brand_name', e.target.value, idx)} />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-text-secondary mb-1">Amount</label>
                                  <input type="number" className="w-full border rounded px-3 py-2" value={item.amount || ''} onChange={e => handleEditFormChange('amount', e.target.value, idx)} />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-text-secondary mb-1">Warranty Period</label>
                                  <input type="text" className="w-full border rounded px-3 py-2" value={item.warranty_period || ''} onChange={e => handleEditFormChange('warranty_period', e.target.value, idx)} />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-text-secondary mb-1">Model Number</label>
                                  <input type="text" className="w-full border rounded px-3 py-2" value={item.model_number || ''} onChange={e => handleEditFormChange('model_number', e.target.value, idx)} />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-text-secondary mb-1">Extended Warranty</label>
                                  <input type="text" className="w-full border rounded px-3 py-2" value={item.extended_warranty || ''} onChange={e => handleEditFormChange('extended_warranty', e.target.value, idx)} />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-text-secondary mb-1">Country</label>
                                  <input type="text" className="w-full border rounded px-3 py-2" value={item.country || ''} onChange={e => handleEditFormChange('country', e.target.value, idx)} />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-text-secondary mb-1">Product</label>
                          <input type="text" className="w-full border rounded px-3 py-2" value={editForm.product_description || ''} onChange={e => handleEditFormChange('product_description', e.target.value)} />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-text-secondary mb-1">Brand</label>
                          <input type="text" className="w-full border rounded px-3 py-2" value={editForm.brand_name || ''} onChange={e => handleEditFormChange('brand_name', e.target.value)} />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-text-secondary mb-1">Store</label>
                          <input type="text" className="w-full border rounded px-3 py-2" value={editForm.store_name || ''} onChange={e => handleEditFormChange('store_name', e.target.value)} />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-text-secondary mb-1">Purchase Date</label>
                          <input type="date" className="w-full border rounded px-3 py-2" value={editForm.purchase_date || ''} onChange={e => handleEditFormChange('purchase_date', e.target.value)} />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-text-secondary mb-1">Amount</label>
                          <input type="number" className="w-full border rounded px-3 py-2" value={editForm.amount || ''} onChange={e => handleEditFormChange('amount', e.target.value)} />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-text-secondary mb-1">Warranty Period</label>
                          <input type="text" className="w-full border rounded px-3 py-2" value={editForm.warranty_period || ''} onChange={e => handleEditFormChange('warranty_period', e.target.value)} />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-text-secondary mb-1">Model Number</label>
                          <input type="text" className="w-full border rounded px-3 py-2" value={editForm.model_number || ''} onChange={e => handleEditFormChange('model_number', e.target.value)} />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-text-secondary mb-1">Extended Warranty</label>
                          <input type="text" className="w-full border rounded px-3 py-2" value={editForm.extended_warranty || ''} onChange={e => handleEditFormChange('extended_warranty', e.target.value)} />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-text-secondary mb-1">Country</label>
                          <input type="text" className="w-full border rounded px-3 py-2" value={editForm.country || ''} onChange={e => handleEditFormChange('country', e.target.value)} />
                        </div>
                      </>
                    )
                  ) : (
                    <>
                      {/* Check if this is a multi-product receipt */}
                      {selectedReceipt.type === 'group' && selectedReceipt.receipts ? (
                        <>
                          {/* Store and Purchase Info */}
                          <div>
                            <label className="block text-sm font-medium text-text-secondary mb-1">Store</label>
                            <p className="text-text-primary font-medium">{selectedReceipt.store_name}</p>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-text-secondary mb-1">Purchase Date</label>
                            <p className="text-text-primary">{formatDate(selectedReceipt.purchase_date)}</p>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-text-secondary mb-1">Total Amount</label>
                            <p className="text-text-primary font-bold">{formatCurrency(selectedReceipt.amount)}</p>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-text-secondary mb-1">Products ({selectedReceipt.product_count})</label>
                            <div className="space-y-4 mt-2">
                              {selectedReceipt.receipts.map((product: any, index: number) => (
                                <div key={product.id || index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                      <label className="block text-xs font-medium text-text-secondary mb-1">Product</label>
                                      <p className="text-sm text-text-primary font-medium">{product.product_description || 'Unknown Product'}</p>
                                    </div>
                                    <div>
                                      <label className="block text-xs font-medium text-text-secondary mb-1">Brand</label>
                                      <p className="text-sm text-text-primary">{product.brand_name || 'Unknown'}</p>
                                    </div>
                                    <div>
                                      <label className="block text-xs font-medium text-text-secondary mb-1">Amount</label>
                                      <p className="text-sm text-text-primary font-bold">{formatCurrency(product.amount || 0)}</p>
                                    </div>
                                    <div>
                                      <label className="block text-xs font-medium text-text-secondary mb-1">Warranty Status</label>
                                      {product.warranty_period ? (
                                        <div className={`flex items-center space-x-2 ${getWarrantyStatus(selectedReceipt.purchase_date, product.warranty_period).color}`}>
                                          {React.createElement(getWarrantyStatus(selectedReceipt.purchase_date, product.warranty_period).icon, { className: "h-4 w-4" })}
                                          <span className="text-xs font-medium capitalize">{getWarrantyStatus(selectedReceipt.purchase_date, product.warranty_period).status}</span>
                                          <span className="text-xs text-text-secondary">({product.warranty_period})</span>
                                        </div>
                                      ) : (
                                        <div className="flex items-center space-x-2 text-gray-500">
                                          <Clock className="h-4 w-4" />
                                          <span className="text-xs font-medium">No warranty info</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          {/* Single Product Receipt */}
                          <div>
                            <label className="block text-sm font-medium text-text-secondary mb-1">Product</label>
                            <p className="text-text-primary font-medium">{selectedReceipt.product_description || 'Receipt'}</p>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-text-secondary mb-1">Brand</label>
                            <p className="text-text-primary">{selectedReceipt.brand_name || 'Unknown'}</p>
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

                          {selectedReceipt.warranty_period && (
                            <div>
                              <label className="block text-sm font-medium text-text-secondary mb-1">Warranty Period</label>
                              <p className="text-text-primary">{selectedReceipt.warranty_period}</p>
                            </div>
                          )}

                          <div>
                            <label className="block text-sm font-medium text-text-secondary mb-1">Warranty Status</label>
                            {selectedReceipt.warranty_period ? (
                              <div className={`flex items-center space-x-2 ${getWarrantyStatus(selectedReceipt.purchase_date, selectedReceipt.warranty_period).color}`}>
                                {React.createElement(getWarrantyStatus(selectedReceipt.purchase_date, selectedReceipt.warranty_period).icon, { className: "h-5 w-5" })}
                                <span className="font-medium capitalize">{getWarrantyStatus(selectedReceipt.purchase_date, selectedReceipt.warranty_period).status}</span>
                              </div>
                            ) : (
                              <div className="flex items-center space-x-2 text-gray-500">
                                <Clock className="h-5 w-5" />
                                <span className="font-medium">No warranty info</span>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between p-6 border-t border-gray-200">
              <button
                onClick={() => handleDeleteReceipt(selectedReceipt)}
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
                <button
                  className="flex items-center space-x-2 text-text-secondary hover:text-text-primary transition-colors duration-200"
                  onClick={handleDownloadReceiptImage}
                >
                  <Download className="h-4 w-4" />
                  <span>Download</span>
                </button>
                {isEditMode ? (
                  <>
                    <button
                      className="flex items-center space-x-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors duration-200"
                      onClick={handleSaveEdit}
                      disabled={isSaving}
                    >
                      <Edit3 className="h-4 w-4" />
                      <span>{isSaving ? 'Saving...' : 'Save'}</span>
                    </button>
                    <button
                      className="flex items-center space-x-2 text-text-secondary hover:text-text-primary transition-colors duration-200 border border-gray-300 px-4 py-2 rounded-lg"
                      onClick={handleCancelEdit}
                      disabled={isSaving}
                    >
                      <span>Cancel</span>
                    </button>
                  </>
                ) : (
                  <button className="flex items-center space-x-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors duration-200" onClick={handleEditClick}>
                    <Edit3 className="h-4 w-4" />
                    <span>Edit</span>
                  </button>
                )}
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

      {/* Click outside to close notifications */}
      {showNotifications && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowNotifications(false)}
        />
      )}
    </div>
  );
};

export default MyLibrary;