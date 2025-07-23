import { supabase } from '../lib/supabase';

interface Receipt {
  id: string;
  product_description: string;
  brand_name: string;
  purchase_date: string;
  purchase_location: string;
  country: string;
  warranty_period: string;
}

interface WarrantyResponse {
  answer: string;
  suggestions: string[];
  sources?: string[];
}

export class WarrantyBuddyService {
  private static readonly OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

  /**
   * Process warranty-related query for a specific receipt
   */
  static async processWarrantyQuery(
    query: string,
    receipt: Receipt,
    userId?: string
  ): Promise<WarrantyResponse> {
    try {
      // Log the query first
      await this.logWarrantyQuery(query, receipt, userId);

      // Get warranty information using AI
      const warrantyInfo = await this.getWarrantyInformation(query, receipt);
      
      // Generate suggestions based on the query type
      const suggestions = this.generateSuggestions(query, receipt);

      return {
        answer: warrantyInfo,
        suggestions
      };
    } catch (error) {
      console.error('Warranty query processing error:', error);
      return {
        answer: this.getFallbackResponse(query, receipt),
        suggestions: [
          'How do I claim warranty?',
          'What documents do I need?',
          'Where is the nearest service center?'
        ]
      };
    }
  }

  /**
   * Get warranty information using AI
   */
  private static async getWarrantyInformation(query: string, receipt: Receipt): Promise<string> {
    const openaiApiKey = import.meta.env.VITE_OPENAI_API_KEY;
    
    if (!openaiApiKey) {
      return this.getFallbackResponse(query, receipt);
    }

    const systemPrompt = this.buildSystemPrompt(receipt);
    const userPrompt = this.buildUserPrompt(query, receipt);

    try {
      const response = await fetch(this.OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          max_tokens: 800,
          temperature: 0.3,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;

      if (!content) {
        throw new Error('No response from OpenAI');
      }

      return content.trim();
    } catch (error) {
      console.error('OpenAI API error:', error);
      return this.getFallbackResponse(query, receipt);
    }
  }

  /**
   * Build system prompt for AI
   */
  private static buildSystemPrompt(receipt: Receipt): string {
    const currentDate = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    return `You are Warranty Buddy, a helpful AI assistant specializing in warranty information for consumer products. 

CONTEXT:
- Today's date: ${currentDate}
- Product: ${receipt.product_description}
- Brand: ${receipt.brand_name}
- Purchase Date: ${new Date(receipt.purchase_date).toLocaleDateString()}
- Purchase Location: ${receipt.purchase_location || 'Unknown'}
- Country: ${receipt.country || 'Unknown'}
- Warranty Period: ${receipt.warranty_period || 'Unknown'}

INSTRUCTIONS:
1. Provide accurate, helpful warranty information based on general industry knowledge
2. Be specific to the brand and product type when possible
3. Include practical steps and requirements
4. Mention that users should verify information with official sources
5. Be concise but comprehensive
6. Use a friendly, supportive tone
7. If you don't have specific information, provide general guidance and suggest contacting the manufacturer

IMPORTANT: Always remind users to check official manufacturer websites or contact customer service for the most current and accurate warranty terms.`;
  }

  /**
   * Build user prompt for AI
   */
  private static buildUserPrompt(query: string, receipt: Receipt): string {
    return `User question about their ${receipt.brand_name} ${receipt.product_description}: "${query}"

Please provide helpful warranty information addressing their specific question. Include:
- Direct answer to their question
- Relevant steps or requirements
- General timeline expectations
- Reminder to verify with official sources

Keep the response practical and actionable.`;
  }

  /**
   * Generate contextual suggestions based on query type
   */
  private static generateSuggestions(query: string, receipt: Receipt): string[] {
    const lowerQuery = query.toLowerCase();
    
    // Claim process questions
    if (lowerQuery.includes('claim') || lowerQuery.includes('how to') || lowerQuery.includes('process')) {
      return [
        'What documents do I need?',
        'How long does warranty claim take?',
        'Where is the nearest service center?',
        'What is covered under warranty?'
      ];
    }
    
    // Document questions
    if (lowerQuery.includes('document') || lowerQuery.includes('proof') || lowerQuery.includes('need')) {
      return [
        'How do I claim warranty?',
        'Where can I get service?',
        'What if I lost my receipt?',
        'Is purchase proof enough?'
      ];
    }
    
    // Service center questions
    if (lowerQuery.includes('service') || lowerQuery.includes('center') || lowerQuery.includes('repair') || lowerQuery.includes('where')) {
      return [
        'How do I claim warranty?',
        'What documents do I need?',
        'Can I get home service?',
        'How long will repair take?'
      ];
    }
    
    // Coverage questions
    if (lowerQuery.includes('cover') || lowerQuery.includes('include') || lowerQuery.includes('exclude')) {
      return [
        'How do I claim warranty?',
        'What documents do I need?',
        'Can I extend my warranty?',
        'What about accidental damage?'
      ];
    }
    
    // Default suggestions
    return [
      'How do I claim warranty?',
      'What documents do I need?',
      'Where is the nearest service center?',
      'What is covered under warranty?',
      'How long is my warranty valid?'
    ];
  }

  /**
   * Get fallback response when AI is not available
   */
  private static getFallbackResponse(query: string, receipt: Receipt): string {
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('claim') || lowerQuery.includes('how to')) {
      return `To claim warranty for your ${receipt.brand_name} ${receipt.product_description}:

1. **Contact ${receipt.brand_name} Customer Service**
   - Visit their official website or call their support line
   - Have your purchase receipt ready

2. **Prepare Required Documents**
   - Original purchase receipt (you have this in Smart Receipts!)
   - Product serial number
   - Photos of the issue (if applicable)

3. **Follow Their Process**
   - They'll guide you through their specific warranty claim process
   - Some brands offer online claim submission

**Important**: Each brand has different warranty terms and processes. Please verify the exact steps with ${receipt.brand_name}'s official customer service.

Your warranty period: ${receipt.warranty_period || 'Check with manufacturer'}
Purchase date: ${new Date(receipt.purchase_date).toLocaleDateString()}`;
    }
    
    if (lowerQuery.includes('document') || lowerQuery.includes('need')) {
      return `For warranty claims on your ${receipt.brand_name} ${receipt.product_description}, you typically need:

**Essential Documents:**
✅ Purchase receipt (you have this in Smart Receipts!)
✅ Product serial number
✅ Warranty card (if provided)

**Additional Items (if applicable):**
• Photos of the defect or issue
• Product registration proof
• Previous repair records

**Good News**: Your receipt is already stored securely in Smart Receipts, so you have the most important document ready!

**Next Step**: Contact ${receipt.brand_name} customer service to confirm their specific requirements, as each brand may have slightly different documentation needs.`;
    }
    
    if (lowerQuery.includes('service') || lowerQuery.includes('center') || lowerQuery.includes('where')) {
      return `To find service centers for your ${receipt.brand_name} ${receipt.product_description}:

**Official Service Centers:**
1. Visit ${receipt.brand_name}'s official website
2. Look for "Service Centers" or "Support" section
3. Use their store locator with your location

**Alternative Options:**
• Call ${receipt.brand_name} customer service for nearest center
• Check if they offer pickup/delivery service
• Ask about authorized third-party repair centers

**Your Purchase Location**: ${receipt.purchase_location || 'Unknown'}
**Country**: ${receipt.country || 'Unknown'}

**Tip**: Many brands now offer online service booking and some provide home service for larger appliances.

For the most accurate and up-to-date service center information, please check ${receipt.brand_name}'s official website or contact their customer service directly.`;
    }
    
    // Default response
    return `I'd be happy to help with warranty information for your ${receipt.brand_name} ${receipt.product_description}!

**Your Product Details:**
• Brand: ${receipt.brand_name}
• Product: ${receipt.product_description}
• Purchase Date: ${new Date(receipt.purchase_date).toLocaleDateString()}
• Warranty Period: ${receipt.warranty_period || 'Check with manufacturer'}

**What I Can Help With:**
• Warranty claim process
• Required documents
• Service center locations
• Coverage details
• General warranty guidance

**For Specific Information:**
Please contact ${receipt.brand_name} customer service or visit their official website for the most accurate and current warranty terms and procedures.

What specific aspect of the warranty would you like to know more about?`;
  }

  /**
   * Log warranty query to database
   */
  private static async logWarrantyQuery(
    query: string,
    receipt: Receipt,
    userId?: string
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('warranty_bot_logs')
        .insert([{
          user_id: userId,
          receipt_id: receipt.id,
          query_text: query,
          bot_response: '', // Will be updated after response is generated
          timestamp: new Date().toISOString()
        }]);

      if (error) {
        console.error('Failed to log warranty query:', error);
      }
    } catch (error) {
      console.error('Error logging warranty query:', error);
    }
  }

  /**
   * Update logged query with bot response
   */
  private static async updateLoggedResponse(
    queryId: string,
    response: string
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('warranty_bot_logs')
        .update({ bot_response: response })
        .eq('id', queryId);

      if (error) {
        console.error('Failed to update logged response:', error);
      }
    } catch (error) {
      console.error('Error updating logged response:', error);
    }
  }

  /**
   * Get warranty analytics for admin review
   */
  static async getWarrantyAnalytics(startDate?: string, endDate?: string): Promise<{
    totalQueries: number;
    topBrands: Array<{ brand: string; count: number }>;
    topQuestions: Array<{ query: string; count: number }>;
    unansweredQueries: Array<{ query: string; receipt_id: string; timestamp: string }>;
  }> {
    try {
      let query = supabase
        .from('warranty_bot_logs')
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

      const logs = data || [];
      
      // Calculate analytics
      const totalQueries = logs.length;
      
      // Top brands (would need to join with receipts table)
      const topBrands: Array<{ brand: string; count: number }> = [];
      
      // Top questions
      const queryCount: { [key: string]: number } = {};
      logs.forEach(log => {
        const normalized = log.query_text.toLowerCase().trim();
        queryCount[normalized] = (queryCount[normalized] || 0) + 1;
      });

      const topQuestions = Object.entries(queryCount)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([query, count]) => ({ query, count }));

      // Unanswered queries (empty responses)
      const unansweredQueries = logs
        .filter(log => !log.bot_response || log.bot_response.trim() === '')
        .map(log => ({
          query: log.query_text,
          receipt_id: log.receipt_id,
          timestamp: log.timestamp
        }));

      return {
        totalQueries,
        topBrands,
        topQuestions,
        unansweredQueries
      };
    } catch (error) {
      console.error('Error getting warranty analytics:', error);
      return {
        totalQueries: 0,
        topBrands: [],
        topQuestions: [],
        unansweredQueries: []
      };
    }
  }
}