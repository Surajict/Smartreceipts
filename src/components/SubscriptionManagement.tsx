import React, { useState, useEffect } from 'react';
import { SubscriptionManagementProps, UserSubscriptionInfo, PaymentMethod, BillingHistory } from '../types/subscription';
import { useUser } from '../contexts/UserContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import subscriptionService from '../services/subscriptionService';
import stripeService from '../services/stripeService';
import UsageIndicator from './UsageIndicator';
import UpgradeModal from './UpgradeModal';
import { SUBSCRIPTION_PLANS } from '../types/subscription';
import { Gift, CreditCard, Key, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import Footer from './Footer';

const SubscriptionManagement: React.FC<SubscriptionManagementProps> = ({ 
  onBackToDashboard 
}) => {
  const { user } = useUser();
  const { subscriptionInfo, loading: contextLoading, redeemCode, refreshSubscription } = useSubscription();
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [billingHistory, setBillingHistory] = useState<BillingHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  // Subscription system state
  const [subscriptionSystem, setSubscriptionSystem] = useState<'code_based' | 'stripe'>('code_based');
  
  // Code redemption state
  const [redemptionCode, setRedemptionCode] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [redemptionMessage, setRedemptionMessage] = useState('');
  const [redemptionError, setRedemptionError] = useState('');

  useEffect(() => {
    if (user) {
      loadSubscriptionData();
      loadSystemSettings();
    }
  }, [user]);

  const loadSystemSettings = async () => {
    try {
      const { data } = await supabase
        .from('admin_settings')
        .select('setting_value')
        .eq('setting_key', 'subscription_system')
        .single();

      if (data) {
        setSubscriptionSystem(data.setting_value as 'code_based' | 'stripe');
      }
    } catch (err) {
      console.error('Failed to load system settings:', err);
    }
  };

  const loadSubscriptionData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // For Stripe system, load payment methods and billing history
      if (subscriptionSystem === 'stripe') {
        const [paymentMethods, billingHistory] = await Promise.all([
          stripeService.getPaymentMethods(user.id),
          stripeService.getBillingHistory(user.id)
        ]);

        setPaymentMethods(paymentMethods);
        setBillingHistory(billingHistory);
      }

    } catch (err: any) {
      console.error('Failed to load subscription data:', err);
      setError('Failed to load subscription information');
    } finally {
      setLoading(false);
    }
  };

  const handleRedeemCode = async () => {
    if (!redemptionCode.trim()) {
      setRedemptionError('Please enter a subscription code');
      return;
    }

    setIsRedeeming(true);
    setRedemptionError('');
    setRedemptionMessage('');

    try {
      const result = await redeemCode(redemptionCode.trim().toUpperCase());
      
      if (result.success) {
        setRedemptionMessage(result.message || 'Subscription code redeemed successfully!');
        setRedemptionCode('');
        // Refresh subscription info
        await refreshSubscription();
      } else {
        setRedemptionError(result.error || 'Failed to redeem code');
      }
    } catch (err: any) {
      console.error('Error redeeming code:', err);
      setRedemptionError('An error occurred while redeeming the code');
    } finally {
      setIsRedeeming(false);
    }
  };

  const handleUpgrade = () => {
    setShowUpgradeModal(true);
  };

  const handleCancelSubscription = async () => {
    if (!user || !subscriptionInfo) return;

    if (!confirm('Are you sure you want to cancel your subscription? It will remain active until the end of your current billing period.')) {
      return;
    }

    try {
      setActionLoading('cancel');
      const result = await stripeService.cancelSubscription(user.id);

      if (result.success) {
        await refreshSubscription();
        alert('Your subscription has been cancelled and will end at the current billing period.');
      } else {
        alert(result.error || 'Failed to cancel subscription');
      }
    } catch (err: any) {
      console.error('Cancel subscription error:', err);
      alert('Failed to cancel subscription');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReactivateSubscription = async () => {
    if (!user || !subscriptionInfo) return;

    try {
      setActionLoading('reactivate');
      const result = await stripeService.reactivateSubscription(user.id);

      if (result.success) {
        await refreshSubscription();
        alert('Your subscription has been reactivated!');
      } else {
        alert(result.error || 'Failed to reactivate subscription');
      }
    } catch (err: any) {
      console.error('Reactivate subscription error:', err);
      alert('Failed to reactivate subscription');
    } finally {
      setActionLoading(null);
    }
  };

  const handleManageBilling = async () => {
    if (!user) return;

    try {
      setActionLoading('billing');
      const result = await stripeService.createCustomerPortalSession(user.id);

      if (result.url) {
        window.location.href = result.url;
      } else {
        alert(result.error || 'Failed to open billing portal');
      }
    } catch (err: any) {
      console.error('Billing portal error:', err);
      alert('Failed to open billing portal');
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: number, currency: string = 'AUD') => {
    return stripeService.formatCurrency(amount / 100, currency); // Stripe amounts are in cents
  };

  if (loading || contextLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-text-secondary">Loading subscription information...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <h2 className="text-xl font-semibold text-red-800 mb-2">Error</h2>
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={loadSubscriptionData}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!subscriptionInfo) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <h2 className="text-xl font-semibold text-yellow-800 mb-2">No Subscription Found</h2>
            <p className="text-yellow-600 mb-4">Unable to load your subscription information.</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700"
            >
              Refresh Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentPlan = SUBSCRIPTION_PLANS[subscriptionInfo.plan];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={onBackToDashboard}
                className="text-text-secondary hover:text-text-primary"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-2xl font-bold text-text-primary">Subscription Management</h1>
            </div>
            <div className="flex items-center space-x-2">
              {subscriptionSystem === 'code_based' ? (
                <div className="flex items-center space-x-2 px-3 py-1 bg-blue-100 rounded-full">
                  <Key className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-600">Code-Based</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2 px-3 py-1 bg-green-100 rounded-full">
                  <CreditCard className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-600">Stripe</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6 space-y-8">
        {/* Code Redemption Section - Only show for code-based system */}
        {subscriptionSystem === 'code_based' && subscriptionInfo.plan === 'free' && (
          <section className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border p-6">
            <div className="flex items-center space-x-3 mb-4">
              <Gift className="h-6 w-6 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">Redeem Subscription Code</h2>
            </div>
            
            <p className="text-gray-600 mb-4">
              Have a subscription code? Enter it below to activate your premium features.
            </p>

            <div className="flex space-x-4">
              <div className="flex-1">
                <input
                  type="text"
                  value={redemptionCode}
                  onChange={(e) => setRedemptionCode(e.target.value.toUpperCase())}
                  placeholder="Enter 16-digit subscription code"
                  maxLength={16}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-center tracking-widest"
                  style={{ letterSpacing: '0.1em' }}
                />
              </div>
              <button
                onClick={handleRedeemCode}
                disabled={isRedeeming || !redemptionCode.trim()}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isRedeeming ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                    <span>Redeeming...</span>
                  </>
                ) : (
                  <>
                    <Key className="h-4 w-4" />
                    <span>Redeem Code</span>
                  </>
                )}
              </button>
            </div>

            {/* Success Message */}
            {redemptionMessage && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-green-700">{redemptionMessage}</span>
              </div>
            )}

            {/* Error Message */}
            {redemptionError && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <span className="text-red-700">{redemptionError}</span>
              </div>
            )}
          </section>
        )}

        {/* Current Plan Section */}
        <section className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Current Plan</h2>
            {subscriptionInfo.plan === 'free' && subscriptionSystem === 'stripe' && (
              <button
                onClick={handleUpgrade}
                className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark"
              >
                Upgrade to Premium
              </button>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Plan Info */}
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className={`w-4 h-4 rounded-full ${
                  subscriptionInfo.plan === 'premium' ? 'bg-green-500' : 'bg-blue-500'
                }`}></div>
                <div>
                  <h3 className="font-semibold text-lg">{currentPlan.name}</h3>
                  <p className="text-text-secondary">{currentPlan.description}</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-text-secondary">Status:</span>
                  <span className={`font-medium ${
                    subscriptionInfo.status === 'active' ? 'text-green-600' : 'text-orange-600'
                  }`}>
                    {subscriptionInfo.status.charAt(0).toUpperCase() + subscriptionInfo.status.slice(1)}
                  </span>
                </div>

                {subscriptionInfo.plan === 'premium' && subscriptionInfo.current_period_end && (
                  <div className="flex justify-between">
                    <span className="text-text-secondary">
                      {subscriptionSystem === 'code_based' ? 'Premium expires:' : 'Next billing date:'}
                    </span>
                    <span className="font-medium">{formatDate(subscriptionInfo.current_period_end)}</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span className="text-text-secondary">Monthly cost:</span>
                  <span className="font-medium text-lg">
                    {subscriptionSystem === 'code_based' && subscriptionInfo.plan === 'premium'
                      ? 'Paid via Code'
                      : stripeService.formatCurrency(currentPlan.price, currentPlan.currency)
                    }
                  </span>
                </div>

                {subscriptionSystem === 'code_based' && (
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Subscription Type:</span>
                    <span className="font-medium text-blue-600">Code-Based</span>
                  </div>
                )}
              </div>

              {/* Plan Features */}
              <div className="pt-4 border-t">
                <h4 className="font-medium mb-2">Plan Features</h4>
                <ul className="space-y-1">
                  {currentPlan.features.map((feature, index) => (
                    <li key={index} className="flex items-center space-x-2 text-sm">
                      <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Usage Statistics */}
            <div>
              <UsageIndicator
                receiptsUsed={subscriptionInfo.receipts_used}
                receiptsLimit={subscriptionInfo.receipts_limit}
                plan={subscriptionInfo.plan}
              />
            </div>
          </div>

          {/* Action Buttons - Only for Stripe system */}
          {subscriptionSystem === 'stripe' && (
            <div className="mt-6 pt-6 border-t space-x-4">
              {subscriptionInfo.plan === 'premium' && (
                <>
                  {subscriptionInfo.cancel_at_period_end ? (
                    <button
                      onClick={handleReactivateSubscription}
                      disabled={actionLoading === 'reactivate'}
                      className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
                    >
                      {actionLoading === 'reactivate' ? 'Reactivating...' : 'Reactivate Subscription'}
                    </button>
                  ) : (
                    <button
                      onClick={handleCancelSubscription}
                      disabled={actionLoading === 'cancel'}
                      className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:opacity-50"
                    >
                      {actionLoading === 'cancel' ? 'Cancelling...' : 'Cancel Subscription'}
                    </button>
                  )}

                  <button
                    onClick={handleManageBilling}
                    disabled={actionLoading === 'billing'}
                    className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 disabled:opacity-50"
                  >
                    {actionLoading === 'billing' ? 'Loading...' : 'Manage Billing'}
                  </button>
                </>
              )}
            </div>
          )}

          {subscriptionInfo.cancel_at_period_end && (
            <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div className="text-sm text-orange-700">
                  <span className="font-medium">Subscription cancelled.</span> Your Premium access will continue until {subscriptionInfo.current_period_end ? formatDate(subscriptionInfo.current_period_end) : 'the end of your billing period'}.
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Billing History - Only for Stripe system */}
        {subscriptionSystem === 'stripe' && billingHistory.length > 0 && (
          <section className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold mb-4">Billing History</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Date</th>
                    <th className="text-left py-2">Description</th>
                    <th className="text-left py-2">Amount</th>
                    <th className="text-left py-2">Status</th>
                    <th className="text-left py-2">Invoice</th>
                  </tr>
                </thead>
                <tbody>
                  {billingHistory.map((invoice) => (
                    <tr key={invoice.id} className="border-b">
                      <td className="py-2">{formatDate(invoice.created_at)}</td>
                      <td className="py-2">{invoice.description}</td>
                      <td className="py-2">{formatCurrency(invoice.amount, invoice.currency)}</td>
                      <td className="py-2">
                        <span className={`px-2 py-1 rounded text-sm ${
                          invoice.status === 'succeeded' 
                            ? 'bg-green-100 text-green-800' 
                            : invoice.status === 'failed'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                        </span>
                      </td>
                      <td className="py-2">
                        {invoice.invoice_url && (
                          <a
                            href={invoice.invoice_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            View Invoice
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>

      {/* Upgrade Modal - Only for Stripe system */}
      {showUpgradeModal && subscriptionInfo && subscriptionSystem === 'stripe' && (
        <UpgradeModal
          isOpen={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
          onSuccess={() => {
            setShowUpgradeModal(false);
            refreshSubscription();
          }}
          currentPlan={subscriptionInfo.plan}
          usageInfo={subscriptionInfo}
        />
      )}

      <Footer />
    </div>
  );
};

export default SubscriptionManagement; 