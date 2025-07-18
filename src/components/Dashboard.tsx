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
  Loader2,
  Database,
  Brain,
  Lightbulb,
  Package
} from 'lucide-react';
import { signOut, supabase, getUserReceipts, getUserReceiptStats, getUserNotifications, archiveNotification, archiveAllNotifications, createNotification, wasNotificationDismissed, cleanupDuplicateNotifications, Notification } from '../lib/supabase';
import { useUser } from '../contexts/UserContext';
import { generateEmbeddingsForAllReceipts, checkEmbeddingStatus } from '../utils/generateEmbeddings';
import { RAGService } from '../services/ragService';
import { MultiProductReceiptService } from '../services/multiProductReceiptService';
import { useNavigate } from 'react-router-dom';
import Footer from './Footer';
import PushNotificationSetup from './PushNotificationSetup';

interface DashboardProps {
  onSignOut: () => void;
  onShowReceiptScanning: () => void;
  onShowProfile: () => void;
  onShowLibrary: () => void;
  onShowWarranty: () => void;
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
  type: 'single' | 'group';
  productName: string;
  storeName: string;
  brandName: string;
  date: string;
  amount: number;
  items: number;
  receipts?: any[]; // For grouped receipts
  receipt_total?: number; // For grouped receipts
  product_count?: number; // For grouped receipts
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

interface RAGResult {
  answer: string;
  queryType: 'search' | 'summary' | 'question';
  error?: string;
}

const Dashboard: React.FC<DashboardProps> = ({ onSignOut, onShowReceiptScanning, onShowProfile, onShowLibrary, onShowWarranty }) => {
  const { user, profilePicture } = useUser();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [alertsCount, setAlertsCount] = useState(0);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotificationMenu, setShowNotificationMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isGeneratingEmbeddings, setIsGeneratingEmbeddings] = useState(false);
  const [embeddingStatus, setEmbeddingStatus] = useState<{total: number, withEmbeddings: number, withoutEmbeddings: number} | null>(null);
  const [ragResult, setRagResult] = useState<RAGResult | null>(null);
  
  const [summaryStats, setSummaryStats] = useState<SummaryStats>({
    receiptsScanned: 0,
    totalAmount: 0,
    itemsCaptured: 0,
    warrantiesClaimed: 0
  });
  const [warrantyAlerts, setWarrantyAlerts] = useState<WarrantyAlert[]>([]);
  const [recentReceipts, setRecentReceipts] = useState<RecentReceipt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState<string | null>(null);
  const [archivingAll, setArchivingAll] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Load actual data from database when user is available
    if (user) {
      loadDashboardData(user.id);
      loadEmbeddingStatus(user.id);
      loadNotifications(user.id);
    }
  }, [user]);

  useEffect(() => {
    // Update time every minute
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  // Fetch notifications on load
  useEffect(() => {
    if (user) {
      loadNotifications(user.id);
    }
  }, [user]);

  const loadDashboardData = async (userId: string) => {
    try {
      setIsLoading(true);

      // Load grouped receipts using the new service
      const groupedReceipts = await MultiProductReceiptService.getGroupedReceipts(userId);

      // Load receipt statistics using the database function
      const { data: stats, error: statsError } = await getUserReceiptStats(userId);

      if (statsError) {
        console.warn('Error loading receipt stats:', statsError);
        // Use fallback calculation based on grouped receipts
        const totalReceipts = groupedReceipts.length; // This is the correct count of actual receipts
        const totalAmount = groupedReceipts.reduce((sum, receipt) => {
          if (receipt.type === 'group') {
            return sum + (receipt.receipt_total || 0);
          } else {
            return sum + (receipt.amount || 0);
          }
        }, 0);
        
        // Calculate total items by counting individual products
        const totalItems = groupedReceipts.reduce((sum, receipt) => {
          if (receipt.type === 'group') {
            return sum + (receipt.product_count || 0);
          } else {
            return sum + 1; // Single product receipt = 1 item
          }
        }, 0);
        
        const fallbackStats: SummaryStats = {
          receiptsScanned: totalReceipts, // Actual number of receipts scanned
          totalAmount: totalAmount,
          itemsCaptured: totalItems, // Total number of individual items/products
          warrantiesClaimed: 0
        };
        setSummaryStats(fallbackStats);
      } else {
        // Calculate items from grouped receipts even when stats are available
        const totalItems = groupedReceipts.reduce((sum, receipt) => {
          if (receipt.type === 'group') {
            return sum + (receipt.product_count || 0);
          } else {
            return sum + 1; // Single product receipt = 1 item
          }
        }, 0);
        
        const summaryStats: SummaryStats = {
          receiptsScanned: groupedReceipts.length, // Use actual grouped receipts count
          totalAmount: stats.total_amount || 0,
          itemsCaptured: totalItems, // Use calculated items count
          warrantiesClaimed: 0 // This would need a separate tracking mechanism
        };
        setSummaryStats(summaryStats);
      }

      // Process recent receipts with proper grouping
      const recentReceiptsData: RecentReceipt[] = groupedReceipts
        .slice(0, 4)
        .map(receipt => {
          if (receipt.type === 'group') {
            // Multi-product receipt group
            const firstProduct = receipt.receipts[0];
            return {
              id: receipt.id,
              type: 'group',
              productName: `${receipt.product_count} Products`,
              storeName: receipt.store_name || 'Unknown Store',
              brandName: 'Multiple Brands',
              date: receipt.purchase_date,
              amount: receipt.receipt_total || 0,
              items: receipt.product_count || 0,
              receipts: receipt.receipts,
              receipt_total: receipt.receipt_total,
              product_count: receipt.product_count
            };
          } else {
            // Single product receipt
            return {
              id: receipt.id,
              type: 'single',
              productName: receipt.product_description || 'Unknown Product',
              storeName: receipt.store_name || 'Unknown Store',
              brandName: receipt.brand_name || 'Unknown Brand',
              date: receipt.purchase_date,
              amount: receipt.amount || 0,
              items: 1
            };
          }
        });
      setRecentReceipts(recentReceiptsData);

      // Calculate warranty alerts from all individual receipts (including grouped ones)
      const allReceipts = groupedReceipts.flatMap(receipt => {
        if (receipt.type === 'group') {
          return receipt.receipts;
        } else {
          return [receipt];
        }
      });

      console.log('Processing warranty alerts for receipts:', allReceipts.length);
      console.log('Sample receipts:', allReceipts.slice(0, 3).map(r => ({
        id: r.id,
        product: r.product_description,
        brand: r.brand_name,
        purchase_date: r.purchase_date,
        warranty_period: r.warranty_period
      })));

      // Check for specific items we're looking for
      const targetItems = allReceipts.filter(r => 
        r.product_description?.toLowerCase().includes('nintendo') ||
        r.product_description?.toLowerCase().includes('dji') ||
        r.product_description?.toLowerCase().includes('microsoft') ||
        r.product_description?.toLowerCase().includes('surface')
      );
      
      console.log('Target electronics items found:', targetItems.length);
      targetItems.forEach(item => {
        console.log(`Target item: ${item.product_description}`, {
          purchase_date: item.purchase_date,
          warranty_period: item.warranty_period,
          brand: item.brand_name
        });
      });

      const alerts: WarrantyAlert[] = allReceipts
        .map(receipt => {
          // Skip items without purchase date
          if (!receipt.purchase_date) {
            console.log(`Skipping ${receipt.product_description} - no purchase date`);
            return null;
          }
          
          // Use enhanced warranty period detection for electronics
          let warrantyPeriod = receipt.warranty_period;
          if (!warrantyPeriod || warrantyPeriod.trim() === '') {
            warrantyPeriod = getDefaultWarrantyPeriod(receipt.product_description, receipt.brand_name);
            console.log(`Applied default warranty for ${receipt.product_description}: ${warrantyPeriod}`);
          }
          
          const warrantyExpiry = calculateWarrantyExpiry(receipt.purchase_date, warrantyPeriod);
          const daysLeft = Math.ceil((warrantyExpiry.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
          
          console.log(`Warranty check for ${receipt.product_description}:`, {
            purchase_date: receipt.purchase_date,
            original_warranty_period: receipt.warranty_period,
            calculated_warranty_period: warrantyPeriod,
            warranty_expiry: warrantyExpiry.toISOString().split('T')[0],
            days_left: daysLeft,
            within_threshold: daysLeft > 0 && daysLeft <= 180
          });
          
          // Only include items with warranties expiring in the next 6 months
          if (daysLeft > 0 && daysLeft <= 180) {
            const alert = {
              id: receipt.id,
              itemName: receipt.product_description || 'Unknown Product',
              purchaseDate: receipt.purchase_date,
              expiryDate: warrantyExpiry.toISOString().split('T')[0],
              daysLeft,
              urgency: daysLeft <= 30 ? 'high' : daysLeft <= 90 ? 'medium' : 'low'
            };
            console.log(`✅ Adding warranty alert for ${receipt.product_description}:`, alert);
            return alert;
          } else {
            console.log(`❌ Not adding alert for ${receipt.product_description} - days left: ${daysLeft}`);
          }
          return null;
        })
        .filter(alert => alert !== null)
        .sort((a, b) => a!.daysLeft - b!.daysLeft)
        .slice(0, 6) as WarrantyAlert[]; // Increased from 3 to 6 to show more items

      console.log('Warranty alerts found:', alerts.length, alerts);
      setWarrantyAlerts(alerts);
      setAlertsCount(alerts.length);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadEmbeddingStatus = async (userId: string) => {
    try {
      const status = await checkEmbeddingStatus(userId);
      setEmbeddingStatus(status);
    } catch (error) {
      console.error('Failed to load embedding status:', error);
    }
  };

  const handleGenerateEmbeddings = async () => {
    if (!user) return;
    
    setIsGeneratingEmbeddings(true);
    try {
      const result = await generateEmbeddingsForAllReceipts(user.id);
      console.log('Embedding generation result:', result);
      
      // Refresh embedding status
      await loadEmbeddingStatus(user.id);
      
      // Show success message
      alert(`Embedding generation completed!\n${result.message}`);
      
    } catch (error) {
      console.error('Failed to generate embeddings:', error);
      alert('Failed to generate embeddings. Please try again.');
    } finally {
      setIsGeneratingEmbeddings(false);
    }
  };

  const calculateWarrantyExpiry = (purchaseDate: string, warrantyPeriod: string): Date => {
    const purchase = new Date(purchaseDate);
    
    // Handle null, undefined, or empty warranty period
    if (!warrantyPeriod || warrantyPeriod.trim() === '') {
      // Default to 1 year for items without warranty period specified
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

  // Enhanced warranty period detection for electronics
  const getDefaultWarrantyPeriod = (productDescription: string, brandName: string): string => {
    const product = (productDescription || '').toLowerCase();
    const brand = (brandName || '').toLowerCase();
    
    // Gaming consoles and accessories - typically 1 year
    if (product.includes('nintendo') || product.includes('xbox') || product.includes('playstation') || 
        product.includes('ps5') || product.includes('ps4') || product.includes('switch')) {
      return '1 year';
    }
    
    // Drones and camera equipment - typically 1 year
    if (product.includes('dji') || product.includes('drone') || product.includes('gimbal') || 
        brand.includes('dji')) {
      return '1 year';
    }
    
    // Computers and tablets - typically 1 year
    if (product.includes('surface') || product.includes('laptop') || product.includes('computer') ||
        product.includes('microsoft') || product.includes('macbook') || product.includes('ipad')) {
      return '1 year';
    }
    
    // Smartphones - typically 1 year
    if (product.includes('iphone') || product.includes('samsung') || product.includes('pixel') ||
        product.includes('phone')) {
      return '1 year';
    }
    
    // TVs and large appliances - typically 1 year
    if (product.includes('tv') || product.includes('television') || product.includes('lg') ||
        product.includes('sony') || product.includes('samsung')) {
      return '1 year';
    }
    
    // Default for all other electronics
    return '1 year';
  };

  // Enhanced Smart Search functionality with RAG
  const performSmartSearch = async (query: string) => {
    if (!query.trim() || !user) {
      setSearchResults([]);
      setRagResult(null);
      return;
    }

    setIsSearching(true);
    setSearchError(null);
    setRagResult(null);

    try {
      // First, perform the vector search to get relevant receipts
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

      const searchResults = data.results || [];
      setSearchResults(searchResults);

      // Check if this query would benefit from RAG processing
      const isRAGQuery = RAGService.isRAGQuery(query);
      
      if (isRAGQuery && searchResults.length > 0) {
        try {
          // Convert search results to Receipt format for RAG
          const receiptsForRAG = searchResults.map((result: any) => ({
            id: result.id,
            product_description: result.title,
            brand_name: result.brand,
            store_name: result.store_name || 'Unknown Store',
            purchase_location: result.purchase_location || 'Unknown Location',
            purchase_date: result.purchaseDate,
            amount: result.amount || 0,
            warranty_period: result.warrantyPeriod,
            model_number: result.model || '',
            country: result.country || 'Unknown Country',
            relevanceScore: result.relevanceScore
          }));

          // Process with RAG
          const ragResponse = await RAGService.processQuery(query, receiptsForRAG, user.id);
          
          if (ragResponse.error) {
            console.warn('RAG processing failed:', ragResponse.error);
          } else {
            setRagResult({
              answer: ragResponse.answer,
              queryType: ragResponse.queryType,
            });
          }
        } catch (ragError) {
          console.warn('RAG processing error:', ragError);
          // Don't fail the search if RAG fails
        }
      }

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
    if (!user) return;
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
    setRagResult(null);
  };

  // Update the search results display section
  const renderSearchResults = () => {
    if (searchResults.length === 0 && searchQuery && !isSearching) {
      return (
        <div className="text-center py-8">
          <Search className="h-12 w-12 text-text-secondary mx-auto mb-4" />
          <p className="text-text-secondary">No receipts found matching your search.</p>
          <p className="text-sm text-text-secondary mt-1">Try different keywords or check your spelling.</p>
        </div>
      );
    }
    
    if (searchResults.length > 0) {
      return (
        <>
          {/* RAG Answer Display */}
          {ragResult && (
            <div className="mb-6 p-4 bg-gradient-to-r from-primary/5 to-secondary/5 border border-primary/20 rounded-xl">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-1">
                  {ragResult.queryType === 'summary' ? (
                    <DollarSign className="h-5 w-5 text-primary" />
                  ) : ragResult.queryType === 'question' ? (
                    <Lightbulb className="h-5 w-5 text-primary" />
                  ) : (
                    <Brain className="h-5 w-5 text-primary" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <h3 className="text-sm font-semibold text-primary">
                      {ragResult.queryType === 'summary' ? 'Summary' : 
                       ragResult.queryType === 'question' ? 'Answer' : 'AI Analysis'}
                    </h3>
                    <span className="text-xs text-text-secondary bg-primary/10 px-2 py-1 rounded-full">
                      AI-Generated
                    </span>
                  </div>
                  <div className="text-sm text-text-primary whitespace-pre-wrap">
                    {ragResult.answer}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Traditional Search Results */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-text-primary">
              {ragResult ? 'Related Receipts' : 'Search Results'}
            </h3>
            <span className="text-sm text-text-secondary bg-gray-100 px-3 py-1 rounded-full">
              {searchResults.length} {searchResults.length === 1 ? 'result' : 'results'}
            </span>
          </div>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {searchResults.map((result, index) => (
              <div
                key={result.id}
                className="flex items-start justify-between p-4 rounded-lg border border-gray-200 hover:border-primary/30 hover:bg-gray-50 transition-all duration-200 cursor-pointer group"
                onClick={() => {
                  // Navigate to MyLibrary with the specific receipt ID
                  navigate('/library', { state: { openReceiptId: result.id } });
                }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-3 mb-2">
                    <h4 className="text-base font-semibold text-text-primary group-hover:text-primary transition-colors duration-200 truncate">
                      {result.title}
                    </h4>
                    <div className="flex items-center space-x-1 text-xs text-text-secondary bg-primary/10 px-2 py-1 rounded-full flex-shrink-0">
                      <span>Match:</span>
                      <span className="font-medium text-primary">{Math.round(result.relevanceScore * 100)}%</span>
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
                      <Shield className="h-4 w-4" />
                      <span>Warranty: {result.warrantyPeriod}</span>
                    </div>
                  </div>
                </div>
                
                <button 
                  className="ml-4 text-text-secondary group-hover:text-primary transition-colors duration-200"
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent card click event
                    navigate('/library', { state: { openReceiptId: result.id } });
                  }}
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            ))}
          </div>
        </>
      );
    }
    
    if (!searchQuery) {
      return (
        <div className="text-center py-8">
          <div className="bg-gradient-to-br from-primary/10 to-secondary/10 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <Search className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-lg font-medium text-text-primary mb-2">Smart Search with AI</h3>
          <p className="text-text-secondary max-w-md mx-auto mb-4">
            Ask questions about your receipts in natural language. Try queries like:
          </p>
          <div className="text-sm text-text-secondary space-y-1 max-w-sm mx-auto">
            <p>• "How much did I spend on electronics?"</p>
            <p>• "Show me all Apple receipts from 2024"</p>
            <p>• "What warranties expire soon?"</p>
          </div>
        </div>
      );
    }
    
    return null;
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
    const filtered: Notification[] = [];
    
    // Sort by creation date (newest first) to keep the most recent duplicate
    const sorted = [...notifications].sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    
    for (const notification of sorted) {
      if (notification.type === 'warranty_alert') {
        // Extract item name from message
        const match = notification.message.match(/Warranty for (.+?) expires in/);
        const itemName = match ? match[1] : notification.message;
        
        if (!seen.has(itemName)) {
          seen.add(itemName);
          filtered.push(notification);
        }
      } else {
        // Keep all non-warranty notifications
        filtered.push(notification);
      }
    }
    
    return filtered;
  };

  // Archive (clear) a single notification
  const handleArchiveNotification = async (id: string) => {
    await archiveNotification(id);
    if (user) loadNotifications(user.id);
  };

  // Archive (clear) all notifications
  const handleArchiveAllNotifications = async () => {
    if (!user) return;
    setArchivingAll(true);
    await archiveAllNotifications(user.id);
    await loadNotifications(user.id);
    setArchivingAll(false);
  };

  // Count of unread notifications
  const unreadCount = notifications.filter(n => !n.read && !n.archived).length;

  // When a new warranty alert is generated, create a notification only if it does not exist in the DB
  useEffect(() => {
    const createWarrantyNotifications = async () => {
      if (user && warrantyAlerts.length > 0) {
        // Fetch all current notifications from DB (including archived ones to prevent re-creation)
        const { data: dbNotifications } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .eq('type', 'warranty_alert');
        
        for (const alert of warrantyAlerts) {
          // Create a unique identifier based on the item name and receipt ID
          const uniqueIdentifier = `${alert.itemName}_${alert.id}`;
          
          // Check if a notification for this specific item already exists (archived or not)
          const alreadyExists = (dbNotifications || []).some(
            n => n.message.includes(alert.itemName) && n.message.includes('expires in')
          );

                     // Check if the notification was previously dismissed
           const wasDismissed = await wasNotificationDismissed(user.id, alert.itemName);

          // Only create notification if it doesn't exist at all or if it was dismissed
          if (!alreadyExists && !wasDismissed) {
            const message = `Warranty for ${alert.itemName} expires in ${alert.daysLeft} days.`;
            await createNotification(user.id, 'warranty_alert', message);
            
            // Also send push notification for Android notification center
            try {
              const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-push-notification`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  userId: user.id,
                  title: 'Warranty Alert - Smart Receipts',
                  body: message,
                  data: { 
                    type: 'warranty_alert', 
                    receiptId: alert.id,
                    url: '/warranty'
                  }
                })
              });
              
              if (!response.ok) {
                console.warn('Failed to send push notification:', await response.text());
              }
            } catch (error) {
              console.error('Error sending push notification:', error);
            }
          }
        }
        
        // Reload notifications after possible creation
        await loadNotifications(user.id);
      }
    };
    createWarrantyNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [warrantyAlerts, user]);

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
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-accent-red text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {/* Notification Dropdown */}
                {showNotificationMenu && (
                  <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-card border border-gray-200 py-2 z-50">
                    <div className="px-4 py-2 border-b border-gray-200 flex items-center justify-between">
                      <h3 className="font-medium text-text-primary">Notifications</h3>
                      {notifications.length > 0 && (
                        <button
                          onClick={handleArchiveAllNotifications}
                          disabled={archivingAll}
                          className="text-xs text-primary hover:underline disabled:opacity-50"
                        >
                          {archivingAll ? 'Clearing...' : 'Clear All'}
                        </button>
                      )}
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notificationsLoading ? (
                        <div className="px-4 py-8 text-center text-text-secondary">Loading...</div>
                      ) : notificationsError ? (
                        <div className="px-4 py-8 text-center text-red-500">{notificationsError}</div>
                      ) : notifications.length === 0 ? (
                        <div className="px-4 py-8 text-center">
                          <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                          <p className="text-sm text-text-secondary">No notifications at this time</p>
                        </div>
                      ) : (
                        notifications.map((n) => (
                          <div key={n.id} className="px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 flex items-start justify-between">
                            <div className="flex-1">
                              <div className="text-sm font-medium text-text-primary mb-1">{n.message}</div>
                              <div className="text-xs text-text-secondary">
                                {n.type.replace('_', ' ')} • {new Date(n.created_at).toLocaleString()}
                              </div>
                            </div>
                            <button
                              onClick={() => handleArchiveNotification(n.id)}
                              className="ml-4 text-xs text-primary hover:underline"
                            >
                              Clear
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Settings Button */}
              <button
                onClick={() => {
                  onShowProfile();
                }}
                className="p-2 text-text-secondary hover:text-text-primary transition-colors duration-200"
                title="Settings"
              >
                <Settings className="h-6 w-6" />
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

        {/* Push Notification Setup */}
        <PushNotificationSetup onSetupComplete={(enabled) => {
          console.log('Push notifications:', enabled ? 'enabled' : 'disabled');
        }} />

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
            onClick={onShowWarranty}
            className="group bg-gradient-to-br from-red-500 to-orange-600 p-8 rounded-2xl shadow-card hover:shadow-card-hover transition-all duration-300 transform hover:-translate-y-2 text-white"
          >
            <div className="flex flex-col items-center text-center">
              <div className="bg-white/20 rounded-full p-4 mb-4 group-hover:bg-white/30 transition-colors duration-300">
                <Shield className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-bold mb-2">Warranty Manager</h3>
              <p className="text-white/90">Track and manage your product warranties</p>
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

        {/* Smart Search Section */}
        <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-text-primary flex items-center space-x-2">
              <Search className="h-6 w-6 text-primary" />
              <span>Smart Search</span>
            </h2>
            <div className="flex items-center space-x-3">
              <span className="text-sm text-text-secondary bg-gradient-to-r from-primary/10 to-secondary/10 px-3 py-1 rounded-full">
                AI-Powered
              </span>
              {embeddingStatus && (
                <span className="text-xs text-text-secondary">
                  {embeddingStatus.withEmbeddings}/{embeddingStatus.total} indexed
                </span>
              )}
            </div>
          </div>

          {/* Smart Search Input */}
          <div className="mb-6">
            <form onSubmit={handleSearchSubmit} className="relative">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-text-secondary" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full pl-12 pr-24 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors duration-200 bg-gray-50 hover:bg-white focus:bg-white"
                  placeholder="Ask questions about your receipts: 'How much did I spend on electronics?' or 'Show me Apple receipts'"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={clearSearch}
                      className="text-text-secondary hover:text-text-primary transition-colors duration-200 p-1 mr-2"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={isSearching || !searchQuery.trim()}
                    className="bg-primary text-white px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
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
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{searchError}</p>
              </div>
            )}

            {/* Embedding Status and Generate Button */}
            {embeddingStatus && embeddingStatus.withoutEmbeddings > 0 && (
              <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-yellow-800">
                      <strong>{embeddingStatus.withoutEmbeddings}</strong> receipts need to be indexed for AI search
                    </p>
                    <p className="text-xs text-yellow-700 mt-1">
                      Generate embeddings to enable smart search functionality
                    </p>
                  </div>
                  <button
                    onClick={handleGenerateEmbeddings}
                    disabled={isGeneratingEmbeddings}
                    className="bg-yellow-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-yellow-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    {isGeneratingEmbeddings ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Indexing...</span>
                      </>
                    ) : (
                      <>
                        <Database className="h-4 w-4" />
                        <span>Index Receipts</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Smart Search Results */}
          {renderSearchResults()}
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
                    className={`p-4 rounded-lg border-2 ${getUrgencyColor(alert.urgency)} hover:shadow-md transition-shadow duration-200 cursor-pointer`}
                    onClick={() => navigate('/warranty', { state: { id: alert.id } })}
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

            <button 
              onClick={onShowWarranty}
              className="w-full mt-4 text-center text-primary hover:text-primary/80 font-medium py-2 transition-colors duration-200"
            >
              View All Warranties
            </button>
          </div>

          {/* Recent Receipts */}
          <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-text-primary">Recent Receipts</h2>
                          <button 
              onClick={() => navigate('/library')}
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
                    onClick={() => navigate('/library', { state: { openReceiptId: receipt.id } })}
                  >
                    <div className="flex items-center space-x-4">
                      <div className="bg-gradient-feature rounded-lg p-3">
                        {receipt.type === 'group' ? (
                          <Package className="h-5 w-5 text-primary" />
                        ) : (
                          <Receipt className="h-5 w-5 text-primary" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-text-primary group-hover:text-primary transition-colors duration-200 truncate max-w-xs" title={receipt.productName}>
                          {receipt.productName}
                        </h3>
                        <div className="text-sm text-text-secondary space-y-1">
                          <div className="flex items-center space-x-1">
                            <span className="font-medium">Store:</span>
                            <span className="truncate">{receipt.storeName}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <span className="font-medium">
                              {receipt.type === 'group' ? 'Products:' : 'Brand:'}
                            </span>
                            <span className="truncate">
                              {receipt.type === 'group' 
                                ? `${receipt.product_count} items` 
                                : receipt.brandName
                              }
                            </span>
                          </div>
                          <div className="text-xs text-text-secondary">
                            {formatDate(receipt.date)} • {receipt.items} {receipt.items === 1 ? 'item' : 'items'}
                          </div>
                          {receipt.type === 'group' && receipt.receipts && (
                            <div className="text-xs text-text-secondary bg-blue-50 rounded px-2 py-1 mt-2">
                              Products: {receipt.receipts.map(r => r.product_description).join(', ')}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-4">
                      <div className="font-bold text-text-primary">
                        {formatCurrency(receipt.amount)}
                      </div>
                      {receipt.type === 'group' && (
                        <div className="text-xs text-text-secondary">
                          Total Receipt
                        </div>
                      )}
                      <ChevronRight className="h-4 w-4 text-text-secondary group-hover:text-primary transition-colors duration-200 ml-auto" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />

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