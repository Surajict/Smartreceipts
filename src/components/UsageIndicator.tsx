import React from 'react';
import { UsageIndicatorProps } from '../types/subscription';
import subscriptionService from '../services/subscriptionService';

const UsageIndicator: React.FC<UsageIndicatorProps> = ({
  receiptsUsed,
  receiptsLimit,
  plan,
  compact = false
}) => {
  const percentage = subscriptionService.calculateUsagePercentage(receiptsUsed, receiptsLimit);
  const statusColor = subscriptionService.getUsageStatusColor(receiptsUsed, receiptsLimit);
  const statusMessage = subscriptionService.getUsageStatusMessage(receiptsUsed, receiptsLimit);
  const isApproachingLimit = subscriptionService.isApproachingLimit(receiptsUsed, receiptsLimit);
  const hasReachedLimit = subscriptionService.hasReachedLimit(receiptsUsed, receiptsLimit);

  // For unlimited plans
  if (plan === 'premium' && receiptsLimit >= 999999) {
    if (compact) {
      return (
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span className="text-sm text-green-600 font-medium">Unlimited</span>
        </div>
      );
    }

    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
            <div className="w-3 h-3 bg-green-500 rounded-full flex-shrink-0"></div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-green-800 text-sm sm:text-base">Premium Plan</h3>
              <p className="text-xs sm:text-sm text-green-600">
                <span className="hidden sm:inline">Unlimited receipt scanning</span>
                <span className="sm:hidden">Unlimited scanning</span>
              </p>
            </div>
          </div>
          <div className="text-right flex-shrink-0 ml-3">
            <div className="text-xl sm:text-2xl font-bold text-green-600">{receiptsUsed}</div>
            <div className="text-xs sm:text-sm text-green-500">
              <span className="hidden sm:inline">receipts this month</span>
              <span className="sm:hidden">this month</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // For free plan or limited plans
  if (compact) {
    return (
      <div className="flex items-center space-x-2">
        <div className={`w-2 h-2 rounded-full ${hasReachedLimit ? 'bg-red-500' : isApproachingLimit ? 'bg-orange-500' : 'bg-green-500'}`}></div>
        <span className={`text-sm font-medium ${statusColor}`}>
          {receiptsUsed}/{receiptsLimit}
        </span>
      </div>
    );
  }

  return (
    <div className={`rounded-lg p-3 sm:p-4 ${hasReachedLimit 
      ? 'bg-red-50 border border-red-200' 
      : isApproachingLimit 
        ? 'bg-orange-50 border border-orange-200' 
        : 'bg-blue-50 border border-blue-200'
    }`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
          <div className={`w-3 h-3 rounded-full flex-shrink-0 ${hasReachedLimit ? 'bg-red-500' : isApproachingLimit ? 'bg-orange-500' : 'bg-blue-500'}`}></div>
          <div className="min-w-0 flex-1">
            <h3 className={`font-semibold text-sm sm:text-base ${hasReachedLimit ? 'text-red-800' : isApproachingLimit ? 'text-orange-800' : 'text-blue-800'}`}>
              {plan === 'free' ? 'Free Plan' : 'Receipt Usage'}
            </h3>
            <p className={`text-xs sm:text-sm ${statusColor}`}>{statusMessage}</p>
          </div>
        </div>
        <div className="text-right flex-shrink-0 ml-3">
          <div className={`text-xl sm:text-2xl font-bold ${statusColor}`}>
            {receiptsUsed}/{receiptsLimit}
          </div>
          <div className={`text-xs sm:text-sm ${hasReachedLimit ? 'text-red-500' : isApproachingLimit ? 'text-orange-500' : 'text-blue-500'}`}>
            <span className="hidden sm:inline">receipts this month</span>
            <span className="sm:hidden">this month</span>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
        <div 
          className={`h-2 rounded-full transition-all duration-300 ${
            hasReachedLimit 
              ? 'bg-red-500' 
              : isApproachingLimit 
                ? 'bg-orange-500' 
                : 'bg-blue-500'
          }`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        ></div>
      </div>

      {/* Warning messages */}
      {hasReachedLimit && plan === 'free' && (
        <div className="mt-3 p-3 bg-red-100 rounded-lg border border-red-200">
          <div className="flex items-center space-x-2">
            <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div className="text-sm text-red-700">
              <span className="font-medium">Monthly limit reached.</span> Upgrade to Premium for unlimited receipt scanning.
            </div>
          </div>
        </div>
      )}

      {isApproachingLimit && !hasReachedLimit && plan === 'free' && (
        <div className="mt-3 p-3 bg-orange-100 rounded-lg border border-orange-200">
          <div className="flex items-center space-x-2">
            <svg className="w-4 h-4 text-orange-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div className="text-sm text-orange-700">
              <span className="font-medium">You're approaching your monthly limit.</span> Consider upgrading to Premium for unlimited scanning.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsageIndicator; 