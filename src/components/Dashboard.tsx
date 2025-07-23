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
import { checkEmbeddingStatus } from '../utils/generateEmbeddings';
import { RAGService } from '../services/ragService';
import { MultiProductReceiptService } from '../services/multiProductReceiptService';
import subscriptionService from '../services/subscriptionService';
import { UserSubscriptionInfo } from '../types/subscription';
import UsageIndicator from './UsageIndicator';
import { useNavigate } from 'react-router-dom';
import Footer from './Footer';
// Removed PushNotificationSetup import - push notifications disabled

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
  urgency: 'low' | 'medium' | 'high' | 'critical';
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
  
  // Subscription and usage tracking state
  const [subscriptionInfo, setSubscriptionInfo] = useState<UserSubscriptionInfo | null>(null);
  const [loadingSubscription, setLoadingSubscription] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Load actual data from database when user is available
    if (user) {
      loadDashboardData(user.id);
      loadEmbeddingStatus(user.id);
      loadNotifications(user.id);
      loadSubscriptionData(user.id);
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
      } else if (stats) {
        // Use the corrected database function results
        setSummaryStats({
          receiptsScanned: Number(stats.total_receipts), // Actual number of receipt documents
          totalAmount: Number(stats.total_amount),
          itemsCaptured: Number(stats.total_items), // Total individual items/products 
          warrantiesClaimed: Number(stats.expiring_warranties)
        });
      }

      // Convert grouped receipts to recent receipts
      const recentReceiptsData: RecentReceipt[] = groupedReceipts
        .sort((a, b) => new Date(b.purchase_date).getTime() - new Date(a.purchase_date).getTime())
        .slice(0, 5)
        .map((receipt => {
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
        }));
      setRecentReceipts(recentReceiptsData);

      // Get warranty alerts from database function instead of frontend calculation
      console.log('Loading warranty alerts from database for user:', userId);
      try {
        const { data: alertsData, error: alertsError } = await supabase.rpc('get_user_warranty_alerts', {
          user_uuid: userId
        });

        if (alertsError) {
          console.error('Error loading warranty alerts:', alertsError);
          setWarrantyAlerts([]);
          setAlertsCount(0);
        } else {
          console.log('Database warranty alerts found:', alertsData?.length || 0, alertsData);
          
          // Convert database alerts to frontend format
          const alerts: WarrantyAlert[] = (alertsData || []).map((alert: any) => ({
            id: alert.id,
            itemName: alert.product_description || 'Unknown Product',
            purchaseDate: alert.purchase_date,
            expiryDate: alert.warranty_expiry_date,
            daysLeft: alert.days_until_expiry,
            urgency: alert.urgency as 'low' | 'medium' | 'high' | 'critical'
          }));

          console.log('✅ Warranty alerts loaded successfully:', alerts.length);
          setWarrantyAlerts(alerts);
          setAlertsCount(alerts.length);
        }
      } catch (alertsError) {
        console.error('Failed to load warranty alerts:', alertsError);
        setWarrantyAlerts([]);
        setAlertsCount(0);
      }

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load subscription and usage data
  const loadSubscriptionData = async (userId: string) => {
    try {
      setLoadingSubscription(true);
      
      const subscriptionData = await subscriptionService.getSubscriptionInfo(userId);
      
      if (subscriptionData) {
        setSubscriptionInfo(subscriptionData);
      } else {
        // Initialize subscription for new users
        await subscriptionService.initializeUserSubscription(userId);
        const newSubscriptionData = await subscriptionService.getSubscriptionInfo(userId);
        setSubscriptionInfo(newSubscriptionData);
      }
    } catch (error) {
      console.error('Error loading subscription data:', error);
      // Set default free tier if we can't load subscription data
      setSubscriptionInfo({
        plan: 'free',
        status: 'active',
        cancel_at_period_end: false,
        receipts_used: 0,
        receipts_limit: 5,
        usage_month: new Date().toISOString().substring(0, 7)
      });
    } finally {
      setLoadingSubscription(false);
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

  // One-time function to index existing receipts (for receipts created before automatic indexing)
  const handleIndexExistingReceipts = async () => {
    if (!user) return;
    
    setIsGeneratingEmbeddings(true);
    try {
      console.log('🔄 Indexing existing receipts for AI search...');
      
      // Get all receipts without embeddings
      const { data: receipts, error: fetchError } = await supabase
        .from('receipts')
        .select('id, product_description, brand_name, model_number, store_name, purchase_location, warranty_period, embedding')
        .eq('user_id', user.id)
        .is('embedding', null);

      if (fetchError) {
        throw new Error(`Failed to fetch receipts: ${fetchError.message}`);
      }

      if (!receipts || receipts.length === 0) {
        alert('✅ All receipts are already indexed for AI search!');
        await loadEmbeddingStatus(user.id);
        return;
      }

      console.log(`Found ${receipts.length} receipts to index`);

      let successful = 0;
      let errors = 0;

      // Process receipts one by one
      for (const receipt of receipts) {
        try {
          // Create content for embedding
          const content = [
            receipt.product_description || '',
            receipt.brand_name || '',
            receipt.model_number || '',
            receipt.store_name || '',
            receipt.purchase_location || '',
            receipt.warranty_period || ''
          ].filter(Boolean).join(' ');

          if (!content.trim()) {
            console.warn(`Skipping receipt ${receipt.id} - no content to embed`);
            continue;
          }

          console.log(`Generating embedding for receipt ${receipt.id}: "${content.substring(0, 100)}..."`);

          // Generate embedding directly using OpenAI API
          const openaiApiKey = import.meta.env.VITE_OPENAI_API_KEY;
          
          if (!openaiApiKey) {
            throw new Error('OpenAI API key not configured');
          }

          const response = await fetch('https://api.openai.com/v1/embeddings', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${openaiApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'text-embedding-3-small',
              input: content,
              dimensions: 384
            })
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
          }

          const result = await response.json();
          const embedding = result.data[0].embedding;

          // Save the embedding directly to the database
          const { error: updateError } = await supabase
            .from('receipts')
            .update({ embedding: embedding })
            .eq('id', receipt.id);

          if (updateError) {
            throw new Error(`Database update failed: ${updateError.message}`);
          }

          console.log(`✓ Successfully generated and saved embedding for receipt ${receipt.id}`);
          successful++;
        } catch (error) {
          console.error(`Failed to generate embedding for receipt ${receipt.id}:`, error);
          errors++;
        }
      }
      
      // Refresh embedding status
      await loadEmbeddingStatus(user.id);
      
      // Show success message
      const message = `✅ Indexing completed!\n\n` +
        `Successfully indexed: ${successful} receipts\n` +
        `Errors: ${errors} receipts\n\n` +
        `🎉 Your AI search is now ready! Try questions like "Show me Nintendo products" or "How much did I spend on electronics?"`;
      
      alert(message);
      
    } catch (error) {
      console.error('Failed to index existing receipts:', error);
      alert('❌ Failed to index receipts. Please check the console for details.');
    } finally {
      setIsGeneratingEmbeddings(false);
    }
  };

  // Enhanced Smart Search functionality with RAG
  const performSmartSearch = async (query: string) => {
    console.log('🚀 performSmartSearch called with:', query);
    console.log('🚀 User exists:', !!user);
    
    if (!query.trim() || !user) {
      console.log('❌ Early return: empty query or no user');
      setSearchResults([]);
      setRagResult(null);
      return;
    }

    console.log('✅ Starting search process...');
    setIsSearching(true);
    setSearchError(null);
    setRagResult(null);

    try {
      // Try direct database search first (bypassing edge function issues)
      console.log('🔍 Trying direct database search...');
      
      // Extract keywords from natural language query
      const keywords = query.toLowerCase()
        .replace(/[?!.,]/g, '') // Remove punctuation
        .split(' ')
        .filter(word => word.length > 2 && !['did', 'purchase', 'buy', 'any', 'the', 'and'].includes(word));
      
      console.log('🔑 Extracted keywords:', keywords);
      
      // Build search conditions for each keyword
      const searchConditions = keywords.map(keyword => 
        `product_description.ilike.%${keyword}%,brand_name.ilike.%${keyword}%,model_number.ilike.%${keyword}%,store_name.ilike.%${keyword}%`
      ).join(',');
      
      console.log('🔎 Search conditions:', searchConditions);
      
      // Search using extracted keywords
      const { data: receipts, error } = await supabase
        .from('receipts')
        .select('*')
        .eq('user_id', user.id)
        .or(searchConditions)
        .limit(10);

      if (error) {
        console.error('❌ Database search error:', error);
        throw new Error(`Database search failed: ${error.message}`);
      }

      console.log('📋 Direct database search found:', receipts?.length || 0, 'receipts');

      const searchResults = (receipts || []).map(receipt => ({
        id: receipt.id,
        title: receipt.product_description || 'Unknown Product',
        brand: receipt.brand_name || 'Unknown Brand',
        model: receipt.model_number,
        purchaseDate: receipt.purchase_date,
        amount: receipt.amount,
        warrantyPeriod: receipt.warranty_period || 'Unknown',
        store_name: receipt.store_name,
        purchase_location: receipt.purchase_location,
        relevanceScore: 0.8 // Higher score for direct matches
      }));

      console.log('✅ Search results prepared:', searchResults.length);
      setSearchResults(searchResults);

      // Check if this query would benefit from RAG processing
      const isRAGQuery = RAGService.isRAGQuery(query);
      
      if (isRAGQuery && searchResults.length > 0) {
        try {
          console.log('🤖 Starting RAG processing for natural language query...');
          
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
            console.warn('⚠️ RAG processing failed (but search still works):', ragResponse.error);
            
            // Provide a simple fallback answer based on search results
            setRagResult({
              answer: `I found ${searchResults.length} receipt${searchResults.length !== 1 ? 's' : ''} matching your query. ${searchResults.map(r => `• ${r.title} from ${r.brand || 'Unknown Brand'} ($${r.amount || 'Unknown amount'})`).join('\n')}`,
              queryType: 'question'
            });
          } else {
            setRagResult({
              answer: ragResponse.answer,
              queryType: ragResponse.queryType,
            });
            console.log('✅ RAG processing successful');
          }
        } catch (ragError: any) {
          console.warn('⚠️ RAG processing error (search still works):', ragError.message);
          
          // Provide a simple fallback answer
          setRagResult({
            answer: `I found ${searchResults.length} receipt${searchResults.length !== 1 ? 's' : ''} matching "${query}". The search results show your purchases above.`,
            queryType: 'question'
          });
        }
      }

    } catch (err: any) {
      console.error('❌ Smart search error:', err);
      console.error('❌ Error details:', err.message, err.stack);
      setSearchError(err.message || 'Search failed. Please try again.');
      
      // Fallback to local search
      console.log('🔄 Falling back to local search...');
      performLocalSearch(query);
    } finally {
      console.log('🏁 Search process finished');
      setIsSearching(false);
    }
  };

  // Fallback local search
  const performLocalSearch = async (query: string) => {
    console.log('🔍 performLocalSearch called with:', query);
    if (!user) {
      console.log('❌ No user for local search');
      return;
    }
    console.log('⏳ Starting local search...');
    try {
      const { data: receipts, error } = await supabase
        .from('receipts')
        .select('*')
        .eq('user_id', user.id)
        .or(`product_description.ilike.%${query}%,brand_name.ilike.%${query}%,model_number.ilike.%${query}%,store_name.ilike.%${query}%,purchase_location.ilike.%${query}%`)
        .limit(5);

      if (error) {
        console.error('❌ Local search error:', error);
        return;
      }

      console.log('📋 Local search found receipts:', receipts?.length || 0);

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

      console.log('✅ Local search results prepared:', localResults.length);
      setSearchResults(localResults);
    } catch (error) {
      console.error('❌ Local search failed:', error);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('🔍 Search submitted:', searchQuery);
    console.log('🔍 User ID:', user?.id);
    console.log('🔍 Environment vars:', {
      supabaseUrl: import.meta.env.VITE_SUPABASE_URL ? 'Set' : 'Missing',
      anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Set' : 'Missing'
    });
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
      case 'critical': return 'border-red-600 bg-red-100';
      case 'high': return 'border-accent-red bg-red-50';
      case 'medium': return 'border-accent-yellow bg-yellow-50';
      case 'low': return 'border-primary bg-green-50';
      default: return 'border-gray-300 bg-gray-50';
    }
  };

  const getUrgencyIcon = (urgency: string) => {
    switch (urgency) {
      case 'critical': return <AlertTriangle className="h-5 w-5 text-red-600 animate-pulse" />;
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
    try {
      // Immediately update local state to hide the notification
      setNotifications(prev => prev.filter(n => n.id !== id));
      
      // Then update the database
      await archiveNotification(id);
      
      // Optionally reload to ensure consistency (but notification already removed from UI)
      if (user) {
        const { data } = await getUserNotifications(user.id);
        if (data) {
          const cleanedNotifications = removeDuplicateNotifications(data);
          setNotifications(cleanedNotifications);
        }
      }
    } catch (error) {
      console.error('Error archiving notification:', error);
      // On error, reload notifications to restore the correct state
      if (user) loadNotifications(user.id);
    }
  };

  // Archive (clear) all notifications
  const handleArchiveAllNotifications = async () => {
    if (!user) return;
    
    try {
      setArchivingAll(true);
      
      // Immediately clear local state
      setNotifications([]);
      
      // Then update the database
      await archiveAllNotifications(user.id);
      
      // Reload to ensure consistency
      await loadNotifications(user.id);
    } catch (error) {
      console.error('Error archiving all notifications:', error);
      // On error, reload notifications to restore the correct state
      if (user) loadNotifications(user.id);
    } finally {
      setArchivingAll(false);
    }
  };

  // Count of unread notifications
  const unreadCount = notifications.filter(n => !n.read && !n.archived).length;

  // When a new warranty alert is generated, create milestone-based notifications
  useEffect(() => {
    const createMilestoneWarrantyNotifications = async () => {
      if (user && warrantyAlerts.length > 0) {
        console.log('📋 Processing warranty alerts for milestone notifications:', warrantyAlerts.length);
        
        for (const alert of warrantyAlerts) {
          console.log(`🔍 Processing ${alert.itemName} (${alert.daysLeft} days remaining)`);
          
          // Determine all applicable milestones for this item
          const applicableMilestones = [];
          
          if (alert.daysLeft <= 7) {
            applicableMilestones.push({ threshold: 7, urgency: 'critical' });
          }
          if (alert.daysLeft <= 30) {
            applicableMilestones.push({ threshold: 30, urgency: 'high' });
          }
          if (alert.daysLeft <= 90) {
            applicableMilestones.push({ threshold: 90, urgency: 'medium' });
          }
          if (alert.daysLeft <= 180) {
            applicableMilestones.push({ threshold: 180, urgency: 'low' });
          }
          
          // For each applicable milestone, check if notification was already dismissed
          for (const milestone of applicableMilestones) {
            console.log(`🔍 Checking milestone ${milestone.threshold} days for ${alert.itemName}`);
            
            // Check if this specific milestone notification was dismissed
            const wasDismissed = await wasNotificationDismissed(user.id, alert.itemName, milestone.threshold);
            
            // Also check if there's already an active notification for this milestone
            const { data: activeNotifications } = await supabase
              .from('notifications')
              .select('*')
              .eq('user_id', user.id)
              .eq('type', 'warranty_alert')
              .eq('archived', false) // Only check active notifications
              .ilike('message', `%${alert.itemName}%`)
              .ilike('message', `%${milestone.threshold} day threshold%`);
            
            const hasActiveNotification = (activeNotifications || []).length > 0;
            
            if (!wasDismissed && !hasActiveNotification) {
              console.log(`🔔 Creating ${milestone.urgency.toUpperCase()} notification for ${alert.itemName} (${alert.daysLeft} days remaining)`);
              
              const milestoneMessage = `Warranty for ${alert.itemName} expires in ${alert.daysLeft} days. (${milestone.urgency.toUpperCase()} - ${milestone.threshold} day threshold)`;
              await createNotification(user.id, 'warranty_alert', milestoneMessage);
              
              // For critical alerts (≤7 days), create additional urgent notification
              if (milestone.urgency === 'critical') {
                const urgentWasDismissed = await wasNotificationDismissed(user.id, alert.itemName, 1); // Check for urgent dismissal
                if (!urgentWasDismissed) {
                  const urgentMessage = `🚨 URGENT: Warranty for ${alert.itemName} expires in ${alert.daysLeft} days!`;
                  await createNotification(user.id, 'warranty_alert', urgentMessage);
                }
              }
            } else {
              console.log(`⏭️ Skipping ${milestone.urgency} notification for ${alert.itemName} - wasDismissed: ${wasDismissed}, hasActive: ${hasActiveNotification}`);
            }
          }
        }
        
        // Reload notifications after possible creation
        await loadNotifications(user.id);
      }
    };

    // Add a small delay to prevent continuous recreation
    const timeoutId = setTimeout(() => {
      createMilestoneWarrantyNotifications();
    }, 1000);

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [warrantyAlerts, user]);

  // Debug function to log notification status
  const debugNotificationStatus = async () => {
    if (!user) return;
    
    console.log('🔍 NOTIFICATION DEBUG STATUS:');
    
    // Get all notifications for user
    const { data: allNotifications } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .eq('type', 'warranty_alert')
      .order('created_at', { ascending: false });
    
    console.log('📋 All warranty notifications:', allNotifications?.length || 0);
    
    allNotifications?.forEach((n, index) => {
      console.log(`${index + 1}. ${n.archived ? '❌ DISMISSED' : '✅ ACTIVE'}: ${n.message}`);
    });
    
    // Check warranty alerts
    console.log('⚠️ Current warranty alerts:', warrantyAlerts.length);
    warrantyAlerts.forEach((alert, index) => {
      console.log(`${index + 1}. ${alert.itemName}: ${alert.daysLeft} days (${alert.urgency})`);
    });
  };

  // Add debug button (temporary for testing)
  useEffect(() => {
    if (user && warrantyAlerts.length > 0) {
      // Add debug logging after a short delay
      setTimeout(() => {
        debugNotificationStatus();
      }, 2000);
    }
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
                      onClick={() => {
                        navigate('/subscription');
                        setShowUserMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-text-secondary hover:bg-gray-100 hover:text-text-primary transition-colors duration-200 flex items-center space-x-2"
                    >
                      <Shield className="h-4 w-4" />
                      <span>Subscription</span>
                      {subscriptionInfo && subscriptionInfo.plan === 'free' && (
                        <span className="ml-auto bg-primary text-white text-xs px-2 py-0.5 rounded-full">
                          Free
                        </span>
                      )}
                      {subscriptionInfo && subscriptionInfo.plan === 'premium' && (
                        <span className="ml-auto bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">
                          Pro
                        </span>
                      )}
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

        {/* Usage Indicator - Freemium Model */}
        {!loadingSubscription && subscriptionInfo && (
          <div className="mb-8">
            <UsageIndicator
              receiptsUsed={subscriptionInfo.receipts_used}
              receiptsLimit={subscriptionInfo.receipts_limit}
              plan={subscriptionInfo.plan}
            />
          </div>
        )}

        {/* Push Notification Setup */}
        {/* Removed PushNotificationSetup component */}
        
        {/* Note: Only in-app notifications are enabled. Android push notifications when app is closed have been disabled. */}

        {/* Quick Access Tiles */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {/* Scan Receipt Card - Modified to handle free tier limits */}
          {subscriptionInfo && subscriptionInfo.plan === 'free' && subscriptionInfo.receipts_used >= subscriptionInfo.receipts_limit ? (
            // Disabled state for free users who reached limit
            <div className="group bg-gradient-to-br from-gray-400 to-gray-500 p-8 rounded-2xl shadow-card border-2 border-red-300 relative overflow-hidden">
              {/* Upgrade Badge */}
              <div className="absolute top-3 right-3 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                LIMIT REACHED
              </div>
              
              <div className="flex flex-col items-center text-center">
                <div className="bg-white/20 rounded-full p-4 mb-4 relative">
                  <Camera className="h-8 w-8 text-white opacity-50" />
                  {/* Lock icon overlay */}
                  <div className="absolute -bottom-1 -right-1 bg-red-500 rounded-full p-1">
                    <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                <h3 className="text-xl font-bold mb-2 text-white">Monthly Limit Reached</h3>
                <p className="text-white/90 text-sm mb-4">
                  You've used {subscriptionInfo.receipts_used}/{subscriptionInfo.receipts_limit} receipts this month
                </p>
                <button
                  onClick={() => navigate('/subscription')}
                  className="bg-gradient-to-r from-primary to-secondary text-white px-6 py-3 rounded-lg font-bold hover:shadow-lg transform hover:scale-105 transition-all duration-200 text-sm"
                >
                  🚀 Upgrade to Premium
                </button>
                <p className="text-white/70 text-xs mt-2">Unlimited scanning + Premium features</p>
              </div>
            </div>
          ) : (
            // Normal functional state
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
                {/* Show remaining scans for free users */}
                {subscriptionInfo && subscriptionInfo.plan === 'free' && (
                  <div className="mt-2 bg-white/20 rounded-full px-3 py-1">
                    <span className="text-xs font-medium text-white">
                      {subscriptionInfo.receipts_limit - subscriptionInfo.receipts_used} scans left this month
                    </span>
                  </div>
                )}
              </div>
            </button>
          )}

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
                      These are existing receipts that need one-time indexing. New receipts are automatically indexed.
                    </p>
                  </div>
                  <div>
                    <button
                      onClick={handleIndexExistingReceipts}
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
                          <span>Index Now</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* AI Search Status - Show when all receipts are indexed */}
            {embeddingStatus && embeddingStatus.withoutEmbeddings === 0 && embeddingStatus.total > 0 && (
              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <Brain className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-green-800 font-medium">
                      ✅ All {embeddingStatus.total} receipts are indexed for AI search
                    </p>
                    <p className="text-xs text-green-700 mt-1">
                      New receipts will be automatically indexed when added.
                    </p>
                  </div>
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