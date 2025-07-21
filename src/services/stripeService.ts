import { loadStripe, Stripe } from '@stripe/stripe-js';
import { supabase } from '../lib/supabase';
import { 
  StripeConfig, 
  UserSubscriptionInfo, 
  PaymentIntentResponse,
  SubscriptionApiResponse,
  PaymentMethod,
  BillingHistory,
  SubscriptionPlan
} from '../types/subscription';

class StripeService {
  private stripe: Stripe | null = null;
  private config: StripeConfig;

  constructor() {
    // Get Stripe configuration from environment variables
    const environment = (import.meta.env.VITE_STRIPE_ENVIRONMENT || 'test') as 'test' | 'live';
    const publishableKey = environment === 'test' 
      ? import.meta.env.VITE_STRIPE_TEST_PUBLISHABLE_KEY
      : import.meta.env.VITE_STRIPE_LIVE_PUBLISHABLE_KEY;

    if (!publishableKey) {
      console.warn(`Stripe ${environment} publishable key not configured`);
      // Create mock config for development
      this.config = {
        publishableKey: 'pk_test_mock_key',
        environment: 'test'
      };
    } else {
      this.config = {
        publishableKey,
        environment
      };
    }
  }

  /**
   * Initialize Stripe instance
   */
  async initializeStripe(): Promise<Stripe> {
    if (this.stripe) {
      return this.stripe;
    }

    // For development - return mock if no real key
    if (this.config.publishableKey === 'pk_test_mock_key') {
      console.warn('Using mock Stripe instance - configure real keys for production');
      // Return a basic mock that won't crash
      return {} as Stripe;
    }

    const stripe = await loadStripe(this.config.publishableKey);
    if (!stripe) {
      throw new Error('Failed to initialize Stripe');
    }

    this.stripe = stripe;
    return stripe;
  }

  /**
   * Create a payment intent for subscription upgrade
   * Currently mocked - will be replaced with real Stripe integration
   */
  async createSubscriptionPaymentIntent(
    plan: SubscriptionPlan,
    userId: string
  ): Promise<PaymentIntentResponse> {
    try {
      // For development - actually upgrade the user to premium
      console.log('Development mode: Upgrading user to premium');
      
      return {
        success: true,
        client_secret: 'pi_mock_client_secret_123'
      };
    } catch (err: any) {
      console.error('Stripe service error:', err);
      return {
        success: false,
        error: err.message || 'Payment processing failed'
      };
    }
  }

  /**
   * Development function: Upgrade user to premium
   * This simulates a successful payment and subscription upgrade
   */
  async upgradeUserToPremium(userId: string): Promise<SubscriptionApiResponse> {
    try {
      console.log('🚀 Development: Upgrading user to Premium');
      
      // Import subscriptionService here to avoid circular imports
      const subscriptionService = (await import('./subscriptionService')).default;
      
      // Update the user's subscription to premium
      await subscriptionService.upgradeUserToPremium(userId);
      
      return {
        success: true,
        subscription: {
          id: 'sub_premium_' + Date.now(),
          user_id: userId,
          plan: 'premium',
          status: 'active',
          cancel_at_period_end: false,
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      };
    } catch (err: any) {
      console.error('Development upgrade error:', err);
      return {
        success: false,
        error: err.message || 'Failed to upgrade user'
      };
    }
  }

  /**
   * Confirm payment and activate subscription
   * Currently mocked - will be replaced with real implementation
   */
  async confirmSubscriptionPayment(
    paymentIntentId: string,
    userId: string
  ): Promise<SubscriptionApiResponse> {
    try {
      console.warn('Mock subscription confirmation');
      return {
        success: true,
        subscription: {
          id: 'sub_mock_123',
          user_id: userId,
          plan: 'premium',
          status: 'active',
          cancel_at_period_end: false,
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Payment confirmation failed'
      };
    }
  }

  /**
   * Cancel subscription at period end
   * Currently mocked - returns success message
   */
  async cancelSubscription(userId: string): Promise<SubscriptionApiResponse> {
    try {
      console.warn('Mock subscription cancellation');
      return {
        success: true,
        subscription: {
          id: 'sub_mock_123',
          user_id: userId,
          plan: 'premium',
          status: 'active',
          cancel_at_period_end: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Cancellation failed'
      };
    }
  }

  /**
   * Reactivate a cancelled subscription
   * Currently mocked - returns success message
   */
  async reactivateSubscription(userId: string): Promise<SubscriptionApiResponse> {
    try {
      console.warn('Mock subscription reactivation');
      return {
        success: true,
        subscription: {
          id: 'sub_mock_123',
          user_id: userId,
          plan: 'premium',
          status: 'active',
          cancel_at_period_end: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Reactivation failed'
      };
    }
  }

  /**
   * Get payment methods for user
   * Returns mock data since Edge Functions aren't set up
   */
  async getPaymentMethods(userId: string): Promise<PaymentMethod[]> {
    try {
      console.warn('Mock payment methods - Edge Functions not configured');
      // Return empty array since no payment methods exist yet
      return [];
    } catch (err: any) {
      console.error('Payment methods error:', err);
      return [];
    }
  }

  /**
   * Get billing history for user
   * Returns mock data since Edge Functions aren't set up
   */
  async getBillingHistory(userId: string): Promise<BillingHistory[]> {
    try {
      console.warn('Mock billing history - Edge Functions not configured');
      // Return empty array since no billing history exists yet
      return [];
    } catch (err: any) {
      console.error('Billing history error:', err);
      return [];
    }
  }

  /**
   * Create customer portal session
   * Shows info message since Stripe isn't fully configured
   */
  async createCustomerPortalSession(userId: string): Promise<{ url?: string; error?: string }> {
    try {
      alert(`🔧 Stripe Customer Portal\n\nThis would normally redirect you to Stripe's customer portal where you can:\n\n✅ Update payment methods\n✅ Download invoices\n✅ Manage subscriptions\n\nTo enable this:\n1. Configure Stripe API keys\n2. Create the Edge Functions\n3. Set up Stripe products`);
      
      return {
        url: undefined,
        error: 'Customer portal not configured - Stripe integration pending'
      };
    } catch (err: any) {
      return {
        error: err.message || 'Failed to open billing portal'
      };
    }
  }

  /**
   * Format currency amount
   */
  formatCurrency(amount: number, currency: string = 'AUD'): string {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: currency.toUpperCase(),
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  }

  /**
   * Get current Stripe configuration
   */
  getConfig(): StripeConfig {
    return this.config;
  }

  /**
   * Check if Stripe is properly configured
   */
  isConfigured(): boolean {
    return this.config.publishableKey !== 'pk_test_mock_key';
  }
}

export default new StripeService(); 