import React, { useState } from 'react';
import { UpgradeModalProps } from '../types/subscription';
import { SUBSCRIPTION_PLANS } from '../types/subscription';
import stripeService from '../services/stripeService';
import { useUser } from '../contexts/UserContext';

const UpgradeModal: React.FC<UpgradeModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  currentPlan,
  usageInfo
}) => {
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'plan-selection' | 'payment' | 'processing'>('plan-selection');

  const handleUpgrade = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);
      setStep('processing');

      // Development: Actually upgrade the user to premium
      console.log('🚀 Upgrading user to Premium...');
      
      const upgradeResult = await stripeService.upgradeUserToPremium(user.id);

      if (!upgradeResult.success) {
        throw new Error(upgradeResult.error || 'Failed to upgrade subscription');
      }

      console.log('✅ Successfully upgraded to Premium!');
      
      // Show success message
      alert('🎉 Welcome to Premium!\n\nYou now have:\n✅ Unlimited receipt scanning\n✅ Advanced AI features\n✅ Smart search with RAG\n✅ Priority support\n✅ Export to multiple formats');
      
      // Call success callback to refresh subscription data
      onSuccess();
      
    } catch (err: any) {
      console.error('Upgrade error:', err);
      setError(err.message || 'Failed to upgrade subscription');
      setStep('plan-selection');
    } finally {
      setLoading(false);
    }
  };

  const handleCustomerPortal = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const result = await stripeService.createCustomerPortalSession(user.id);

      if (result.url) {
        window.open(result.url, '_blank');
        onClose();
      } else {
        setError(result.error || 'Failed to open billing portal');
      }
    } catch (err: any) {
      console.error('Customer portal error:', err);
      setError(err.message || 'Failed to open billing portal');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const freePlan = SUBSCRIPTION_PLANS.free;
  const premiumPlan = SUBSCRIPTION_PLANS.premium;
  const progressPercentage = usageInfo.receipts_limit > 0 
    ? Math.min((usageInfo.receipts_used / usageInfo.receipts_limit) * 100, 100)
    : 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-semibold">
            {step === 'plan-selection' ? 'Upgrade to Premium' : 'Complete Your Upgrade'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={loading}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span className="text-red-700">{error}</span>
              </div>
            </div>
          )}

          {step === 'plan-selection' && (
            <>
              {/* Current Usage Alert */}
              {usageInfo.receipts_used >= usageInfo.receipts_limit && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <div className="text-sm">
                      <span className="font-medium text-red-700">Monthly limit reached!</span>
                      <span className="text-red-600 ml-1">
                        You've used {usageInfo.receipts_used} of {usageInfo.receipts_limit} receipts this month.
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Usage Progress */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Current Usage</span>
                  <span className="text-sm text-gray-600">
                    {usageInfo.receipts_used}/{usageInfo.receipts_limit} receipts
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      progressPercentage >= 100 ? 'bg-red-500' : 
                      progressPercentage >= 80 ? 'bg-orange-500' : 'bg-blue-500'
                    }`}
                    style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                  ></div>
                </div>
              </div>

              {/* Plan Comparison */}
              <div className="grid md:grid-cols-2 gap-6 mb-8">
                {/* Current Plan */}
                <div className="border rounded-lg p-6 bg-gray-50">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">{freePlan.name}</h3>
                    <span className="text-sm bg-gray-200 text-gray-700 px-2 py-1 rounded">Current</span>
                  </div>
                  
                  <div className="text-3xl font-bold mb-2">
                    {stripeService.formatCurrency(freePlan.price, freePlan.currency)}
                    <span className="text-sm font-normal text-gray-600">/month</span>
                  </div>
                  
                  <p className="text-gray-600 text-sm mb-4">{freePlan.description}</p>
                  
                  <ul className="space-y-2">
                    {freePlan.features.map((feature, index) => (
                      <li key={index} className="flex items-center space-x-2 text-sm">
                        <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        <span className="text-gray-600">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Premium Plan */}
                <div className="border-2 border-primary rounded-lg p-6 bg-primary-50 relative">
                  {premiumPlan.popular && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <span className="bg-primary text-white px-3 py-1 rounded-full text-xs font-medium">
                        RECOMMENDED
                      </span>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-primary-dark">{premiumPlan.name}</h3>
                  </div>
                  
                  <div className="text-3xl font-bold mb-2 text-primary-dark">
                    {stripeService.formatCurrency(premiumPlan.price, premiumPlan.currency)}
                    <span className="text-sm font-normal text-primary">/month</span>
                  </div>
                  
                  <p className="text-primary-dark text-sm mb-4">{premiumPlan.description}</p>
                  
                  <ul className="space-y-2 mb-6">
                    {premiumPlan.features.map((feature, index) => (
                      <li key={index} className="flex items-center space-x-2 text-sm">
                        <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        <span className="text-primary-dark">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={handleUpgrade}
                    disabled={loading}
                    className="w-full bg-primary text-white py-3 rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Processing...' : 'Upgrade Now'}
                  </button>
                </div>
              </div>

              {/* Benefits Highlight */}
              <div className="bg-gradient-to-r from-primary-50 to-green-50 rounded-lg p-6 mb-6">
                <h4 className="font-semibold mb-3 text-primary-dark">Why Upgrade to Premium?</h4>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div className="flex items-start space-x-2">
                    <svg className="w-5 h-5 text-green-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <div className="font-medium">Unlimited Scanning</div>
                      <div className="text-gray-600">No more monthly limits - scan as many receipts as you need</div>
                    </div>
                  </div>
                  <div className="flex items-start space-x-2">
                    <svg className="w-5 h-5 text-green-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <div className="font-medium">Advanced AI Features</div>
                      <div className="text-gray-600">Smart search with RAG and advanced processing</div>
                    </div>
                  </div>
                  <div className="flex items-start space-x-2">
                    <svg className="w-5 h-5 text-green-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <div className="font-medium">Priority Support</div>
                      <div className="text-gray-600">Get faster help when you need it</div>
                    </div>
                  </div>
                  <div className="flex items-start space-x-2">
                    <svg className="w-5 h-5 text-green-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <div className="font-medium">Export Features</div>
                      <div className="text-gray-600">Export to multiple formats for accounting</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Alternative Actions */}
              <div className="border-t pt-6">
                <div className="text-center space-y-2">
                  <p className="text-sm text-gray-600">
                    Need to manage existing billing?
                  </p>
                  <button
                    onClick={handleCustomerPortal}
                    className="text-primary hover:underline text-sm"
                    disabled={loading}
                  >
                    Access Billing Portal
                  </button>
                </div>
              </div>
            </>
          )}

          {step === 'processing' && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <h3 className="text-lg font-semibold mb-2">Processing Your Upgrade</h3>
              <p className="text-gray-600">Please wait while we set up your Premium subscription...</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t rounded-b-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              <span>Secure payment powered by Stripe</span>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UpgradeModal; 