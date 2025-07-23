// FAQ Knowledge Base for Smart Receipts Chatbot
export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  keywords: string[];
}

export const faqKnowledgeBase: FAQItem[] = [
  {
    id: 'accuracy',
    question: 'How accurate is the AI receipt scanning?',
    answer: 'Our AI technology achieves 99.5% accuracy in extracting information from receipts. It can read text from various receipt types, lighting conditions, and even slightly damaged receipts. The system continuously learns and improves with each scan.',
    category: 'scanning',
    keywords: ['accuracy', 'ai', 'scanning', 'ocr', 'precision', 'reliable']
  },
  {
    id: 'manual-entry',
    question: 'What happens if I can\'t scan a receipt?',
    answer: 'If automatic scanning fails, you can manually enter receipt information through our user-friendly interface. Our customer support team is also available 24/7 to help with any scanning issues or manual data entry.',
    category: 'scanning',
    keywords: ['manual', 'entry', 'failed', 'scan', 'backup', 'support']
  },
  {
    id: 'warranty-tracking',
    question: 'How does warranty tracking work?',
    answer: 'Smart Receipt automatically identifies warranty-eligible items from your receipts and registers them with manufacturers when possible. We send you alerts 30, 60, and 90 days before warranty expiration, along with instructions on how to file claims.',
    category: 'warranty',
    keywords: ['warranty', 'tracking', 'alerts', 'expiration', 'claims', 'notifications']
  },
  {
    id: 'data-security',
    question: 'Is my data secure and private?',
    answer: 'Absolutely. We use bank-level encryption (AES-256) to protect your data both in transit and at rest. Your receipts are stored in SOC 2 certified data centers, and we never share your personal information with third parties without your consent.',
    category: 'security',
    keywords: ['security', 'privacy', 'encryption', 'safe', 'protected', 'data']
  },
  {
    id: 'multi-device',
    question: 'Can I access my receipts from multiple devices?',
    answer: 'Yes! Smart Receipt syncs across all your devices - smartphones, tablets, and computers. Your receipts are securely stored in the cloud and accessible anywhere with an internet connection.',
    category: 'access',
    keywords: ['devices', 'sync', 'cloud', 'mobile', 'computer', 'access']
  },
  {
    id: 'file-formats',
    question: 'What file formats are supported for receipt uploads?',
    answer: 'You can upload receipts in various formats including JPEG, PNG, PDF, and HEIC. Our mobile app can scan receipts directly using your phone\'s camera, while the web version supports drag-and-drop uploads.',
    category: 'formats',
    keywords: ['formats', 'jpeg', 'png', 'pdf', 'upload', 'camera', 'mobile']
  },
  {
    id: 'ai-chatbot',
    question: 'How does the AI chatbot help with warranty claims?',
    answer: 'Our AI chatbot guides you through the warranty claim process step-by-step, helps you gather required documentation, provides manufacturer contact information, and can even help draft claim emails. For complex cases, it escalates to our human support team.',
    category: 'support',
    keywords: ['chatbot', 'ai', 'warranty', 'claims', 'support', 'help', 'guidance']
  },
  {
    id: 'receipt-limits',
    question: 'Is there a limit to how many receipts I can store?',
    answer: 'Our free plan includes 5 receipts per month. Premium plans offer unlimited receipt storage, advanced analytics, priority support, and additional features like bulk upload and export capabilities.',
    category: 'plans',
    keywords: ['limit', 'storage', 'free', 'premium', 'unlimited', 'plans']
  },
  {
    id: 'long-receipts',
    question: 'Can I scan long receipts?',
    answer: 'Yes! Smart Receipt has a special long receipt mode that allows you to capture extra-long receipts by taking multiple photos and automatically stitching them together. This is perfect for grocery receipts or detailed invoices.',
    category: 'scanning',
    keywords: ['long', 'receipts', 'multiple', 'photos', 'grocery', 'invoices']
  },
  {
    id: 'multi-product',
    question: 'Can Smart Receipt handle receipts with multiple products?',
    answer: 'Absolutely! Our AI automatically detects when a receipt contains multiple products and tracks warranty periods for each item separately. For example, if you buy a laptop, mouse, and keyboard from the same store, each will have its own warranty tracking.',
    category: 'features',
    keywords: ['multiple', 'products', 'multi-product', 'separate', 'warranty', 'individual']
  },
  {
    id: 'mobile-app',
    question: 'Is there a mobile app available?',
    answer: 'Smart Receipt is a Progressive Web App (PWA) that works seamlessly on all devices. You can install it on your phone like a native app, and it works offline. We support both iOS and Android devices.',
    category: 'mobile',
    keywords: ['mobile', 'app', 'pwa', 'ios', 'android', 'install', 'offline']
  },
  {
    id: 'pricing',
    question: 'How much does Smart Receipt cost?',
    answer: 'We offer a free plan with 5 receipts per month. Our Premium plan is AU$7/month and includes unlimited receipt scanning, advanced AI features, smart search, priority support, and export capabilities.',
    category: 'pricing',
    keywords: ['cost', 'price', 'free', 'premium', 'monthly', 'unlimited']
  },
  {
    id: 'export-data',
    question: 'Can I export my receipt data?',
    answer: 'Yes! Premium users can export their receipt data in multiple formats including CSV, PDF, and Excel. This is perfect for accounting, tax preparation, or business expense reporting.',
    category: 'features',
    keywords: ['export', 'data', 'csv', 'pdf', 'excel', 'accounting', 'tax']
  },
  {
    id: 'smart-search',
    question: 'What is Smart Search and how does it work?',
    answer: 'Smart Search uses AI to understand your natural language queries. You can ask questions like "How much did I spend on electronics?" or "Show me all Apple products I bought" and get intelligent answers with relevant receipts.',
    category: 'features',
    keywords: ['smart', 'search', 'ai', 'natural', 'language', 'queries', 'intelligent']
  },
  {
    id: 'warranty-alerts',
    question: 'How do warranty alerts work?',
    answer: 'Smart Receipt automatically calculates warranty expiration dates for each product and sends you notifications 90, 60, and 30 days before expiration. You\'ll also get critical alerts 7 days before expiration.',
    category: 'warranty',
    keywords: ['alerts', 'notifications', 'expiration', 'automatic', 'reminders']
  },
  {
    id: 'support-contact',
    question: 'How can I contact customer support?',
    answer: 'You can reach our support team at smartreceiptsau@gmail.com or through the in-app support chat. We provide 24/7 support for Premium users and business hours support for free users.',
    category: 'support',
    keywords: ['support', 'contact', 'email', 'help', 'customer', 'service']
  }
];

export class FAQMatcher {
  /**
   * Find the best matching FAQ based on user query
   */
  static findBestMatch(query: string): FAQItem | null {
    const normalizedQuery = query.toLowerCase().trim();
    
    // First, try exact question matching
    for (const faq of faqKnowledgeBase) {
      if (faq.question.toLowerCase().includes(normalizedQuery) || 
          normalizedQuery.includes(faq.question.toLowerCase())) {
        return faq;
      }
    }
    
    // Then try keyword matching
    const queryWords = normalizedQuery.split(/\s+/);
    let bestMatch: FAQItem | null = null;
    let bestScore = 0;
    
    for (const faq of faqKnowledgeBase) {
      let score = 0;
      
      // Check keywords
      for (const keyword of faq.keywords) {
        for (const word of queryWords) {
          if (keyword.includes(word) || word.includes(keyword)) {
            score += 2;
          }
        }
      }
      
      // Check question and answer content
      const content = (faq.question + ' ' + faq.answer).toLowerCase();
      for (const word of queryWords) {
        if (content.includes(word)) {
          score += 1;
        }
      }
      
      if (score > bestScore && score >= 3) { // Minimum threshold
        bestScore = score;
        bestMatch = faq;
      }
    }
    
    return bestMatch;
  }
  
  /**
   * Get FAQs by category
   */
  static getFAQsByCategory(category: string): FAQItem[] {
    return faqKnowledgeBase.filter(faq => faq.category === category);
  }
  
  /**
   * Get all categories
   */
  static getCategories(): string[] {
    const categories = [...new Set(faqKnowledgeBase.map(faq => faq.category))];
    return categories.sort();
  }
  
  /**
   * Search FAQs with fuzzy matching
   */
  static searchFAQs(query: string, limit: number = 5): FAQItem[] {
    const normalizedQuery = query.toLowerCase().trim();
    const results: { faq: FAQItem; score: number }[] = [];
    
    for (const faq of faqKnowledgeBase) {
      let score = 0;
      const content = (faq.question + ' ' + faq.answer + ' ' + faq.keywords.join(' ')).toLowerCase();
      
      // Simple scoring based on word matches
      const queryWords = normalizedQuery.split(/\s+/);
      for (const word of queryWords) {
        if (content.includes(word)) {
          score += word.length; // Longer words get higher scores
        }
      }
      
      if (score > 0) {
        results.push({ faq, score });
      }
    }
    
    // Sort by score and return top results
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(result => result.faq);
  }
}