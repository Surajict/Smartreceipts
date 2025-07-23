import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useUser } from './UserContext';
import subscriptionService from '../services/subscriptionService';
import { UserSubscriptionInfo } from '../types/subscription';

interface SubscriptionContextType {
  subscriptionInfo: UserSubscriptionInfo | null;
  loading: boolean;
  error: string | null;
  refreshSubscription: () => Promise<void>;
  redeemCode: (code: string) => Promise<{ success: boolean; error?: string; message?: string }>;
}

const SubscriptionContext = createContext<SubscriptionContextType>({
  subscriptionInfo: null,
  loading: true,
  error: null,
  refreshSubscription: async () => {},
  redeemCode: async () => ({ success: false })
});

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};

interface SubscriptionProviderProps {
  children: ReactNode;
}

export const SubscriptionProvider: React.FC<SubscriptionProviderProps> = ({ children }) => {
  const { user } = useUser();
  const [subscriptionInfo, setSubscriptionInfo] = useState<UserSubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSubscriptionInfo = async () => {
    if (!user) {
      setSubscriptionInfo(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      let info = await subscriptionService.getSubscriptionInfo(user.id);
      
      if (!info) {
        // Initialize if no subscription found
        await subscriptionService.initializeUserSubscription(user.id);
        info = await subscriptionService.getSubscriptionInfo(user.id);
      }
      
      setSubscriptionInfo(info);
    } catch (err: any) {
      console.error('Failed to load subscription info:', err);
      setError('Failed to load subscription information');
    } finally {
      setLoading(false);
    }
  };

  const refreshSubscription = async () => {
    await loadSubscriptionInfo();
  };

  const redeemCode = async (code: string): Promise<{ success: boolean; error?: string; message?: string }> => {
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    try {
      const result = await subscriptionService.redeemSubscriptionCode(code, user.id);
      
      if (result.success) {
        // Refresh subscription info after successful redemption
        await refreshSubscription();
        return { success: true, message: result.message };
      } else {
        return { success: false, error: result.error };
      }
    } catch (err: any) {
      console.error('Error redeeming code:', err);
      return { success: false, error: 'Failed to redeem code. Please try again.' };
    }
  };

  useEffect(() => {
    loadSubscriptionInfo();
  }, [user]);

  const value: SubscriptionContextType = {
    subscriptionInfo,
    loading,
    error,
    refreshSubscription,
    redeemCode
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}; 