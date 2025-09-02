import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Search, 
  Package, 
  Calendar, 
  DollarSign, 
  Store, 
  MapPin, 
  Shield, 
  AlertCircle,
  CheckCircle,
  Loader2,
  Tag,
  FileText
} from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import warrantyClaimsService from '../services/warrantyClaimsService';
import Footer from './Footer';

interface Receipt {
  id: string;
  product_description: string;
  brand_name?: string;
  store_name?: string;
  purchase_date: string;
  amount?: number;
  image_url?: string;
  warranty_period?: string;
}

interface WarrantyClaimFormProps {
  onSubmitted: () => void;
  onCancel: () => void;
}

const WarrantyClaimForm: React.FC<WarrantyClaimFormProps> = ({ onSubmitted, onCancel }) => {
  const { user } = useUser();
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [issueDescription, setIssueDescription] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionStage, setSubmissionStage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadReceipts();
    }
  }, [user]);

  const loadReceipts = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      setError(null);
      
      const { data, error: receiptsError } = await warrantyClaimsService.getUserReceiptsForClaims(user.id);
      
      if (receiptsError) {
        setError(receiptsError);
      } else {
        setReceipts(data || []);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load receipts');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedReceipt || !issueDescription.trim()) {
      setError('Please select a receipt and describe the issue');
      return;
    }

    if (!user) {
      setError('User not authenticated');
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmissionStage(0);
      setError(null);
      setSuccess(null);

      // Stage 1: Preparing claim data
      setSubmissionStage(1);
      await new Promise(resolve => setTimeout(resolve, 800));

      // Stage 2: Contacting support team
      setSubmissionStage(2);
      await new Promise(resolve => setTimeout(resolve, 600));

      // Stage 3: Processing warranty claim
      setSubmissionStage(3);
      const { data, error: submitError } = await warrantyClaimsService.submitClaim(user.id, {
        receipt_id: selectedReceipt.id,
        issue_description: issueDescription.trim()
      });

      if (submitError) {
        setError(submitError);
      } else if (data) {
        // Stage 4: Finalizing submission
        setSubmissionStage(4);
        await new Promise(resolve => setTimeout(resolve, 500));
        
        setSuccess('Warranty claim submitted successfully! You will receive a response shortly.');
        setTimeout(() => {
          onSubmitted();
        }, 2000);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to submit warranty claim');
    } finally {
      setIsSubmitting(false);
      setSubmissionStage(0);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const filteredReceipts = receipts.filter(receipt =>
    receipt.product_description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    receipt.brand_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    receipt.store_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-text-secondary">Loading your receipts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background font-['Inter',sans-serif]">
      {/* Header */}
      <header className="bg-white shadow-card border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={onCancel}
                className="text-text-secondary hover:text-text-primary transition-colors duration-200"
              >
                <ArrowLeft className="h-6 w-6" />
              </button>
              <div className="flex items-center space-x-3">
                <div className="bg-gradient-to-br from-primary/10 to-primary/20 rounded-lg p-2">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-text-primary">Submit Warranty Claim</h1>
                  <p className="text-sm text-text-secondary">Get support for your product</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {success ? (
          <div className="bg-white rounded-xl shadow-card border border-gray-100 p-8">
            <div className="text-center">
              <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-text-primary mb-4">Claim Submitted Successfully!</h2>
              <p className="text-text-secondary mb-6">{success}</p>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-green-800">
                  Your warranty claim has been processed and submitted to the manufacturer. 
                  You'll be redirected to your claims history shortly.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Step 1: Select Receipt */}
            <div className="bg-white rounded-xl shadow-card border border-gray-100 p-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="bg-gradient-to-br from-primary/10 to-primary/20 rounded-full p-2 text-primary font-bold text-sm">
                  1
                </div>
                <h2 className="text-lg font-semibold text-text-primary">Select Product Receipt</h2>
              </div>

              {/* Search */}
              <div className="mb-6">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-text-secondary" />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors duration-200 bg-gray-50 hover:bg-white focus:bg-white"
                    placeholder="Search your receipts by product, brand, or store..."
                  />
                </div>
              </div>

              {/* Receipts List */}
              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              )}

              {filteredReceipts.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-16 w-16 text-text-secondary mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-text-primary mb-2">
                    {searchQuery ? 'No matching receipts found' : 'No receipts available'}
                  </h3>
                  <p className="text-text-secondary">
                    {searchQuery 
                      ? 'Try adjusting your search terms'
                      : 'You need to scan some receipts first before submitting warranty claim support requests'
                    }
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 max-h-96 overflow-y-auto">
                  {filteredReceipts.map((receipt) => (
                    <div
                      key={receipt.id}
                      onClick={() => setSelectedReceipt(receipt)}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                        selectedReceipt?.id === receipt.id
                          ? 'border-primary bg-primary/5'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <div className="bg-gradient-to-br from-primary/10 to-primary/20 rounded-lg p-2">
                              <Package className="h-4 w-4 text-primary" />
                            </div>
                            <h3 className="font-semibold text-text-primary">{receipt.product_description}</h3>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-text-secondary">
                            {receipt.brand_name && (
                              <div className="flex items-center space-x-2">
                                <Tag className="h-4 w-4" />
                                <span>Brand: {receipt.brand_name}</span>
                              </div>
                            )}
                            {receipt.store_name && (
                              <div className="flex items-center space-x-2">
                                <Store className="h-4 w-4" />
                                <span>Store: {receipt.store_name}</span>
                              </div>
                            )}
                            <div className="flex items-center space-x-2">
                              <Calendar className="h-4 w-4" />
                              <span>Purchased: {formatDate(receipt.purchase_date)}</span>
                            </div>
                            {receipt.amount && (
                              <div className="flex items-center space-x-2">
                                <DollarSign className="h-4 w-4" />
                                <span>{formatCurrency(receipt.amount)}</span>
                              </div>
                            )}
                            {receipt.warranty_period && (
                              <div className="flex items-center space-x-2">
                                <Shield className="h-4 w-4" />
                                <span>Warranty: {receipt.warranty_period}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {selectedReceipt?.id === receipt.id && (
                          <CheckCircle className="h-6 w-6 text-primary flex-shrink-0" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Step 2: Describe Issue */}
            {selectedReceipt && (
              <div className="bg-white rounded-xl shadow-card border border-gray-100 p-6">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="bg-gradient-to-br from-primary/10 to-primary/20 rounded-full p-2 text-primary font-bold text-sm">
                    2
                  </div>
                  <h2 className="text-lg font-semibold text-text-primary">Describe the Issue</h2>
                </div>

                <div className="mb-4">
                  <label htmlFor="issue-description" className="block text-sm font-medium text-text-primary mb-2">
                    What issue are you experiencing with this product? *
                  </label>
                  <textarea
                    id="issue-description"
                    value={issueDescription}
                    onChange={(e) => setIssueDescription(e.target.value)}
                    rows={6}
                    className="block w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors duration-200 bg-gray-50 hover:bg-white focus:bg-white resize-none"
                    placeholder="Please describe the issue you're experiencing with this product. Include details about when the problem started, what symptoms you're seeing, and any troubleshooting steps you've already tried..."
                    required
                  />
                  <p className="mt-2 text-xs text-text-secondary">
                    Be as detailed as possible to help us provide the best support for your warranty claim.
                  </p>
                </div>

                {/* Selected Product Summary */}
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <h3 className="text-sm font-medium text-text-primary mb-3">Selected Product Summary:</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div><span className="font-medium">Product:</span> {selectedReceipt.product_description}</div>
                    {selectedReceipt.brand_name && (
                      <div><span className="font-medium">Brand:</span> {selectedReceipt.brand_name}</div>
                    )}
                    {selectedReceipt.store_name && (
                      <div><span className="font-medium">Store:</span> {selectedReceipt.store_name}</div>
                    )}
                    <div><span className="font-medium">Purchase Date:</span> {formatDate(selectedReceipt.purchase_date)}</div>
                    {selectedReceipt.amount && (
                      <div><span className="font-medium">Amount:</span> {formatCurrency(selectedReceipt.amount)}</div>
                    )}
                    {selectedReceipt.warranty_period && (
                      <div><span className="font-medium">Warranty:</span> {selectedReceipt.warranty_period}</div>
                    )}
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex justify-end space-x-4">
                  <button
                    type="button"
                    onClick={onCancel}
                    className="px-6 py-3 border border-gray-300 rounded-lg font-medium text-text-secondary hover:bg-gray-50 transition-colors duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !selectedReceipt || !issueDescription.trim()}
                    className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white px-8 py-3 rounded-lg font-medium transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-lg flex items-center space-x-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Submitting Claim...</span>
                      </>
                    ) : (
                      <>
                        <Shield className="h-4 w-4" />
                        <span>Submit Warranty Claim</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </form>
        )}
      </main>

      {/* Beautiful Loading Overlay */}
      {isSubmitting && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md mx-4 text-center">
            {/* Animated Logo/Icon */}
            <div className="mb-6">
              <div className="relative mx-auto w-20 h-20">
                {/* Outer rotating ring */}
                <div className="absolute inset-0 border-4 border-primary/20 rounded-full animate-spin"></div>
                {/* Inner pulsing ring */}
                <div className="absolute inset-2 border-4 border-primary rounded-full animate-pulse"></div>
                {/* Center icon */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <Shield className="h-8 w-8 text-primary animate-pulse" />
                </div>
              </div>
            </div>

            {/* Stage-based Messages */}
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-text-primary">
                {submissionStage === 1 && "Preparing Your Claim"}
                {submissionStage === 2 && "Connecting to Support Team"}
                {submissionStage === 3 && "Processing Warranty Request"}
                {submissionStage === 4 && "Finalizing Submission"}
                {submissionStage === 0 && "Initiating Process"}
              </h3>
              
              <p className="text-text-secondary">
                {submissionStage === 1 && "Gathering your product information and warranty details..."}
                {submissionStage === 2 && "Establishing secure connection with our warranty support system..."}
                {submissionStage === 3 && "Your claim is being reviewed and processed by our AI support assistant..."}
                {submissionStage === 4 && "Almost done! Generating your unique claim ID and confirmation..."}
                {submissionStage === 0 && "Please wait while we process your warranty claim support request..."}
              </p>

              {/* Progress Bar */}
              <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
                <div 
                  className="bg-gradient-to-r from-primary to-primary/80 h-2 rounded-full transition-all duration-700 ease-out"
                  style={{ 
                    width: `${submissionStage === 0 ? 10 : submissionStage === 1 ? 25 : submissionStage === 2 ? 50 : submissionStage === 3 ? 85 : 100}%` 
                  }}
                ></div>
              </div>

              {/* Elegant loading dots */}
              <div className="flex justify-center space-x-1 mt-4">
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>

              {/* Reassuring message */}
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  ✨ <strong>We're working on your request!</strong><br/>
                  Our advanced AI system is analyzing your warranty claim and will connect you with the appropriate support channel for the fastest resolution.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default WarrantyClaimForm;
