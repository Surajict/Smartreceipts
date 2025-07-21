import { supabase } from '../lib/supabase';
import { 
  UserSubscriptionInfo, 
  UsageCheckResponse, 
  SubscriptionUsage,
  UsageTracker,
  SubscriptionPlan
} from '../types/subscription';

class SubscriptionService implements UsageTracker {
  /**
   * Get user's current subscription info with usage
   */
  async getSubscriptionInfo(userId: string): Promise<UserSubscriptionInfo | null> {
    try {
      // First check localStorage for development upgrades
      const storedInfo = this.getStoredSubscriptionInfo(userId);
      if (storedInfo) {
        console.log('📱 Using development premium subscription data');
        return {
          plan: storedInfo.plan,
          status: storedInfo.status,
          cancel_at_period_end: false,
          receipts_used: storedInfo.receipts_used || 0,
          receipts_limit: storedInfo.receipts_limit || 999999,
          usage_month: new Date().toISOString().substring(0, 7)
        };
      }

      const { data, error } = await supabase.rpc('get_user_subscription_info', {
        user_uuid: userId
      });

      if (error) {
        console.error('Subscription info error:', error);
        return null;
      }

      if (!data || data.length === 0) {
        return null;
      }

      return data[0];
    } catch (err: any) {
      console.error('Subscription service error:', err);
      return null;
    }
  }

  /**
   * Check if user can scan more receipts (freemium limit check)
   */
  async checkCanScan(userId: string): Promise<boolean> {
    try {
      // First check localStorage for development premium users
      const storedInfo = this.getStoredSubscriptionInfo(userId);
      if (storedInfo && storedInfo.plan === 'premium') {
        console.log('🎉 Premium user - unlimited scanning allowed');
        return true; // Premium users have unlimited scanning
      }

      const { data, error } = await supabase.rpc('can_user_scan_receipt', {
        user_uuid: userId
      });

      if (error) {
        console.error('Usage check error:', error);
        return false; // Fail safely - don't allow scan if we can't check
      }

      return data === true;
    } catch (err: any) {
      console.error('Usage check error:', err);
      return false; // Fail safely
    }
  }

  /**
   * Increment usage count after successful receipt scan
   */
  async incrementUsage(userId: string): Promise<SubscriptionUsage> {
    try {
      const { data, error } = await supabase.rpc('increment_receipt_usage', {
        user_uuid: userId
      });

      if (error) {
        console.error('Usage increment error:', error);
        throw new Error('Failed to track receipt usage');
      }

      return data;
    } catch (err: any) {
      console.error('Usage increment error:', err);
      throw new Error('Usage tracking failed');
    }
  }

  /**
   * Track a receipt scan (increment monthly usage)
   */
  async trackReceiptScan(userId: string): Promise<boolean> {
    try {
      // Check if user is premium (unlimited scanning)
      const storedInfo = this.getStoredSubscriptionInfo(userId);
      if (storedInfo && storedInfo.plan === 'premium') {
        console.log('🎉 Premium user - skipping usage tracking (unlimited)');
        return true; // Premium users don't need usage tracking
      }

      const { data, error } = await supabase.rpc('increment_receipt_usage', {
        user_uuid: userId
      });

      if (error) {
        console.error('Usage tracking error:', error);
        return false;
      }

      return data === true;
    } catch (err: any) {
      console.error('Usage tracking error:', err);
      return false;
    }
  }

  /**
   * Get detailed usage info with limit checking
   */
  async getUsageInfo(userId: string): Promise<UserSubscriptionInfo> {
    const subscriptionInfo = await this.getSubscriptionInfo(userId);
    
    if (!subscriptionInfo) {
      // Return default free tier info if no subscription found
      return {
        plan: 'free',
        status: 'active',
        cancel_at_period_end: false,
        receipts_used: 0,
        receipts_limit: 5,
        usage_month: new Date().toISOString().substring(0, 7)
      };
    }

    return subscriptionInfo;
  }

  /**
   * Get usage check response with detailed info
   */
  async getUsageCheck(userId: string): Promise<UsageCheckResponse> {
    try {
      const canScan = await this.checkCanScan(userId);
      const usageInfo = await this.getUsageInfo(userId);

      return {
        canScan,
        receiptsUsed: usageInfo.receipts_used,
        receiptsLimit: usageInfo.receipts_limit,
        plan: usageInfo.plan
      };
    } catch (err: any) {
      console.error('Usage check error:', err);
      return {
        canScan: false,
        receiptsUsed: 5,
        receiptsLimit: 5,
        plan: 'free'
      };
    }
  }

  /**
   * Initialize subscription for new users
   */
  async initializeUserSubscription(userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('initialize_user_subscription', {
        user_uuid: userId
      });

      if (error) {
        console.error('Subscription initialization error:', error);
        return false;
      }

      return true;
    } catch (err: any) {
      console.error('Subscription initialization error:', err);
      return false;
    }
  }

  /**
   * Update user's subscription plan (called by Stripe webhooks)
   */
  async updateSubscriptionPlan(
    userId: string,
    plan: SubscriptionPlan,
    stripeData: any
  ): Promise<boolean> {
    try {
      const updateData: any = {
        plan,
        status: stripeData.status || 'active',
        updated_at: new Date().toISOString()
      };

      // Add Stripe-specific data if provided
      if (stripeData.stripe_customer_id) {
        updateData.stripe_customer_id = stripeData.stripe_customer_id;
      }
      if (stripeData.stripe_subscription_id) {
        updateData.stripe_subscription_id = stripeData.stripe_subscription_id;
      }
      if (stripeData.stripe_price_id) {
        updateData.stripe_price_id = stripeData.stripe_price_id;
      }
      if (stripeData.current_period_start) {
        updateData.current_period_start = stripeData.current_period_start;
      }
      if (stripeData.current_period_end) {
        updateData.current_period_end = stripeData.current_period_end;
      }
      if (stripeData.cancel_at_period_end !== undefined) {
        updateData.cancel_at_period_end = stripeData.cancel_at_period_end;
      }

      const { error } = await supabase
        .from('user_subscriptions')
        .upsert([{ user_id: userId, ...updateData }]);

      if (error) {
        console.error('Subscription update error:', error);
        return false;
      }

      return true;
    } catch (err: any) {
      console.error('Subscription update error:', err);
      return false;
    }
  }

  /**
   * Get monthly usage statistics
   */
  async getMonthlyUsage(userId: string, month?: string): Promise<SubscriptionUsage | null> {
    try {
      const usageMonth = month || new Date().toISOString().substring(0, 7);

      const { data, error } = await supabase
        .from('subscription_usage')
        .select('*')
        .eq('user_id', userId)
        .eq('usage_month', usageMonth)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No data found - this is normal
          return null;
        }
        console.error('Monthly usage error:', error);
        return null;
      }

      return data;
    } catch (err: any) {
      console.error('Monthly usage error:', err);
      return null;
    }
  }

  /**
   * Development function: Upgrade user to premium
   * This is for testing the premium features during development
   */
  async upgradeUserToPremium(userId: string): Promise<void> {
    try {
      console.log('🎉 Upgrading user to Premium plan');
      
      // For development, we'll simulate the upgrade by updating local storage
      // In production, this would update the database
      const upgradeData = {
        userId,
        plan: 'premium',
        status: 'active',
        upgraded_at: new Date().toISOString(),
        receipts_limit: 999999, // Unlimited
        receipts_used: 0 // Reset usage for new premium user
      };
      
      // Store in localStorage for development
      localStorage.setItem(`subscription_${userId}`, JSON.stringify(upgradeData));
      
      console.log('✅ User upgraded to Premium successfully');
    } catch (err: any) {
      console.error('Premium upgrade error:', err);
      throw new Error('Failed to upgrade to premium');
    }
  }

  /**
   * Get subscription info from localStorage (development mode)
   */
  private getStoredSubscriptionInfo(userId: string): any | null {
    try {
      const stored = localStorage.getItem(`subscription_${userId}`);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  /**
   * Calculate usage percentage
   */
  calculateUsagePercentage(receiptsUsed: number, receiptsLimit: number): number {
    if (receiptsLimit === 0) return 0;
    if (receiptsLimit >= 999999) return 0; // Unlimited plan
    return Math.min((receiptsUsed / receiptsLimit) * 100, 100);
  }

  /**
   * Get usage status color for UI
   */
  getUsageStatusColor(receiptsUsed: number, receiptsLimit: number): string {
    const percentage = this.calculateUsagePercentage(receiptsUsed, receiptsLimit);
    
    if (percentage >= 100) return 'text-red-600'; // Over limit
    if (percentage >= 80) return 'text-orange-500'; // Warning
    if (percentage >= 50) return 'text-yellow-500'; // Caution
    return 'text-green-500'; // Good
  }

  /**
   * Get usage status message
   */
  getUsageStatusMessage(receiptsUsed: number, receiptsLimit: number): string {
    if (receiptsLimit >= 999999) {
      return 'Unlimited scanning';
    }

    const remaining = receiptsLimit - receiptsUsed;
    
    if (remaining <= 0) {
      return 'Monthly limit reached - Upgrade to Premium for unlimited scanning';
    }
    
    if (remaining === 1) {
      return `${remaining} scan remaining this month`;
    }
    
    return `${remaining} scans remaining this month`;
  }

  /**
   * Check if user is approaching limit (warning threshold)
   */
  isApproachingLimit(receiptsUsed: number, receiptsLimit: number): boolean {
    if (receiptsLimit >= 999999) return false; // Unlimited
    return receiptsUsed >= (receiptsLimit * 0.8); // 80% threshold
  }

  /**
   * Check if user has reached the limit
   */
  hasReachedLimit(receiptsUsed: number, receiptsLimit: number): boolean {
    if (receiptsLimit >= 999999) return false; // Unlimited
    return receiptsUsed >= receiptsLimit;
  }
}

// Create singleton instance
export const subscriptionService = new SubscriptionService();
export default subscriptionService; 