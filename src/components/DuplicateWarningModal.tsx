import React from 'react';
import { DuplicateMatch } from '../services/duplicateDetectionService';

interface DuplicateWarningModalProps {
  isOpen: boolean;
  matches: DuplicateMatch[];
  confidence: number;
  onProceed: () => void;
  onCancel: () => void;
}

const DuplicateWarningModal: React.FC<DuplicateWarningModalProps> = ({
  isOpen,
  matches,
  confidence,
  onProceed,
  onCancel
}) => {
  if (!isOpen || matches.length === 0) return null;

  const bestMatch = matches[0];
  const receipt = bestMatch.receipt;
  const confidencePercentage = Math.round(confidence * 100);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
        <div className="flex items-center mb-4">
          <div className="flex-shrink-0 w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-lg font-medium text-gray-900">
              Potential Duplicate Receipt
            </h3>
            <p className="text-sm text-gray-500">
              {confidencePercentage}% similarity match found
            </p>
          </div>
        </div>

        <div className="mb-6">
          <p className="text-sm text-gray-700 mb-4">
            We found a similar receipt that you may have already uploaded:
          </p>
          
          <div className="bg-gray-50 rounded-lg p-4 border">
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-medium text-gray-900">
                {receipt.product_description}
              </h4>
              <span className="text-sm text-gray-500">
                {receipt.purchase_date}
              </span>
            </div>
            
            <div className="space-y-1 text-sm text-gray-600">
              <p><span className="font-medium">Store:</span> {receipt.store_name}</p>
              <p><span className="font-medium">Brand:</span> {receipt.brand_name}</p>
              {receipt.amount && (
                <p><span className="font-medium">Amount:</span> ${receipt.amount}</p>
              )}
            </div>
            
            <div className="mt-3 pt-3 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                <span className="font-medium">Match reasons:</span> {bestMatch.matchReasons.join(', ')}
              </p>
            </div>
          </div>

          {matches.length > 1 && (
            <p className="text-xs text-gray-500 mt-2">
              + {matches.length - 1} other similar receipt{matches.length > 2 ? 's' : ''} found
            </p>
          )}
        </div>

        <div className="flex space-x-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onProceed}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            Save Anyway
          </button>
        </div>
        
        <p className="text-xs text-gray-500 mt-3 text-center">
          This receipt will be saved as a separate entry if you proceed
        </p>
      </div>
    </div>
  );
};

export default DuplicateWarningModal; 