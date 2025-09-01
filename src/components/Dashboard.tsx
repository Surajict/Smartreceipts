import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, 
  FolderOpen, 
  Search, 
  Bell, 
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
  Brain,
  Lightbulb,
  Package,
  Moon,
  Sun,
  Mic,
  MicOff,
  Square,
  FileText
} from 'lucide-react';
import { signOut, supabase, getUserReceiptStats, getUserNotifications, archiveNotification, archiveAllNotifications, createNotification, wasNotificationDismissed, cleanupDuplicateNotifications, Notification } from '../lib/supabase';
import { useUser } from '../contexts/UserContext';
import { checkEmbeddingStatus } from '../utils/generateEmbeddings';
import { RAGService } from '../services/ragService';
import { MultiProductReceiptService } from '../services/multiProductReceiptService';
import subscriptionService from '../services/subscriptionService';
import onboardingService from '../services/onboardingService';
import warrantyClaimsService from '../services/warrantyClaimsService';
import { UserSubscriptionInfo } from '../types/subscription';
import { useSubscription } from '../contexts/SubscriptionContext';
import { useTheme } from '../contexts/ThemeContext';
import UsageIndicator from './UsageIndicator';
import OnboardingTour from './OnboardingTour';
import ContextualTooltip from './ContextualTooltip';
import { useNavigate, useLocation } from 'react-router-dom';
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
  const { user, profilePicture, refreshProfilePicture } = useUser();
  const { theme, toggleTheme } = useTheme();
  const { subscriptionInfo: globalSubscriptionInfo } = useSubscription();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotificationMenu, setShowNotificationMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [embeddingStatus, setEmbeddingStatus] = useState<{total: number, withEmbeddings: number, withoutEmbeddings: number} | null>(null);
  const [ragResult, setRagResult] = useState<RAGResult | null>(null);
  
  // Voice transcription state
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [transcriptionError, setTranscriptionError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  const [summaryStats, setSummaryStats] = useState<SummaryStats>({
    receiptsScanned: 0,
    totalAmount: 0,
    itemsCaptured: 0,
    warrantiesClaimed: 0
  });
  const [warrantyClaimsStats, setWarrantyClaimsStats] = useState({ total_claims: 0, submitted_claims: 0, completed_claims: 0 });
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
  
  // Onboarding state
  const [showOnboardingTour, setShowOnboardingTour] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Load actual data from database when user is available
    if (user) {
      loadDashboardData(user.id);
      loadEmbeddingStatus(user.id);
      loadNotifications(user.id);
      loadSubscriptionData(user.id);
      
      // Load warranty claims stats with a slight delay to ensure other data is loaded first
      setTimeout(() => {
        loadWarrantyClaimsStats(user.id);
      }, 500);
      
      checkAndShowTour(user.id);
    }
  }, [user]);

  // Auto-refresh warranty claims stats
  useEffect(() => {
    if (!user) return;

    // Set up periodic refresh every 30 seconds
    const refreshInterval = setInterval(() => {
      console.log('⏰ Dashboard: Periodic refresh of warranty claims stats');
      loadWarrantyClaimsStats(user.id);
    }, 30000); // 30 seconds

    const handleFocus = () => {
      console.log('🔄 Dashboard: Window focused, refreshing warranty claims stats');
      loadWarrantyClaimsStats(user.id);
    };

    // Also listen for visibility change (when switching tabs)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('🔄 Dashboard: Tab visible again, refreshing warranty claims stats');
        loadWarrantyClaimsStats(user.id);
      }
    };

    // Listen for route changes (when user navigates back to dashboard)
    const handleRouteChange = () => {
      console.log('🔄 Dashboard: Route changed, refreshing warranty claims stats');
      setTimeout(() => {
        loadWarrantyClaimsStats(user.id);
      }, 100);
    };
    
    // Add event listeners
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('popstate', handleRouteChange);

    return () => {
      clearInterval(refreshInterval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('popstate', handleRouteChange);
    };
  }, [user]);

  // Refresh warranty claims when navigating to dashboard
  useEffect(() => {
    if (user && location.pathname === '/dashboard') {
      console.log('🔄 Dashboard: Navigated to dashboard, refreshing warranty claims stats');
      setTimeout(() => {
        loadWarrantyClaimsStats(user.id);
      }, 200);
    }
  }, [location.pathname, user]);

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
      
      console.log('📊 Dashboard: Starting to load all dashboard data for user:', userId);

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
        }
      } catch (alertsError) {
        console.error('Failed to load warranty alerts:', alertsError);
        setWarrantyAlerts([]);
      }

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setIsLoading(false);
      
      // Load warranty claims stats after main dashboard data is loaded
      console.log('📊 Dashboard: Main data loaded, now loading warranty claims stats');
      setTimeout(() => {
        loadWarrantyClaimsStats(userId);
      }, 100);
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

  // Check and show tour for first-time users
  const checkAndShowTour = async (userId: string) => {
    try {
      // Show tour for first-time users who haven't completed it
      const shouldShowTour = await onboardingService.shouldShowTour(userId);
      if (shouldShowTour) {
        // Small delay to let the UI render first
        setTimeout(() => {
          setShowOnboardingTour(true);
        }, 1000);
      }
    } catch (error) {
      console.error('Error checking tour status:', error);
    }
  };


  // Handle onboarding tour completion
  const handleTourComplete = async () => {
    if (user) {
      await onboardingService.completeTour(user.id);
      setShowOnboardingTour(false);
    }
  };

  // Handle onboarding tour skip
  const handleTourSkip = async () => {
    if (user) {
      await onboardingService.skipTour(user.id);
      setShowOnboardingTour(false);
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

  const loadWarrantyClaimsStats = async (userId: string) => {
    try {
      console.log('🔍 Dashboard: Loading warranty claims stats for user:', userId);
      
      // Use the exact same call as WarrantyClaims component
      const { data: statsData, error: statsError } = await warrantyClaimsService.getClaimsStats(userId);
      console.log('📊 Dashboard: Warranty claims stats response:', { statsData, statsError });
      
      if (!statsError && statsData) {
        console.log('✅ Dashboard: Setting warranty claims stats:', statsData);
        setWarrantyClaimsStats(statsData);
        
        // Update the summary stats with actual warranty claims count
        setSummaryStats(prev => {
          const updated = {
            ...prev,
            warrantiesClaimed: statsData.total_claims
          };
          console.log('📈 Dashboard: Updated summary stats with warranties claimed:', updated.warrantiesClaimed);
          return updated;
        });
      } else {
        console.log('❌ Dashboard: No warranty claims data or error:', statsError);
        // Set zero stats if there's an error or no data
        setSummaryStats(prev => ({
          ...prev,
          warrantiesClaimed: 0
        }));
      }
    } catch (error) {
      console.error('❌ Dashboard: Failed to load warranty claims stats:', error);
      // Set zero stats on error
      setSummaryStats(prev => ({
        ...prev,
        warrantiesClaimed: 0
      }));
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

  // Voice transcription functions
  const startRecording = async () => {
    try {
      setTranscriptionError(null);
      
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000
        } 
      });
      
      // Initialize MediaRecorder with better format support
      let mimeType = 'audio/webm;codecs=opus';
      
      // Try different formats for better compatibility
      if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      } else if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/webm')) {
        mimeType = 'audio/webm';
      }
      
      console.log('Using MIME type:', mimeType);
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: mimeType
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        await transcribeAudio(audioBlob, mimeType);
        
        // Clean up stream
        stream.getTracks().forEach(track => track.stop());
      };
      
      // Start recording
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      // Start timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          const newTime = prev + 1;
          // Auto-stop after 30 seconds
          if (newTime >= 30) {
            stopRecording();
          }
          return newTime;
        });
      }, 1000);
      
    } catch (error: any) {
      console.error('Error starting recording:', error);
      setTranscriptionError(
        error.name === 'NotAllowedError' 
          ? 'Microphone access denied. Please allow microphone access and try again.'
          : 'Failed to start recording. Please check your microphone.'
      );
    }
  };
  
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    }
  };
  
  const transcribeAudio = async (audioBlob: Blob, originalMimeType: string) => {
    try {
      setIsTranscribing(true);
      setTranscriptionError(null);
      
      console.log('Original audio blob:', audioBlob.size, 'bytes, type:', audioBlob.type);
      
      // Determine the best file extension and format for OpenAI
      let filename = 'recording.webm';
      let processedBlob = audioBlob;
      
      if (originalMimeType.includes('mp4')) {
        filename = 'recording.m4a';
      } else if (originalMimeType.includes('webm')) {
        filename = 'recording.webm';
      }
      
      // For WebM, we might need to convert to a more compatible format
      if (originalMimeType.includes('webm')) {
        try {
          // Try to convert WebM to MP3 or WAV for better OpenAI compatibility
          processedBlob = await convertWebMToCompatibleFormat(audioBlob);
          filename = 'recording.mp3';
        } catch (conversionError) {
          console.warn('Audio conversion failed, using original format:', conversionError);
          // Fall back to original format
          processedBlob = audioBlob;
        }
      }
      
      console.log('Processed audio blob:', processedBlob.size, 'bytes, filename:', filename);
      
      // Prepare form data for webhook
      const formData = new FormData();
      formData.append('audio_file', processedBlob, filename);
      
      // Call n8n webhook
      const response = await fetch('https://n8n.srv904649.hstgr.cloud/webhook/audio-to-transcribe', {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Webhook error response:', errorText);
        throw new Error(`Transcription failed: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('Transcription result:', result);
      
      // Extract transcribed text - handle different response formats
      let transcribedText = '';
      
      if (Array.isArray(result) && result.length > 0) {
        // Handle array format like [{"Transcript": "text"}]
        const firstItem = result[0];
        transcribedText = firstItem.Transcript || firstItem.transcript || firstItem.text || firstItem.transcription || '';
      } else if (typeof result === 'object') {
        // Handle object format like {"Transcript": "text"} or {"text": "text"}
        transcribedText = result.Transcript || result.transcript || result.text || result.transcription || '';
      } else if (typeof result === 'string') {
        // Handle direct string response
        transcribedText = result;
      }
      
      console.log('Extracted transcribed text:', transcribedText);
      
      if (transcribedText && transcribedText.trim()) {
        setSearchQuery(transcribedText.trim());
        console.log('✅ Search query set to:', transcribedText.trim());
      } else {
        console.warn('❌ No transcribed text found in response:', result);
        setTranscriptionError('No speech detected. Please try again.');
      }
      
    } catch (error: any) {
      console.error('Transcription error:', error);
      setTranscriptionError(
        error.message || 'Failed to transcribe audio. Please try again.'
      );
    } finally {
      setIsTranscribing(false);
      setRecordingTime(0);
    }
  };
  
  // Convert WebM to a more compatible format for OpenAI
  const convertWebMToCompatibleFormat = async (audioBlob: Blob): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      try {
        // Create an audio context for processing
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const fileReader = new FileReader();
        
        fileReader.onload = async (e) => {
          try {
            const arrayBuffer = e.target?.result as ArrayBuffer;
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            
            // Convert to WAV format
            const wavBlob = audioBufferToWav(audioBuffer);
            resolve(wavBlob);
          } catch (decodeError) {
            console.error('Audio decode error:', decodeError);
            // If conversion fails, return original blob
            resolve(audioBlob);
          }
        };
        
        fileReader.onerror = () => {
          reject(new Error('Failed to read audio file'));
        };
        
        fileReader.readAsArrayBuffer(audioBlob);
      } catch (error) {
        console.error('Audio conversion error:', error);
        // If conversion fails, return original blob
        resolve(audioBlob);
      }
    });
  };
  
  // Convert AudioBuffer to WAV Blob
  const audioBufferToWav = (audioBuffer: AudioBuffer): Blob => {
    const length = audioBuffer.length;
    const sampleRate = audioBuffer.sampleRate;
    const numberOfChannels = audioBuffer.numberOfChannels;
    
    // Create buffer for WAV file
    const buffer = new ArrayBuffer(44 + length * numberOfChannels * 2);
    const view = new DataView(buffer);
    
    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length * numberOfChannels * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numberOfChannels * 2, true);
    view.setUint16(32, numberOfChannels * 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length * numberOfChannels * 2, true);
    
    // Convert float samples to 16-bit PCM
    let offset = 44;
    for (let i = 0; i < length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, audioBuffer.getChannelData(channel)[i]));
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
        offset += 2;
      }
    }
    
    return new Blob([buffer], { type: 'audio/wav' });
  };
  
  // Format recording time as MM:SS
  const formatRecordingTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Markdown renderer component
  const MarkdownRenderer: React.FC<{ content: string }> = ({ content }) => {
    const renderMarkdown = (text: string) => {
      // Split text into paragraphs
      const paragraphs = text.split('\n\n').filter(p => p.trim());
      
      return paragraphs.map((paragraph, paragraphIndex) => {
        // Process each line within the paragraph
        const lines = paragraph.split('\n');
        const processedLines = lines.map((line, lineIndex) => {
          // Handle headings
          if (line.startsWith('### ')) {
            return (
              <h3 key={`${paragraphIndex}-${lineIndex}`} className="text-lg font-bold text-text-primary mb-2 mt-4">
                {line.replace('### ', '')}
              </h3>
            );
          }
          if (line.startsWith('## ')) {
            return (
              <h2 key={`${paragraphIndex}-${lineIndex}`} className="text-xl font-bold text-text-primary mb-2 mt-4">
                {line.replace('## ', '')}
              </h2>
            );
          }
          if (line.startsWith('# ')) {
            return (
              <h1 key={`${paragraphIndex}-${lineIndex}`} className="text-2xl font-bold text-text-primary mb-3 mt-4">
                {line.replace('# ', '')}
              </h1>
            );
          }

          // Handle numbered lists
          if (/^\d+\.\s/.test(line)) {
            const listContent = line.replace(/^\d+\.\s/, '');
            return (
              <div key={`${paragraphIndex}-${lineIndex}`} className="ml-4 mb-1">
                <span className="font-medium text-primary">{line.match(/^\d+/)?.[0]}.</span>
                <span className="ml-2">{processInlineFormatting(listContent)}</span>
              </div>
            );
          }

          // Handle bullet points
          if (line.startsWith('• ') || line.startsWith('- ')) {
            const bulletContent = line.replace(/^[•-]\s/, '');
            return (
              <div key={`${paragraphIndex}-${lineIndex}`} className="ml-4 mb-1 flex items-start">
                <span className="text-primary font-bold mr-2 mt-0.5">•</span>
                <span className="flex-1">{processInlineFormatting(bulletContent)}</span>
              </div>
            );
          }

          // Regular line
          if (line.trim()) {
            return (
              <div key={`${paragraphIndex}-${lineIndex}`} className="mb-1">
                {processInlineFormatting(line)}
              </div>
            );
          }

          return null;
        }).filter(Boolean);

        return (
          <div key={paragraphIndex} className="mb-3">
            {processedLines}
          </div>
        );
      });
    };

    const processInlineFormatting = (text: string) => {
      // Process bold text (**text** or __text__)
      text = text.replace(/\*\*(.*?)\*\*/g, (_, content) => {
        return `<BOLD>${content}</BOLD>`;
      });
      text = text.replace(/__(.*?)__/g, (_, content) => {
        return `<BOLD>${content}</BOLD>`;
      });

      // Process italic text (*text* or _text_)
      text = text.replace(/\*([^*]+)\*/g, (_, content) => {
        return `<ITALIC>${content}</ITALIC>`;
      });
      text = text.replace(/_([^_]+)_/g, (_, content) => {
        return `<ITALIC>${content}</ITALIC>`;
      });

      // Process underline text (~~text~~)
      text = text.replace(/~~(.*?)~~/g, (_, content) => {
        return `<UNDERLINE>${content}</UNDERLINE>`;
      });

      // Process inline code (`code`)
      text = text.replace(/`([^`]+)`/g, (_, content) => {
        return `<CODE>${content}</CODE>`;
      });

      // Split by our custom tags and render
      const segments = text.split(/(<BOLD>.*?<\/BOLD>|<ITALIC>.*?<\/ITALIC>|<UNDERLINE>.*?<\/UNDERLINE>|<CODE>.*?<\/CODE>)/);

      return segments.map((segment, index) => {
        if (segment.startsWith('<BOLD>')) {
          return (
            <strong key={`bold-${index}`} className="font-bold text-text-primary">
              {segment.replace(/<\/?BOLD>/g, '')}
            </strong>
          );
        }
        if (segment.startsWith('<ITALIC>')) {
          return (
            <em key={`italic-${index}`} className="italic text-text-primary">
              {segment.replace(/<\/?ITALIC>/g, '')}
            </em>
          );
        }
        if (segment.startsWith('<UNDERLINE>')) {
          return (
            <u key={`underline-${index}`} className="underline text-text-primary">
              {segment.replace(/<\/?UNDERLINE>/g, '')}
            </u>
          );
        }
        if (segment.startsWith('<CODE>')) {
          return (
            <code key={`code-${index}`} className="bg-gray-100 text-primary px-1 py-0.5 rounded text-xs font-mono">
              {segment.replace(/<\/?CODE>/g, '')}
            </code>
          );
        }
        return segment;
      });
    };

    return <div className="text-sm text-text-primary">{renderMarkdown(content)}</div>;
  };
  
  // Clean up on component unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      if (mediaRecorderRef.current && isRecording) {
        stopRecording();
      }
    };
  }, []);

  // Handle voice input button click
  const handleVoiceInput = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
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
                  <MarkdownRenderer content={ragResult.answer} />
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
            {searchResults.map((result) => (
              <div
                key={result.id}
                className="flex items-start justify-between p-4 rounded-lg border border-gray-200 hover:border-primary/30 hover:bg-gray-50 transition-all duration-200 cursor-pointer group"
                onClick={() => {
                  // Navigate to MyLibrary with the specific receipt ID
                  navigate('/library', { state: { openReceiptId: result.id } });
                }}
              >
                                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 sm:space-x-3 mb-2">
                      <h4 className="text-sm sm:text-base font-semibold text-text-primary group-hover:text-primary transition-colors duration-200 truncate">
                        {result.title}
                      </h4>
                    <div className="flex items-center space-x-1 text-xs text-text-secondary bg-primary/10 px-2 py-1 rounded-full flex-shrink-0">
                      <span>Match:</span>
                      <span className="font-medium text-primary">{Math.round(result.relevanceScore * 100)}%</span>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-text-secondary">
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
      case 'critical': return 'border-red-600 bg-red-100 text-red-900';
      case 'high': return 'border-accent-red bg-red-50 text-red-800';
      case 'medium': return 'border-accent-yellow bg-yellow-50 text-yellow-900';
      case 'low': return 'border-primary bg-green-50 text-green-800';
      default: return 'border-gray-300 bg-gray-50 text-gray-800';
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
      <header className="fixed top-0 left-0 right-0 z-50 bg-white shadow-card border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8">
          <div className="flex justify-between items-center h-16 min-w-0">
            {/* Logo */}
            <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-shrink-0">
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
                {globalSubscriptionInfo?.plan === 'premium' && (
                  <div className="absolute -top-3 right-0 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-lg">
                    PREMIUM
                  </div>
                )}
              </div>
            </div>

            {/* Header Actions */}
            <div className="flex items-center space-x-2 sm:space-x-4">
              {/* Notifications */}
              <div className="relative" data-tour="notifications">
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
                  <div className="mobile-dropdown-fix fixed sm:absolute right-2 sm:right-0 top-16 sm:top-auto sm:mt-2 left-2 sm:left-auto sm:w-72 md:w-80 lg:w-96 bg-white rounded-lg shadow-card border border-gray-200 py-2 z-50 max-w-none sm:max-w-[calc(100vw-1rem)]">
                    <div className="px-3 sm:px-4 py-2 border-b border-gray-200 flex items-center justify-between">
                      <h3 className="font-medium text-text-primary text-sm sm:text-base">Notifications</h3>
                      {notifications.length > 0 && (
                        <button
                          onClick={handleArchiveAllNotifications}
                          disabled={archivingAll}
                          className="text-xs text-primary hover:underline disabled:opacity-50 flex-shrink-0"
                        >
                          {archivingAll ? 'Clearing...' : 'Clear All'}
                        </button>
                      )}
                    </div>
                    <div className="max-h-48 xs:max-h-56 sm:max-h-80 overflow-y-auto">
                      {notificationsLoading ? (
                        <div className="px-3 sm:px-4 py-6 sm:py-8 text-center text-text-secondary">
                          <div className="text-sm">Loading...</div>
                        </div>
                      ) : notificationsError ? (
                        <div className="px-3 sm:px-4 py-6 sm:py-8 text-center text-red-500">
                          <div className="text-sm">{notificationsError}</div>
                        </div>
                      ) : notifications.length === 0 ? (
                        <div className="px-3 sm:px-4 py-6 sm:py-8 text-center">
                          <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 text-green-500 mx-auto mb-2" />
                          <p className="text-xs sm:text-sm text-text-secondary">No notifications at this time</p>
                        </div>
                      ) : (
                        notifications.map((n) => (
                          <div key={n.id} className="px-3 sm:px-4 py-2 sm:py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 flex items-start justify-between min-w-0">
                            <div className="flex-1 min-w-0 pr-2">
                              <div className="text-xs sm:text-sm font-medium text-text-primary mb-1 break-words">{n.message}</div>
                              <div className="text-xs text-text-secondary">
                                {n.type.replace('_', ' ')} • {new Date(n.created_at).toLocaleDateString()}
                              </div>
                            </div>
                            <button
                              onClick={() => handleArchiveNotification(n.id)}
                              className="text-xs text-primary hover:underline flex-shrink-0"
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
                        onError={(e) => {
                          console.log('Profile picture failed to load, retrying...');
                          // Try to refresh the profile picture URL
                          refreshProfilePicture();
                        }}
                        onLoad={() => {
                          console.log('Profile picture loaded successfully');
                        }}
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
                  <div className="fixed sm:absolute right-2 sm:right-0 top-16 sm:top-auto sm:mt-2 left-auto sm:left-auto w-44 sm:w-48 bg-white rounded-lg shadow-card border border-gray-200 py-2 z-50 max-w-none sm:max-w-[calc(100vw-1rem)]">
                    <div className="px-3 sm:px-4 py-2 border-b border-gray-200">
                      <p className="text-sm font-medium text-text-primary truncate">
                        {user?.user_metadata?.full_name || 'User'}
                      </p>
                      <p className="text-xs text-text-secondary truncate">{user?.email}</p>
                    </div>
                    <button
                      onClick={() => {
                        onShowProfile();
                        setShowUserMenu(false);
                      }}
                      className="w-full text-left px-3 sm:px-4 py-2 text-sm text-text-secondary hover:bg-gray-100 hover:text-text-primary transition-colors duration-200 flex items-center space-x-2"
                    >
                      <User className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">Profile Settings</span>
                    </button>
                    <button
                      onClick={() => {
                        navigate('/subscription');
                        setShowUserMenu(false);
                      }}
                      className="w-full text-left px-3 sm:px-4 py-2 text-sm text-text-secondary hover:bg-gray-100 hover:text-text-primary transition-colors duration-200 flex items-center space-x-2"
                    >
                      <Shield className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">Subscription</span>
                      {subscriptionInfo && subscriptionInfo.plan === 'free' && (
                        <span className="ml-auto bg-primary text-white text-xs px-2 py-0.5 rounded-full flex-shrink-0">
                          Free
                        </span>
                      )}
                      {subscriptionInfo && subscriptionInfo.plan === 'premium' && (
                        <span className="ml-auto bg-green-500 text-white text-xs px-2 py-0.5 rounded-full flex-shrink-0">
                          Pro
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => { toggleTheme(); setShowUserMenu(false); }}
                      className="w-full text-left px-3 sm:px-4 py-2 text-sm text-text-secondary hover:bg-gray-100 hover:text-text-primary transition-colors duration-200 flex items-center space-x-2"
                    >
                      {theme === 'dark' ? <Sun className="h-4 w-4 flex-shrink-0" /> : <Moon className="h-4 w-4 flex-shrink-0" />}
                      <span className="truncate">Night Mode {theme === 'dark' ? 'On' : 'Off'}</span>
                    </button>
                    <button
                      onClick={handleSignOut}
                      className="w-full text-left px-3 sm:px-4 py-2 text-sm text-text-secondary hover:bg-gray-100 hover:text-text-primary transition-colors duration-200 flex items-center space-x-2"
                    >
                      <LogOut className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-6 sm:py-8 pt-20 sm:pt-24">
        {/* Welcome Section */}
        <div className="mb-8" data-tour="welcome-section">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-text-primary mb-2">
            {getGreeting()}, {user?.user_metadata?.full_name?.split(' ')[0] || 'there'}!
          </h1>
          <p className="text-base sm:text-lg lg:text-xl text-text-secondary">
            Ready to manage your receipts and warranties smartly?
          </p>
        </div>

        {/* Usage Indicator - Freemium Model - Only show for free users */}
        {!loadingSubscription && subscriptionInfo && subscriptionInfo.plan === 'free' && (
          <div className="mb-8" data-tour="usage-indicator">
            <div className="flex items-center space-x-2">
              <UsageIndicator
                receiptsUsed={subscriptionInfo.receipts_used}
                receiptsLimit={subscriptionInfo.receipts_limit}
                plan={subscriptionInfo.plan}
              />
              <ContextualTooltip
                title="Usage Tracking"
                content="Free users get 5 receipts to try Smart Receipts. Upgrade to Premium for unlimited receipt scanning and advanced features like AI validation and smart search."
                position="bottom"
              />
            </div>
          </div>
        )}

        {/* Push Notification Setup */}
        {/* Removed PushNotificationSetup component */}
        
        {/* Note: Only in-app notifications are enabled. Android push notifications when app is closed have been disabled. */}

        {/* Quick Access Tiles */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8 sm:mb-12">
          {/* Scan Receipt Card - Modified to handle free tier limits */}
          {subscriptionInfo && subscriptionInfo.plan === 'free' && subscriptionInfo.receipts_used >= subscriptionInfo.receipts_limit ? (
            // Disabled state for free users who reached limit
            <div className="group bg-gradient-to-br from-gray-400 to-gray-500 p-6 sm:p-8 rounded-xl sm:rounded-2xl shadow-card border-2 border-red-300 relative overflow-hidden">
              {/* Upgrade Badge */}
              <div className="absolute top-3 right-3 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                LIMIT REACHED
              </div>
              
              <div className="flex flex-col items-center text-center">
                <div className="bg-white/20 rounded-full p-3 sm:p-4 mb-3 sm:mb-4 relative">
                  <Camera className="h-6 w-6 sm:h-8 sm:w-8 text-white opacity-50" />
                  {/* Lock icon overlay */}
                  <div className="absolute -bottom-1 -right-1 bg-red-500 rounded-full p-1">
                    <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                <h3 className="text-lg sm:text-xl font-bold mb-2 text-white">Monthly Limit Reached</h3>
                <p className="text-white/90 text-xs sm:text-sm mb-4">
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
              className="group bg-gradient-to-br from-blue-500 to-blue-700 p-6 sm:p-8 rounded-xl sm:rounded-2xl shadow-card hover:shadow-card-hover transition-all duration-300 transform hover:-translate-y-2 text-white"
              data-tour="scan-receipt"
            >
              <div className="flex flex-col items-center text-center">
                <div className="bg-white/20 rounded-full p-3 sm:p-4 mb-3 sm:mb-4 group-hover:bg-white/30 transition-colors duration-300">
                  <Camera className="h-6 w-6 sm:h-8 sm:w-8" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold mb-2">Scan Receipt</h3>
                <p className="text-white/90 text-sm sm:text-base">Capture and digitize your receipts instantly</p>
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
            className="group bg-gradient-to-br from-secondary to-purple-600 p-6 sm:p-8 rounded-xl sm:rounded-2xl shadow-card hover:shadow-card-hover transition-all duration-300 transform hover:-translate-y-2 text-white"
            data-tour="my-library"
          >
            <div className="flex flex-col items-center text-center">
              <div className="bg-white/20 rounded-full p-3 sm:p-4 mb-3 sm:mb-4 group-hover:bg-white/30 transition-colors duration-300">
                <FolderOpen className="h-6 w-6 sm:h-8 sm:w-8" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold mb-2">My Library</h3>
              <p className="text-white/90 text-sm sm:text-base">Browse and organize your receipt collection</p>
            </div>
          </button>

          <button 
            onClick={onShowWarranty}
            className="group bg-gradient-to-br from-primary to-teal-600 p-6 sm:p-8 rounded-xl sm:rounded-2xl shadow-card hover:shadow-card-hover transition-all duration-300 transform hover:-translate-y-2 text-white"
            data-tour="warranty-manager"
          >
            <div className="flex flex-col items-center text-center">
              <div className="bg-white/20 rounded-full p-3 sm:p-4 mb-3 sm:mb-4 group-hover:bg-white/30 transition-colors duration-300">
                <Shield className="h-6 w-6 sm:h-8 sm:w-8" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold mb-2">Warranty Manager</h3>
              <p className="text-white/90 text-sm sm:text-base">Track and manage your product warranties</p>
            </div>
          </button>

          <button 
            onClick={() => navigate('/warranty-claims')}
            className="group bg-gradient-to-br from-pink-400 to-rose-500 p-6 sm:p-8 rounded-xl sm:rounded-2xl shadow-card hover:shadow-card-hover transition-all duration-300 transform hover:-translate-y-2 text-white"
            data-tour="warranty-claims"
          >
            <div className="flex flex-col items-center text-center">
              <div className="bg-white/20 rounded-full p-3 sm:p-4 mb-3 sm:mb-4 group-hover:bg-white/30 transition-colors duration-300">
                <FileText className="h-6 w-6 sm:h-8 sm:w-8" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold mb-2">Warranty Claim Support</h3>
              <p className="text-white/90 text-sm sm:text-base">Submit and track warranty support requests</p>
            </div>
          </button>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8 lg:mb-12" data-tour="stats-overview">
          <div className="bg-white p-3 sm:p-4 lg:p-6 rounded-xl sm:rounded-2xl shadow-card border border-gray-100">
            <div className="flex items-center justify-between mb-2 sm:mb-3 lg:mb-4">
              <div className="bg-gradient-to-br from-primary/10 to-primary/20 rounded-lg p-2 sm:p-3 flex-shrink-0">
                <Receipt className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-primary" />
              </div>
            </div>
            <div className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-bold text-text-primary mb-1">
              {summaryStats.receiptsScanned}
            </div>
            <div className="text-xs sm:text-sm text-text-secondary">Receipts Scanned</div>
          </div>

          <div className="bg-white p-3 sm:p-4 lg:p-6 rounded-xl sm:rounded-2xl shadow-card border border-gray-100">
            <div className="flex items-center justify-between mb-2 sm:mb-3 lg:mb-4">
              <div className="bg-gradient-to-br from-secondary/10 to-secondary/20 rounded-lg p-2 sm:p-3 flex-shrink-0">
                <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-secondary" />
              </div>
            </div>
            <div className="text-sm sm:text-lg lg:text-xl xl:text-3xl font-bold text-text-primary mb-1 break-words">
              {formatCurrency(summaryStats.totalAmount)}
            </div>
            <div className="text-xs sm:text-sm text-text-secondary">Total Amount Captured</div>
          </div>

          <div className="bg-white p-3 sm:p-4 lg:p-6 rounded-xl sm:rounded-2xl shadow-card border border-gray-100">
            <div className="flex items-center justify-between mb-2 sm:mb-3 lg:mb-4">
              <div className="bg-gradient-to-br from-accent-yellow/10 to-accent-yellow/20 rounded-lg p-2 sm:p-3 flex-shrink-0">
                <Tag className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-accent-yellow" />
              </div>
            </div>
            <div className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-bold text-text-primary mb-1">
              {summaryStats.itemsCaptured}
            </div>
            <div className="text-xs sm:text-sm text-text-secondary">Products Captured</div>
          </div>

          <div className="bg-white p-3 sm:p-4 lg:p-6 rounded-xl sm:rounded-2xl shadow-card border border-gray-100">
            <div className="flex items-center justify-between mb-2 sm:mb-3 lg:mb-4">
              <div className="bg-gradient-to-br from-green-100 to-green-200 rounded-lg p-2 sm:p-3 flex-shrink-0">
                <Shield className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-green-600" />
              </div>
            </div>
            <div className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-bold text-text-primary mb-1">
              {summaryStats.warrantiesClaimed}
            </div>
            <div className="text-xs sm:text-sm text-text-secondary">
              Warranty Claim Support
            </div>
          </div>
        </div>

        {/* Smart Search Section */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-card border border-gray-100 p-3 sm:p-4 lg:p-6 mb-6 sm:mb-8" data-tour="smart-search">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 space-y-2 sm:space-y-0">
            <h2 className="text-base sm:text-lg lg:text-xl xl:text-2xl font-bold text-text-primary flex items-center space-x-2">
              <Search className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-primary" />
              <span>Smart Search</span>
              <ContextualTooltip
                title="AI-Powered Smart Search"
                content="Ask questions about your receipts in natural language. Our AI understands queries like 'How much did I spend on electronics?' or 'Show me Apple products from last month'."
                position="bottom"
              />
            </h2>
            <div className="flex items-center space-x-2 md:space-x-3">
              <span className="text-xs md:text-sm text-text-secondary bg-gradient-to-r from-primary/10 to-secondary/10 px-2 md:px-3 py-1 rounded-full">
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
          <div className="mb-4 md:mb-6">
            <form onSubmit={handleSearchSubmit} className="relative">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-2 sm:pl-3 md:pl-4 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 md:h-5 md:w-5 text-text-secondary" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full pl-8 sm:pl-10 md:pl-12 pr-20 sm:pr-28 md:pr-32 py-2 md:py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors duration-200 bg-gray-50 hover:bg-white focus:bg-white text-sm md:text-base"
                  placeholder={window.innerWidth < 768 ? "Ask about your receipts..." : "Ask questions about your receipts: 'How much did I spend on electronics?' or 'Show me Apple receipts'"}
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-2 md:pr-3 space-x-1">
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={clearSearch}
                      className="text-text-secondary hover:text-text-primary transition-colors duration-200 p-1"
                    >
                      <X className="h-3 w-3 md:h-4 md:w-4" />
                    </button>
                  )}
                  
                  {/* Voice Input Button */}
                  <button
                    type="button"
                    onClick={handleVoiceInput}
                    disabled={isTranscribing}
                    className={`p-1.5 md:p-2 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1 text-sm ${
                      isRecording 
                        ? 'bg-red-500 text-white hover:bg-red-600 animate-pulse' 
                        : 'bg-secondary text-white hover:bg-secondary/90'
                    }`}
                    title={isRecording ? 'Stop recording' : 'Start voice input'}
                  >
                    {isTranscribing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : isRecording ? (
                      <Square className="h-4 w-4" />
                    ) : (
                      <Mic className="h-4 w-4" />
                    )}
                  </button>
                  
                  <button
                    type="submit"
                    disabled={isSearching || !searchQuery.trim()}
                    className="bg-primary text-white px-3 md:px-4 py-1.5 md:py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1 md:space-x-2 text-sm"
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

            {/* Recording Indicator */}
            {isRecording && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-red-700">Recording...</span>
                </div>
                <span className="text-sm text-red-600 font-mono">{formatRecordingTime(recordingTime)}</span>
                <div className="flex-1"></div>
                <span className="text-xs text-red-600">Click stop or wait 30s to finish</span>
              </div>
            )}

            {/* Transcription Status */}
            {isTranscribing && (
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center space-x-3">
                <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
                <span className="text-sm font-medium text-blue-700">Converting speech to text...</span>
              </div>
            )}

            {/* Transcription Error */}
            {transcriptionError && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3">
                <MicOff className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-700 mb-1">Voice Input Error</p>
                  <p className="text-sm text-red-600">{transcriptionError}</p>
                </div>
                <button
                  onClick={() => setTranscriptionError(null)}
                  className="text-red-600 hover:text-red-800 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Search Error */}
            {searchError && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{searchError}</p>
              </div>
            )}

            {/* Embedding Status and Generate Button */}



          </div>

          {/* Smart Search Results */}
          {renderSearchResults()}
        </div>

        <div className="grid lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 max-w-full overflow-hidden">
          {/* Warranty Alerts */}
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-card border border-gray-100 p-3 sm:p-4 lg:p-6 min-w-0 max-w-full overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 space-y-2 sm:space-y-0 min-w-0">
              <h2 className="text-base sm:text-lg lg:text-2xl font-bold text-text-primary flex items-center space-x-2 min-w-0">
                <span className="truncate">Upcoming Warranty Alerts</span>
                <ContextualTooltip
                  title="Warranty Protection"
                  content="Smart Receipts automatically tracks warranty periods for your purchases and sends alerts before they expire. Never miss a warranty claim again!"
                  position="bottom"
                />
              </h2>
              <span className="text-xs sm:text-sm text-text-secondary">Next 6 Months</span>
            </div>

            <div className="space-y-3 sm:space-y-4">
              {warrantyAlerts.length === 0 ? (
                <div className="text-center py-6 sm:py-8">
                  <CheckCircle className="h-10 w-10 sm:h-12 sm:w-12 text-green-500 mx-auto mb-3 sm:mb-4" />
                  <h3 className="text-base sm:text-lg font-medium text-text-primary mb-2">All warranties are current</h3>
                  <p className="text-sm sm:text-base text-text-secondary">No warranties expiring in the next 6 months</p>
                </div>
              ) : (
                warrantyAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-3 sm:p-4 rounded-lg border-2 ${getUrgencyColor(alert.urgency)} hover:shadow-md transition-shadow duration-200 cursor-pointer min-w-0 max-w-full overflow-hidden`}
                    onClick={() => navigate('/warranty', { state: { id: alert.id } })}
                  >
                    <div className="flex items-start justify-between min-w-0 max-w-full">
                      <div className="flex-1 min-w-0 max-w-full overflow-hidden">
                        <div className="flex items-center space-x-2 mb-2 min-w-0">
                          <div className="flex-shrink-0">
                            {getUrgencyIcon(alert.urgency)}
                          </div>
                          <h3 className="text-sm sm:text-base font-bold truncate min-w-0">{alert.itemName}</h3>
                        </div>
                        <div className="text-xs sm:text-sm space-y-1 min-w-0 opacity-90">
                          <div className="flex items-center space-x-2 min-w-0">
                            <Calendar className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                            <span className="truncate min-w-0">Purchased: {formatDate(alert.purchaseDate)}</span>
                          </div>
                          <div className="flex items-center space-x-2 min-w-0">
                            <Clock className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                            <span className="truncate min-w-0">Expires: {formatDate(alert.expiryDate)}</span>
                          </div>
                          <div className="font-medium text-xs sm:text-sm truncate">
                            {alert.daysLeft} days remaining
                          </div>
                        </div>
                      </div>
                      <button className="opacity-70 hover:opacity-100 transition-opacity duration-200 flex-shrink-0 ml-1 sm:ml-2">
                        <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
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
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-card border border-gray-100 p-3 sm:p-4 lg:p-6 min-w-0 max-w-full overflow-hidden">
            <div className="flex items-center justify-between mb-4 sm:mb-6 min-w-0">
              <h2 className="text-base sm:text-lg lg:text-2xl font-bold text-text-primary truncate min-w-0">Recent Receipts</h2>
              <button 
                onClick={() => navigate('/library')}
                className="text-primary hover:text-primary/80 font-medium transition-colors duration-200 text-sm sm:text-base flex-shrink-0 ml-2"
              >
                View All
              </button>
            </div>

            <div className="space-y-3 sm:space-y-4">
              {recentReceipts.length === 0 ? (
                <div className="text-center py-6 sm:py-8">
                  <Receipt className="h-10 w-10 sm:h-12 sm:w-12 text-text-secondary mx-auto mb-3 sm:mb-4" />
                  <h3 className="text-base sm:text-lg font-medium text-text-primary mb-2">No receipts yet</h3>
                  <p className="text-sm sm:text-base text-text-secondary mb-4">Start by scanning your first receipt</p>
                  <button
                    onClick={onShowReceiptScanning}
                    className="bg-primary text-white px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors duration-200 text-sm sm:text-base"
                  >
                    Scan Receipt
                  </button>
                </div>
              ) : (
                recentReceipts.map((receipt) => (
                  <div
                    key={receipt.id}
                    className="flex items-center justify-between p-3 sm:p-4 rounded-lg hover:bg-blue-900 transition-colors duration-200 cursor-pointer group min-w-0 max-w-full overflow-hidden"
                    onClick={() => navigate('/library', { state: { openReceiptId: receipt.id } })}
                  >
                    <div className="flex items-center space-x-2 sm:space-x-4 min-w-0 flex-1 max-w-full overflow-hidden">
                      <div className="bg-gradient-feature rounded-lg p-2 sm:p-3 flex-shrink-0">
                        {receipt.type === 'group' ? (
                          <Package className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                        ) : (
                          <Receipt className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0 max-w-full overflow-hidden">
                        <h3 className="text-sm sm:text-base font-bold text-text-primary group-hover:text-white transition-colors duration-200 truncate min-w-0" title={receipt.productName}>
                          {receipt.productName}
                        </h3>
                        <div className="text-xs sm:text-sm text-text-secondary group-hover:text-blue-100 space-y-1 min-w-0">
                          <div className="flex items-center space-x-1 min-w-0">
                            <span className="font-medium flex-shrink-0">Store:</span>
                            <span className="truncate min-w-0">{receipt.storeName}</span>
                          </div>
                          <div className="flex items-center space-x-1 min-w-0">
                            <span className="font-medium flex-shrink-0">
                              {receipt.type === 'group' ? 'Products:' : 'Brand:'}
                            </span>
                            <span className="truncate min-w-0">
                              {receipt.type === 'group' 
                                ? `${receipt.product_count} items` 
                                : receipt.brandName
                              }
                            </span>
                          </div>
                          <div className="text-xs group-hover:text-blue-100 truncate">
                            {formatDate(receipt.date)} • {receipt.items} {receipt.items === 1 ? 'item' : 'items'}
                          </div>
                          {receipt.type === 'group' && receipt.receipts && (
                            <div className="text-xs text-text-secondary group-hover:text-blue-100 bg-blue-50 group-hover:bg-blue-800 rounded px-2 py-1 mt-2 max-w-full overflow-hidden">
                              <span className="truncate block">
                                Products: {receipt.receipts.map(r => r.product_description).join(', ')}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-1 sm:ml-2">
                      <div className="text-sm sm:text-base font-bold text-text-primary group-hover:text-white whitespace-nowrap">
                        {formatCurrency(receipt.amount)}
                      </div>
                      {receipt.type === 'group' && (
                        <div className="text-xs text-text-secondary group-hover:text-blue-100 whitespace-nowrap">
                          Total Receipt
                        </div>
                      )}
                      <ChevronRight className="h-4 w-4 text-text-secondary group-hover:text-blue-100 transition-colors duration-200 ml-auto mt-1" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />

      {/* Onboarding Components */}
      <OnboardingTour
        isActive={showOnboardingTour}
        onComplete={handleTourComplete}
        onSkip={handleTourSkip}
      />

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