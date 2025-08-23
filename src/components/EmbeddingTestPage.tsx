import React, { useState, useEffect } from 'react';
import { 
  RefreshCw, 
  Database, 
  Search, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  ArrowLeft,
  Play,
  BarChart3
} from 'lucide-react';
import { getCurrentUser } from '../lib/supabase';
import { 
  checkEmbeddingStatus, 
  generateEmbeddingsForUser, 
  testSmartSearch,
  EmbeddingStatus,
  BackfillResult
} from '../lib/embeddings';

interface EmbeddingTestPageProps {
  onBack: () => void;
}

const EmbeddingTestPage: React.FC<EmbeddingTestPageProps> = ({ onBack }) => {
  const [user, setUser] = useState<any>(null);
  const [status, setStatus] = useState<EmbeddingStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [testQuery, setTestQuery] = useState('laptop computer');
  const [testResults, setTestResults] = useState<any>(null);
  const [backfillResult, setBackfillResult] = useState<BackfillResult | null>(null);

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      if (currentUser) {
        await checkStatus(currentUser.id);
      }
    };
    loadUser();
  }, []);

  const checkStatus = async (userId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const embeddingStatus = await checkEmbeddingStatus(userId);
      setStatus(embeddingStatus);
    } catch (err: any) {
      setError(err.message || 'Failed to check embedding status');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateEmbeddings = async () => {
    if (!user) return;

    try {
      setIsGenerating(true);
      setError(null);
      setSuccess(null);
      setBackfillResult(null);

      const result = await generateEmbeddingsForUser(user.id, 5);
      setBackfillResult(result);
      
      if (result.successful > 0) {
        setSuccess(`Successfully generated embeddings for ${result.successful} receipts!`);
        // Refresh status
        await checkStatus(user.id);
      }
      
      if (result.errors > 0) {
        setError(`${result.errors} receipts failed to process. Check console for details.`);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to generate embeddings');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleTestSearch = async () => {
    if (!user || !testQuery.trim()) return;

    try {
      setIsTesting(true);
      setError(null);
      setTestResults(null);

      const results = await testSmartSearch(testQuery.trim(), user.id);
      setTestResults(results);
      
      if (results.results && results.results.length > 0) {
        setSuccess(`Found ${results.results.length} results for "${testQuery}"`);
      } else {
        setError('No results found. This could mean: 1) No matching receipts, 2) Embeddings not generated yet, 3) Search system not working');
      }
    } catch (err: any) {
      setError(err.message || 'Smart search test failed');
    } finally {
      setIsTesting(false);
    }
  };

  const getStatusColor = (status: EmbeddingStatus) => {
    if (status.percentageComplete === 100) return 'text-green-600';
    if (status.percentageComplete > 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStatusIcon = (status: EmbeddingStatus) => {
    if (status.percentageComplete === 100) return <CheckCircle className="h-5 w-5 text-green-600" />;
    return <AlertCircle className="h-5 w-5 text-yellow-600" />;
  };

  return (
    <div className="min-h-screen bg-background font-['Inter',sans-serif]">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white shadow-card border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={onBack}
                className="p-2 text-text-secondary hover:text-text-primary transition-colors duration-200"
              >
                <ArrowLeft className="h-6 w-6" />
              </button>
              <div className="flex items-center space-x-3">
                <Database className="h-8 w-8 text-primary" />
                <h1 className="text-2xl font-bold text-text-primary">Embedding Test & Fix</h1>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-20 sm:pt-24">
        {/* Status Section */}
        <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-text-primary flex items-center space-x-2">
              <BarChart3 className="h-5 w-5" />
              <span>Embedding Status</span>
            </h2>
            <button
              onClick={() => user && checkStatus(user.id)}
              disabled={isLoading}
              className="flex items-center space-x-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors duration-200 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>

          {status ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-text-primary">{status.totalReceipts}</div>
                  <div className="text-sm text-text-secondary">Total Receipts</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{status.receiptsWithEmbeddings}</div>
                  <div className="text-sm text-text-secondary">With Embeddings</div>
                </div>
                <div className="bg-red-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{status.receiptsWithoutEmbeddings}</div>
                  <div className="text-sm text-text-secondary">Missing Embeddings</div>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                {getStatusIcon(status)}
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-text-primary">Progress</span>
                    <span className={`text-sm font-bold ${getStatusColor(status)}`}>
                      {status.percentageComplete}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${status.percentageComplete}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-text-secondary">Loading status...</p>
            </div>
          )}
        </div>

        {/* Generate Embeddings Section */}
        <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6 mb-8">
          <h2 className="text-xl font-bold text-text-primary mb-4 flex items-center space-x-2">
            <Database className="h-5 w-5" />
            <span>Generate Embeddings</span>
          </h2>
          
          <p className="text-text-secondary mb-6">
            Generate AI embeddings for receipts that don't have them. This enables smart search functionality.
          </p>

          <button
            onClick={handleGenerateEmbeddings}
            disabled={isGenerating || !status || status.receiptsWithoutEmbeddings === 0}
            className="flex items-center space-x-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            <span>
              {isGenerating 
                ? 'Generating...' 
                : status?.receiptsWithoutEmbeddings === 0 
                  ? 'All receipts have embeddings' 
                  : `Generate embeddings for ${status?.receiptsWithoutEmbeddings || 0} receipts`
              }
            </span>
          </button>

          {backfillResult && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-text-primary mb-2">Last Generation Result:</h4>
              <div className="text-sm text-text-secondary space-y-1">
                <div>Processed: {backfillResult.processed}</div>
                <div>Successful: {backfillResult.successful}</div>
                <div>Errors: {backfillResult.errors}</div>
                <div>Remaining: {backfillResult.remaining}</div>
              </div>
            </div>
          )}
        </div>

        {/* Test Smart Search Section */}
        <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6 mb-8">
          <h2 className="text-xl font-bold text-text-primary mb-4 flex items-center space-x-2">
            <Search className="h-5 w-5" />
            <span>Test Smart Search</span>
          </h2>
          
          <p className="text-text-secondary mb-6">
            Test the smart search functionality to see if embeddings are working correctly.
          </p>

          <div className="flex space-x-4 mb-4">
            <input
              type="text"
              value={testQuery}
              onChange={(e) => setTestQuery(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Enter search query (e.g., 'laptop computer', 'phone charger')"
            />
            <button
              onClick={handleTestSearch}
              disabled={isTesting || !testQuery.trim()}
              className="flex items-center space-x-2 px-6 py-2 bg-secondary text-white rounded-lg hover:bg-secondary/90 transition-colors duration-200 disabled:opacity-50"
            >
              {isTesting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              <span>Test Search</span>
            </button>
          </div>

          {testResults && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-text-primary mb-2">Search Results:</h4>
              {testResults.results && testResults.results.length > 0 ? (
                <div className="space-y-2">
                  {testResults.results.map((result: any, index: number) => (
                    <div key={index} className="p-3 bg-white rounded border">
                      <div className="font-medium">{result.title}</div>
                      <div className="text-sm text-text-secondary">
                        {result.brand} • {result.purchaseDate} • Match: {Math.round(result.relevanceScore * 100)}%
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-text-secondary">No results found</p>
              )}
            </div>
          )}
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <p className="text-green-700">{success}</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default EmbeddingTestPage; 