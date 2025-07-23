import { supabase } from '../lib/supabase';
import { FAQMatcher, FAQItem } from '../data/faqKnowledgeBase';

export interface ChatSession {
  id: string;
  user_id?: string;
  session_id: string;
  created_at: string;
  updated_at: string;
}

export interface UserQuery {
  id: string;
  session_id: string;
  user_id?: string;
  query_text: string;
  response_text: string;
  faq_matched?: string;
  response_type: 'faq' | 'ai' | 'fallback';
  timestamp: string;
}

export class ChatbotService {
  /**
   * Log user query and response to Supabase
   */
  static async logUserQuery(
    sessionId: string,
    userId: string | undefined,
    queryText: string,
    responseText: string,
    faqMatch?: FAQItem,
    responseType: 'faq' | 'ai' | 'fallback' = 'faq'
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_queries')
        .insert([{
          session_id: sessionId,
          user_id: userId,
          query_text: queryText,
          response_text: responseText,
          faq_matched: faqMatch?.id,
          response_type: responseType,
          timestamp: new Date().toISOString()
        }]);

      if (error) {
        console.error('Failed to log user query:', error);
      }
    } catch (error) {
      console.error('Error logging user query:', error);
    }
  }

  /**
   * Create or update chat session
   */
  static async createChatSession(sessionId: string, userId?: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('chat_sessions')
        .upsert([{
          session_id: sessionId,
          user_id: userId,
          updated_at: new Date().toISOString()
        }], {
          onConflict: 'session_id'
        });

      if (error) {
        console.error('Failed to create chat session:', error);
      }
    } catch (error) {
      console.error('Error creating chat session:', error);
    }
  }

  /**
   * Get chat analytics for admin dashboard
   */
  static async getChatAnalytics(startDate?: string, endDate?: string): Promise<{
    totalQueries: number;
    faqMatches: number;
    aiResponses: number;
    fallbackResponses: number;
    topQueries: Array<{ query: string; count: number }>;
    topFAQs: Array<{ faq_id: string; count: number }>;
  }> {
    try {
      let query = supabase
        .from('user_queries')
        .select('*');

      if (startDate) {
        query = query.gte('timestamp', startDate);
      }
      if (endDate) {
        query = query.lte('timestamp', endDate);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      const queries = data || [];
      
      // Calculate analytics
      const totalQueries = queries.length;
      const faqMatches = queries.filter(q => q.response_type === 'faq').length;
      const aiResponses = queries.filter(q => q.response_type === 'ai').length;
      const fallbackResponses = queries.filter(q => q.response_type === 'fallback').length;

      // Top queries
      const queryCount: { [key: string]: number } = {};
      queries.forEach(q => {
        const normalized = q.query_text.toLowerCase().trim();
        queryCount[normalized] = (queryCount[normalized] || 0) + 1;
      });

      const topQueries = Object.entries(queryCount)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([query, count]) => ({ query, count }));

      // Top FAQs
      const faqCount: { [key: string]: number } = {};
      queries.filter(q => q.faq_matched).forEach(q => {
        faqCount[q.faq_matched!] = (faqCount[q.faq_matched!] || 0) + 1;
      });

      const topFAQs = Object.entries(faqCount)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([faq_id, count]) => ({ faq_id, count }));

      return {
        totalQueries,
        faqMatches,
        aiResponses,
        fallbackResponses,
        topQueries,
        topFAQs
      };
    } catch (error) {
      console.error('Error getting chat analytics:', error);
      return {
        totalQueries: 0,
        faqMatches: 0,
        aiResponses: 0,
        fallbackResponses: 0,
        topQueries: [],
        topFAQs: []
      };
    }
  }

  /**
   * Process user message and generate response
   */
  static async processMessage(
    message: string,
    sessionId: string,
    userId?: string
  ): Promise<{
    response: string;
    faqMatch?: FAQItem;
    responseType: 'faq' | 'ai' | 'fallback';
    suggestions: string[];
  }> {
    try {
      // First, try FAQ matching
      const faqMatch = FAQMatcher.findBestMatch(message);
      
      if (faqMatch) {
        // Log the FAQ match
        await this.logUserQuery(sessionId, userId, message, faqMatch.answer, faqMatch, 'faq');
        
        // Generate related suggestions
        const relatedFAQs = FAQMatcher.searchFAQs(message, 3)
          .filter(faq => faq.id !== faqMatch.id)
          .map(faq => faq.question);
        
        return {
          response: faqMatch.answer,
          faqMatch,
          responseType: 'faq',
          suggestions: relatedFAQs.length > 0 ? relatedFAQs : [
            'How does warranty tracking work?',
            'What file formats are supported?',
            'Can I export my data?'
          ]
        };
      }

      // If no FAQ match, try AI response (if webhook is configured)
      const webhookUrl = import.meta.env.VITE_N8N_WEBHOOK_URL;
      
      if (webhookUrl) {
        try {
          const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              message: message.trim(),
              sessionId: sessionId,
              timestamp: new Date().toISOString(),
              source: 'faq_chatbot',
              context: 'smart_receipts_support'
            })
          });

          if (response.ok) {
            const data = await response.json();
            let responseText = '';
            
            if (Array.isArray(data) && data.length > 0 && data[0].output) {
              responseText = data[0].output;
            } else if (data.response) {
              responseText = data.response;
            } else if (data.message) {
              responseText = data.message;
            } else if (typeof data === 'string') {
              responseText = data;
            }

            if (responseText) {
              await this.logUserQuery(sessionId, userId, message, responseText, undefined, 'ai');
              
              return {
                response: responseText,
                responseType: 'ai',
                suggestions: [
                  'How accurate is receipt scanning?',
                  'Is my data secure?',
                  'How much does it cost?'
                ]
              };
            }
          }
        } catch (aiError) {
          console.error('AI response failed:', aiError);
        }
      }

      // Fallback response
      const fallbackResponse = `I'd be happy to help! While I couldn't find a specific answer to "${message}", here are some things I can help you with:

• Receipt scanning and accuracy
• Warranty tracking features  
• Data security and privacy
• Mobile app capabilities
• Pricing and plans

For specific technical support, please contact us at smartreceiptsau@gmail.com`;

      await this.logUserQuery(sessionId, userId, message, fallbackResponse, undefined, 'fallback');

      return {
        response: fallbackResponse,
        responseType: 'fallback',
        suggestions: [
          'How accurate is receipt scanning?',
          'Is my data secure?',
          'How much does it cost?',
          'Contact support'
        ]
      };

    } catch (error) {
      console.error('Error processing message:', error);
      
      const errorResponse = 'I\'m sorry, I\'m having technical difficulties right now. Please try again later or contact our support team at smartreceiptsau@gmail.com for immediate assistance.';
      
      return {
        response: errorResponse,
        responseType: 'fallback',
        suggestions: [
          'How accurate is receipt scanning?',
          'Is my data secure?',
          'Contact support'
        ]
      };
    }
  }
}