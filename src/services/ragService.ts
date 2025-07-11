interface Receipt {
  id: string;
  product_description: string;
  brand_name: string;
  store_name: string;
  purchase_location: string;
  purchase_date: string;
  amount: number;
  warranty_period: string;
  model_number: string;
  country: string;
  relevanceScore?: number;
}

interface RAGResponse {
  answer: string;
  receipts: Receipt[];
  queryType: 'search' | 'summary' | 'question';
  error?: string;
}

export class RAGService {
  private static readonly OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

  /**
   * Main RAG function that combines retrieval and generation
   */
  static async processQuery(
    query: string,
    receipts: Receipt[],
    userId: string
  ): Promise<RAGResponse> {
    try {
      // Determine query type
      const queryType = this.determineQueryType(query);
      
      // Format receipts for LLM context
      const formattedReceipts = this.formatReceiptsForLLM(receipts);
      
      // Generate AI response
      const answer = await this.generateAIResponse(query, formattedReceipts, queryType);
      
      return {
        answer,
        receipts,
        queryType,
      };
    } catch (error) {
      console.error('RAG processing error:', error);
      return {
        answer: 'I apologize, but I encountered an error while processing your query. Please try again.',
        receipts,
        queryType: 'search',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Determine the type of query to customize the response
   */
  private static determineQueryType(query: string): 'search' | 'summary' | 'question' {
    const lowerQuery = query.toLowerCase();
    
    // Summary queries
    if (lowerQuery.includes('how much') || 
        lowerQuery.includes('total') || 
        lowerQuery.includes('spent') ||
        lowerQuery.includes('sum') ||
        lowerQuery.includes('cost')) {
      return 'summary';
    }
    
    // Question queries
    if (lowerQuery.includes('what') || 
        lowerQuery.includes('when') || 
        lowerQuery.includes('where') ||
        lowerQuery.includes('why') ||
        lowerQuery.includes('how') ||
        lowerQuery.includes('?')) {
      return 'question';
    }
    
    // Default to search
    return 'search';
  }

  /**
   * Format receipts for LLM context
   */
  private static formatReceiptsForLLM(receipts: Receipt[]): string {
    if (receipts.length === 0) {
      return 'No receipts found for this query.';
    }

    const formattedReceipts = receipts.map((receipt, index) => {
      return `Receipt ${index + 1}:
- Product: ${receipt.product_description}
- Brand: ${receipt.brand_name}
- Store: ${receipt.store_name || 'Unknown'}
- Location: ${receipt.purchase_location || 'Unknown'}
- Date: ${receipt.purchase_date}
- Amount: $${receipt.amount || 0}
- Warranty: ${receipt.warranty_period}
- Model: ${receipt.model_number || 'N/A'}
- Country: ${receipt.country}`;
    }).join('\n\n');

    return formattedReceipts;
  }

  /**
   * Generate AI response using OpenAI GPT
   */
  private static async generateAIResponse(
    query: string,
    formattedReceipts: string,
    queryType: 'search' | 'summary' | 'question'
  ): Promise<string> {
    const openaiApiKey = import.meta.env.VITE_OPENAI_API_KEY;
    
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const systemPrompt = this.getSystemPrompt(queryType);
    const userPrompt = this.getUserPrompt(query, formattedReceipts, queryType);

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
        max_tokens: 500,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${errorData}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No response from OpenAI');
    }

    return content.trim();
  }

  /**
   * Get system prompt based on query type
   */
  private static getSystemPrompt(queryType: 'search' | 'summary' | 'question'): string {
    const basePrompt = `You are a helpful assistant that answers questions about receipt data. You should:
- Only use the receipt data provided to answer questions
- Be concise and accurate
- If you can't answer based on the provided data, say so
- Format monetary amounts clearly (e.g., $123.45)
- Use bullet points or tables when appropriate`;

    switch (queryType) {
      case 'summary':
        return `${basePrompt}
- Focus on providing numerical summaries and calculations
- Group similar items when relevant
- Highlight key insights about spending patterns`;
      
      case 'question':
        return `${basePrompt}
- Answer the specific question asked
- Provide context from the receipts when helpful
- Be conversational but informative`;
      
      default:
        return `${basePrompt}
- Summarize the relevant receipts found
- Highlight key details that match the search query`;
    }
  }

  /**
   * Get user prompt based on query type
   */
  private static getUserPrompt(
    query: string,
    formattedReceipts: string,
    queryType: 'search' | 'summary' | 'question'
  ): string {
    const basePrompt = `User query: "${query}"

Receipt data:
${formattedReceipts}`;

    switch (queryType) {
      case 'summary':
        return `${basePrompt}

Please provide a summary answer to the user's query, including relevant calculations and insights.`;
      
      case 'question':
        return `${basePrompt}

Please answer the user's question based on the receipt data provided.`;
      
      default:
        return `${basePrompt}

Please provide a helpful summary of the receipts that match the user's search query.`;
    }
  }

  /**
   * Validate if a query is suitable for RAG processing
   */
  static isRAGQuery(query: string): boolean {
    const lowerQuery = query.toLowerCase();
    
    // Check for question words or complex queries
    const questionWords = ['what', 'when', 'where', 'why', 'how', 'which', 'who'];
    const summaryWords = ['total', 'sum', 'spent', 'cost', 'much', 'many'];
    const complexWords = ['compare', 'versus', 'vs', 'between', 'analyze', 'trend'];
    
    return questionWords.some(word => lowerQuery.includes(word)) ||
           summaryWords.some(word => lowerQuery.includes(word)) ||
           complexWords.some(word => lowerQuery.includes(word)) ||
           lowerQuery.includes('?') ||
           query.split(' ').length > 3; // Multi-word queries
  }
} 