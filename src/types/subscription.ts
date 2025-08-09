// Subscription and Payment Types for Smart Receipts Freemium Model

export type SubscriptionPlan = 'free' | 'premium';

export type SubscriptionStatus = 
  | 'active' 
  | 'canceled' 
  | 'past_due' 
  | 'incomplete' 
  | 'trialing';

export interface UserSubscription {
  id: string;
  user_id: string;
  
  // Plan information
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  
  // Stripe integration
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  stripe_price_id?: string;
  
  // Subscription timing
  current_period_start?: string;
  current_period_end?: string;
  cancel_at_period_end: boolean;
  canceled_at?: string;
  
  // Metadata
  created_at: string;
  updated_at: string;
}

export interface SubscriptionUsage {
  id: string;
  user_id: string;
  
  // Usage period (YYYY-MM format)
  usage_month: string;
  
  // Usage counters
  receipts_scanned: number;
  receipts_limit: number;
  
  // Metadata
  created_at: string;
  updated_at: string;
}

export interface UserSubscriptionInfo {
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  current_period_end?: string;
  cancel_at_period_end: boolean;
  receipts_used: number;
  receipts_limit: number;
  usage_month: string;
}

// Stripe-specific types
export interface StripeConfig {
  publishableKey: string;
  environment: 'test' | 'live';
}

export interface StripePriceInfo {
  id: string;
  amount: number;
  currency: string;
  interval: 'month' | 'year';
  nickname?: string;
}

export interface SubscriptionPlanInfo {
  id: SubscriptionPlan;
  name: string;
  description: string;
  price: number;
  currency: string;
  interval: string;
  features: string[];
  stripeProductId?: string;
  stripePriceId?: string;
  receiptsLimit?: number;
  popular?: boolean;
}

// Payment method types
export interface PaymentMethod {
  id: string;
  type: 'card' | 'bank_account' | 'other';
  card?: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
  };
  is_default: boolean;
  created_at: string;
}

export interface BillingHistory {
  id: string;
  amount: number;
  currency: string;
  status: 'succeeded' | 'failed' | 'pending';
  description: string;
  invoice_url?: string;
  receipt_url?: string;
  created_at: string;
}

// Component props types
export interface SubscriptionManagementProps {
  onBackToDashboard: () => void;
}

export interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentPlan: SubscriptionPlan;
  usageInfo: UserSubscriptionInfo;
}

export interface UsageIndicatorProps {
  receiptsUsed: number;
  receiptsLimit: number;
  plan: SubscriptionPlan;
  compact?: boolean;
}

export interface PlanComparisonProps {
  currentPlan: SubscriptionPlan;
  onSelectPlan: (plan: SubscriptionPlan) => void;
  loading?: boolean;
}

// API response types
export interface SubscriptionApiResponse {
  success: boolean;
  subscription?: UserSubscription;
  usage?: SubscriptionUsage;
  error?: string;
}

export interface PaymentIntentResponse {
  success: boolean;
  client_secret?: string;
  error?: string;
}

export interface UsageCheckResponse {
  canScan: boolean;
  receiptsUsed: number;
  receiptsLimit: number;
  plan: SubscriptionPlan;
}

// Error types
export interface SubscriptionError {
  type: 'usage_limit' | 'payment_failed' | 'subscription_expired' | 'unknown';
  message: string;
  action?: 'upgrade' | 'update_payment' | 'contact_support';
}

// Constants
export const SUBSCRIPTION_PLANS: Record<SubscriptionPlan, SubscriptionPlanInfo> = {
  free: {
    id: 'free',
    name: 'Free',
    description: 'Smart Receipts Trial',
    price: 0,
    currency: 'AUD',
    interval: 'month',
    receiptsLimit: 5,
    features: [
      '5 receipts per month',
      'Basic warranty tracking'
    ]
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    description: 'Unlimited scanning for all',
    price: 7,
    currency: 'AUD',
    interval: 'month',
    receiptsLimit: undefined, // Unlimited
    popular: true,
    features: [
      'Unlimited receipts',
      'Advanced warranty alerts',
      'Priority support'
    ]
  }
};

export const FREE_TIER_LIMIT = 5;
export const PREMIUM_PRICE_AUD = 7;
export const CURRENCY = 'AUD';

// Utility types
export type SubscriptionAction = 
  | 'upgrade'
  | 'downgrade' 
  | 'cancel'
  | 'reactivate'
  | 'update_payment';

export interface SubscriptionActionRequest {
  action: SubscriptionAction;
  plan?: SubscriptionPlan;
  payment_method_id?: string;
}

// Usage tracking types
export interface UsageTracker {
  checkCanScan(userId: string): Promise<boolean>;
  incrementUsage(userId: string): Promise<SubscriptionUsage>;
  getUsageInfo(userId: string): Promise<UserSubscriptionInfo>;
} 