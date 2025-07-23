import React, { useState, useEffect } from 'react';
import { BarChart3, MessageCircle, Bot, TrendingUp, Users, Clock } from 'lucide-react';
import { ChatbotService } from '../services/chatbotService';
import { faqKnowledgeBase } from '../data/faqKnowledgeBase';

interface ChatAnalyticsProps {
  className?: string;
}

const ChatAnalytics: React.FC<ChatAnalyticsProps> = ({ className = '' }) => {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('30d');

  useEffect(() => {
    loadAnalytics();
  }, [dateRange]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      
      const endDate = new Date().toISOString();
      const startDate = new Date();
      
      switch (dateRange) {
        case '7d':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(startDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(startDate.getDate() - 90);
          break;
      }

      const data = await ChatbotService.getChatAnalytics(
        startDate.toISOString(),
        endDate
      );
      
      setAnalytics(data);
    } catch (error) {
      console.error('Failed to load chat analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFAQTitle = (faqId: string): string => {
    const faq = faqKnowledgeBase.find(f => f.id === faqId);
    return faq ? faq.question : faqId;
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border p-6 ${className}`}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-text-secondary">Loading chat analytics...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border p-6 ${className}`}>
        <div className="text-center">
          <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Chat Data</h3>
          <p className="text-gray-500">No chat interactions found for the selected period.</p>
        </div>
      </div>
    );
  }

  const faqSuccessRate = analytics.totalQueries > 0 
    ? Math.round((analytics.faqMatches / analytics.totalQueries) * 100)
    : 0;

  return (
    <div className={`bg-white rounded-lg shadow-sm border ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <BarChart3 className="h-6 w-6 text-primary" />
            <h2 className="text-xl font-semibold text-text-primary">Chat Analytics</h2>
          </div>
          
          <div className="flex space-x-2">
            {(['7d', '30d', '90d'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  dateRange === range
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <MessageCircle className="h-8 w-8 text-blue-600" />
              <div>
                <div className="text-2xl font-bold text-blue-600">{analytics.totalQueries}</div>
                <div className="text-sm text-blue-500">Total Queries</div>
              </div>
            </div>
          </div>

          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <Bot className="h-8 w-8 text-green-600" />
              <div>
                <div className="text-2xl font-bold text-green-600">{analytics.faqMatches}</div>
                <div className="text-sm text-green-500">FAQ Matches</div>
              </div>
            </div>
          </div>

          <div className="bg-purple-50 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <TrendingUp className="h-8 w-8 text-purple-600" />
              <div>
                <div className="text-2xl font-bold text-purple-600">{faqSuccessRate}%</div>
                <div className="text-sm text-purple-500">FAQ Success Rate</div>
              </div>
            </div>
          </div>

          <div className="bg-orange-50 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <Users className="h-8 w-8 text-orange-600" />
              <div>
                <div className="text-2xl font-bold text-orange-600">{analytics.aiResponses}</div>
                <div className="text-sm text-orange-500">AI Responses</div>
              </div>
            </div>
          </div>
        </div>

        {/* Top Queries */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <h3 className="text-lg font-semibold text-text-primary mb-4">Top User Queries</h3>
            <div className="space-y-3">
              {analytics.topQueries.slice(0, 5).map((query: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <p className="text-sm text-text-primary font-medium truncate">
                      {query.query}
                    </p>
                  </div>
                  <div className="ml-3">
                    <span className="bg-primary text-white text-xs px-2 py-1 rounded-full">
                      {query.count}
                    </span>
                  </div>
                </div>
              ))}
              
              {analytics.topQueries.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No queries yet</p>
                </div>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-text-primary mb-4">Most Matched FAQs</h3>
            <div className="space-y-3">
              {analytics.topFAQs.slice(0, 5).map((faq: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <p className="text-sm text-text-primary font-medium">
                      {getFAQTitle(faq.faq_id)}
                    </p>
                  </div>
                  <div className="ml-3">
                    <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                      {faq.count}
                    </span>
                  </div>
                </div>
              ))}
              
              {analytics.topFAQs.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Bot className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No FAQ matches yet</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Response Type Distribution */}
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-text-primary mb-4">Response Type Distribution</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{analytics.faqMatches}</div>
              <div className="text-sm text-green-500">FAQ Responses</div>
              <div className="text-xs text-gray-500 mt-1">
                {analytics.totalQueries > 0 ? Math.round((analytics.faqMatches / analytics.totalQueries) * 100) : 0}%
              </div>
            </div>
            
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{analytics.aiResponses}</div>
              <div className="text-sm text-blue-500">AI Responses</div>
              <div className="text-xs text-gray-500 mt-1">
                {analytics.totalQueries > 0 ? Math.round((analytics.aiResponses / analytics.totalQueries) * 100) : 0}%
              </div>
            </div>
            
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{analytics.fallbackResponses}</div>
              <div className="text-sm text-orange-500">Fallback Responses</div>
              <div className="text-xs text-gray-500 mt-1">
                {analytics.totalQueries > 0 ? Math.round((analytics.fallbackResponses / analytics.totalQueries) * 100) : 0}%
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatAnalytics;