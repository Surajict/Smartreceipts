import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, ChevronDown, ChevronUp, Book, MessageCircle, Phone, Mail, Camera, Shield, Brain, Settings, Loader2, Bot } from 'lucide-react';
import Header from './Header';
import HomepageFooter from './HomepageFooter';
import DOMPurify from 'dompurify';

const HelpCenter: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>('getting-started');
  const [openFAQ, setOpenFAQ] = useState<number | null>(0);
  const [aiResponse, setAiResponse] = useState<string>('');
  const [isSearching, setIsSearching] = useState(false);
  const [sessionId] = useState<string>(() => `helpcenter_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`);

  const categories = [
    {
      id: 'getting-started',
      name: 'Getting Started',
      icon: Book,
      description: 'Learn the basics of Smart Receipts'
    },
    {
      id: 'scanning',
      name: 'Receipt Scanning',
      icon: Camera,
      description: 'How to scan and upload receipts'
    },
    {
      id: 'ai-features',
      name: 'AI Features',
      icon: Brain,
      description: 'Understanding AI extraction and validation'
    },
    {
      id: 'warranty',
      name: 'Warranty Tracking',
      icon: Shield,
      description: 'Managing warranties and alerts'
    },
    {
      id: 'account',
      name: 'Account & Settings',
      icon: Settings,
      description: 'Managing your account and preferences'
    }
  ];

  const helpContent = {
    'getting-started': {
      title: 'Getting Started with Smart Receipts',
      articles: [
        {
          title: 'Creating Your Account',
          content: `
            <h3>Step 1: Sign Up</h3>
            <p>Visit our homepage and click "Start Free Trial" or "Sign Up". Enter your email address and create a secure password.</p>
            
            <h3>Step 2: Verify Your Email</h3>
            <p>Check your email inbox for a verification link from Smart Receipts. Click the link to activate your account.</p>
            
            <h3>Step 3: Complete Your Profile</h3>
            <p>Add your name and preferences to personalize your experience. This helps our AI provide better suggestions.</p>
          `
        },
        {
          title: 'Your First Receipt Scan',
          content: `
            <h3>Using the Camera</h3>
            <p>1. Navigate to the Dashboard and click "Scan Receipt"</p>
            <p>2. Choose "Camera" option</p>
            <p>3. Position your receipt flat and ensure good lighting</p>
            <p>4. Take the photo when the receipt is clearly visible</p>
            
            <h3>Uploading Files</h3>
            <p>You can also upload existing receipt images (JPG, PNG, PDF) by selecting "Upload" instead of "Camera".</p>
          `
        }
      ]
    },
    'scanning': {
      title: 'Receipt Scanning Guide',
      articles: [
        {
          title: 'Best Practices for Scanning',
          content: `
            <h3>Lighting and Positioning</h3>
            <p>• Use good, even lighting - avoid shadows</p>
            <p>• Keep the receipt flat against a contrasting background</p>
            <p>• Ensure all text is clearly visible</p>
            <p>• Avoid reflections from glossy receipts</p>
            
            <h3>Supported Formats</h3>
            <p>• JPEG and PNG images</p>
            <p>• PDF documents</p>
            <p>• HEIC files (from iPhones)</p>
            <p>• Maximum file size: 10MB</p>
          `
        },
        {
          title: 'Multi-Product Receipts',
          content: `
            <h3>Automatic Detection</h3>
            <p>Our AI automatically detects when a receipt contains multiple products and organizes them separately.</p>
            
            <h3>Manual Multi-Product Entry</h3>
            <p>If you prefer to enter multiple products manually:</p>
            <p>1. Choose "Manual Multi" from the scanning options</p>
            <p>2. Enter each product separately</p>
            <p>3. The system will group them as one receipt</p>
          `
        }
      ]
    },
    'ai-features': {
      title: 'AI Features & Technology',
      articles: [
        {
          title: 'How AI Extraction Works',
          content: `
            <h3>OCR Technology</h3>
            <p>We use advanced Optical Character Recognition (OCR) to read text from your receipt images with 99.5% accuracy.</p>
            
            <h3>GPT-4 Processing</h3>
            <p>Our AI understands the context of receipt data and extracts structured information including:</p>
            <p>• Product names and descriptions</p>
            <p>• Brand information</p>
            <p>• Prices and totals</p>
            <p>• Purchase dates</p>
            <p>• Store information</p>
            <p>• Warranty periods</p>
          `
        },
        {
          title: 'Smart Search & RAG',
          content: `
            <h3>Natural Language Search</h3>
            <p>Ask questions in plain English like:</p>
            <p>• "How much did I spend on electronics this year?"</p>
            <p>• "Show me all Apple products I bought"</p>
            <p>• "What warranties expire next month?"</p>
            
            <h3>AI-Powered Answers</h3>
            <p>Our Retrieval-Augmented Generation (RAG) system provides intelligent answers based on your receipt data.</p>
          `
        }
      ]
    },
    'warranty': {
      title: 'Warranty Management',
      articles: [
        {
          title: 'How Warranty Tracking Works',
          content: `
            <h3>Automatic Detection</h3>
            <p>Our AI automatically identifies warranty-eligible products and calculates expiration dates based on:</p>
            <p>• Product category and brand</p>
            <p>• Standard warranty periods</p>
            <p>• Regional warranty laws</p>
            
            <h3>Custom Warranty Periods</h3>
            <p>You can manually set warranty periods for products when:</p>
            <p>• You have extended warranties</p>
            <p>• The AI couldn't determine the warranty period</p>
            <p>• You want to override the default period</p>
          `
        },
        {
          title: 'Warranty Alerts & Claims',
          content: `
            <h3>Alert Timing</h3>
            <p>We send alerts at:</p>
            <p>• 90 days before expiration</p>
            <p>• 30 days before expiration</p>
            <p>• 7 days before expiration</p>
            
            <h3>Claim Preparation</h3>
            <p>For each alert, we provide:</p>
            <p>• Original receipt image</p>
            <p>• Product details</p>
            <p>• Purchase date and warranty period</p>
            <p>• Manufacturer contact information</p>
          `
        }
      ]
    },
    'account': {
      title: 'Account Management',
      articles: [
        {
          title: 'Managing Your Profile',
          content: `
            <h3>Personal Information</h3>
            <p>Update your name, email, and contact preferences in the Profile section.</p>
            
            <h3>Notification Settings</h3>
            <p>Control how and when you receive:</p>
            <p>• Warranty expiration alerts</p>
            <p>• System notifications</p>
            <p>• Product updates</p>
            <p>• Marketing communications</p>
          `
        },
        {
          title: 'Subscription Management',
          content: `
            <h3>Upgrading Your Plan</h3>
            <p>Upgrade to Premium or Business plans for unlimited receipts and advanced features.</p>
            
            <h3>Billing & Cancellation</h3>
            <p>• View billing history</p>
            <p>• Update payment methods</p>
            <p>• Cancel subscription (with 30-day money-back guarantee)</p>
            <p>• Export your data before canceling</p>
          `
        }
      ]
    }
  };

  const faqs = [
    // Getting Started & Basic Features
    {
      category: 'Getting Started',
      question: 'What is Smart Receipts, and how does it work?',
      answer: 'Smart Receipts is an AI-powered Progressive Web App (PWA) that transforms your physical receipts into organised digital records. Simply take a photo of any receipt, and our advanced AI instantly extracts all the important information - product details, prices, warranty periods, and store information. It works on any device with a camera and an internet connection.'
    },
    {
      category: 'Getting Started',
      question: 'Do I need to download an app from the App Store?',
      answer: 'No! Smart Receipts is a Progressive Web App (PWA) that works directly in your browser. You can install it on your phone, tablet, or computer for a native app-like experience without going through any app store. It works on all devices - iPhone, Android, Windows, Mac, and more.'
    },
    {
      category: 'Getting Started',
      question: 'Is Smart Receipts really free to use?',
      answer: 'Yes, Smart Receipts is currently on invite and is completely free to use. You get unlimited receipt scanning, AI-powered data extraction, warranty tracking, smart search, and cloud storage for all your receipts during this evaluation period. Soon, we will announce the pricing.'
    },
    {
      category: 'Getting Started',
      question: 'How accurate is the AI receipt scanning?',
      answer: 'Our AI technology achieves over 95% accuracy in extracting information from receipts. We use multiple AI systems working together to ensure maximum accuracy. Even if a receipt is slightly damaged, blurry, or in poor lighting, our AI can usually read it perfectly.'
    },
    {
      category: 'Getting Started',
      question: 'What types of receipts can Smart Receipts handle?',
      answer: 'Smart Receipts can process virtually any type of receipt - retail purchases, restaurants, gas stations, online orders, electronics stores, grocery stores, and more. It handles both paper receipts (via camera) and digital receipts (PDF uploads). It even works with long receipts and multi-product purchases from stores like Best Buy or Amazon.'
    },

    // Device Compatibility & Technical
    {
      category: 'Technical',
      question: 'What devices and browsers work with Smart Receipts?',
      answer: 'Smart Receipts works on all modern devices and browsers: iPhone (Safari, Chrome), Android (Chrome, Samsung Browser), Windows (Chrome, Edge, Firefox), Mac (Safari, Chrome, Firefox), iPad, tablets, and desktop computers. As a PWA, it provides a native app experience on all platforms.'
    },
    {
      category: 'Technical',
      question: 'Can I use Smart Receipts offline?',
      answer: 'Yes! As a Progressive Web App, Smart Receipts works offline for viewing your existing receipts. You can browse your library, search through saved receipts, and view warranty information even without an internet connection. New receipt scanning requires internet for AI processing.'
    },
    {
      category: 'Technical',
      question: 'How much storage space does Smart Receipts use?',
      answer: 'Smart Receipts uses minimal storage on your device since everything is stored securely in the cloud. The PWA itself takes less than 5MB of space when installed. Your receipt images are compressed and optimized, so even thousands of receipts won\'t impact your device storage.'
    },
    {
      category: 'Technical',
      question: 'Can I install Smart Receipts on multiple devices?',
      answer: 'Absolutely! Install Smart Receipts on all your devices - phone, tablet, laptop, and desktop. Everything syncs automatically across all devices, so you can scan a receipt on your phone and view it later on your computer. Your data is always up-to-date everywhere.'
    },

    // Privacy & Security
    {
      category: 'Security',
      question: 'Is my personal and financial data secure?',
      answer: 'Security is our top priority. We use bank-level encryption (AES-256) to protect your data both in transit and at rest. Your receipts are stored in SOC 2 certified data centers with multiple layers of security. We never share your personal information with third parties without your explicit consent.'
    },
    {
      category: 'Security',
      question: 'Who can see my receipt data?',
      answer: 'Only you can see your receipt data. We use Row Level Security (RLS) to ensure that your receipts are completely private and isolated from other users. Even our support team cannot access your personal receipt information without your explicit permission.'
    },
    {
      category: 'Security',
      question: 'What happens to my data if I stop using Smart Receipts?',
      answer: 'You own your data completely. You can export all your receipt data at any time in standard formats. If you decide to delete your account, all your data is permanently removed from our servers within 30 days. We provide clear data export options before account deletion.'
    },
    {
      category: 'Security',
      question: 'Do you sell my data to advertisers or third parties?',
      answer: 'Never. We do not sell, rent, or share your personal data with advertisers, marketers, or any third parties. Our business model is built on providing value to users, not on selling data. Your privacy is fundamental to our service.'
    },

    // Warranty Tracking
    {
      category: 'Warranty',
      question: 'How does warranty tracking work?',
      answer: 'Smart Receipts automatically identifies warranty-eligible items from your receipts and tracks each product\'s warranty period individually. For a multi-product receipt (like buying a laptop, mouse, and keyboard), each item gets its own warranty tracking. We send you notifications 30, 60, and 90 days before warranties expire.'
    },
    {
      category: 'Warranty',
      question: 'What types of warranties can Smart Receipts track?',
      answer: 'We track all types of warranties - manufacturer warranties, extended warranties, store warranties, and service plans. This includes electronics, appliances, tools, furniture, vehicles, and any product with a warranty period. Each product can have different warranty lengths even on the same receipt.'
    },
    {
      category: 'Warranty',
      question: 'Will I get notifications when my warranties are about to expire?',
      answer: 'Yes! Smart Receipts sends you timely notifications before warranties expire. You\'ll get alerts on your phone, tablet, or computer (depending on where you have the app installed). Notifications work even when the app is closed, ensuring you never miss a warranty deadline.'
    },
    {
      category: 'Warranty',
      question: 'Can Smart Receipts help me file warranty claims?',
      answer: 'While Smart Receipts doesn\'t file claims directly, it provides everything you need: organized receipt images, product details, purchase dates, warranty periods, and store information. This makes filing warranty claims much easier and faster when you need to contact manufacturers or retailers.'
    },

    // AI & Smart Features
    {
      category: 'AI Features',
      question: 'What makes Smart Receipts "smart"?',
      answer: 'Smart Receipts uses multiple AI technologies working together: OCR for reading text, OpenAI understanding context, Perplexity AI for validation, and vector search for intelligent queries. You can ask questions like "How much did I spend on electronics this year?" and get detailed, accurate answers.'
    },
    {
      category: 'AI Features',
      question: 'Can I search my receipts using natural language?',
      answer: 'Yes! Our AI-powered smart search understands natural language queries. Ask questions like "Show me Apple products I bought", "What did I spend on kitchen appliances?", or "Which warranties expire next month?" The AI understands context and provides relevant results with explanations.'
    },
    {
      category: 'AI Features',
      question: 'What if the AI makes mistakes reading my receipt?',
      answer: 'While our AI is highly accurate, you can always edit any information manually. The system shows confidence scores for extracted data, and you can easily correct any mistakes. Over time, these corrections help improve the AI\'s accuracy for similar receipts.'
    },
    {
      category: 'AI Features',
      question: 'Does Smart Receipts work with handwritten receipts?',
      answer: 'Yes! Our advanced OCR technology can read most handwritten receipts, though printed receipts generally have higher accuracy. For handwritten receipts with unclear text, you can use our manual entry option to ensure all information is captured correctly.'
    },

    // Receipt Management
    {
      category: 'Management',
      question: 'How many receipts can I store?',
      answer: 'There\'s no limit! Store thousands of receipts without worrying about running out of space. Our cloud storage scales automatically, and our efficient compression means even large collections of receipts load quickly and don\'t impact performance.'
    },
    {
      category: 'Management',
      question: 'Can I organise my receipts into categories or folders?',
      answer: 'Smart Receipts automatically organises receipts by date, store, product type, and more. Our AI-powered search makes finding specific receipts easy without manual categorisation. You can search by any criteria - brand, store, date range, product type, or even spending amount.'
    },
    {
      category: 'Management',
      question: 'What if I have a very long receipt with many items?',
      answer: 'No problem! Smart Receipts has a special long receipt mode for capturing extra-long receipts in multiple photos. Our AI automatically stitches them together and processes all items individually. This is perfect for grocery shopping, warehouse stores, or large electronics purchases.'
    },
    {
      category: 'Management',
      question: 'Can I upload digital receipts (PDFs) from online purchases?',
      answer: 'Absolutely! Smart Receipts handles both photo receipts and PDF uploads. Whether it\'s an email receipt from Amazon, a PDF from an online store, or a photo you took, our AI processes all formats and extracts the same detailed information.'
    },

    // Account & Setup
    {
      category: 'Account',
      question: 'How do I create an account and get started?',
      answer: 'Getting started is simple: visit Smart Receipts in your browser, click "Sign Up", enter your email and create a password, verify your email, and start scanning receipts immediately. The entire process takes less than 2 minutes, and you can scan your first receipt right away.'
    },
    {
      category: 'Account',
      question: 'Do I need to provide credit card information to sign up?',
      answer: 'No credit card required! Smart Receipts is completely free during the evaluation period, so you only need an email address and password to create your account. No payment information is ever requested or stored. Soon once the evaluation period ends, we will announce the pricing details.'
    },
    {
      category: 'Account',
      question: 'Can I use my Google account to sign up?',
      answer: 'Yes! You can sign up and log in using your existing Google account for convenience. This makes account creation even faster and eliminates the need to remember another password. Your Google account information remains private and secure.'
    },

    // Usage & Practical
    {
      category: 'Usage',
      question: 'How long does it take to scan and process a receipt?',
      answer: 'Receipt processing is very fast! Taking the photo is instant, and AI processing typically takes 2-5 seconds per receipt. Multi-product receipts might take a few seconds longer, but you\'ll have your organised digital receipt in under 10 seconds in most cases.'
    },
    {
      category: 'Usage',
      question: 'What should I do with physical receipts after scanning?',
      answer: 'Once you\'ve scanned a receipt and verified the information is correct, you can safely discard the physical receipt. Smart Receipts stores high-quality images and all extracted data, providing everything you need for returns, warranties, or tax purposes.'
    },
    {
      category: 'Usage',
      question: 'Can Smart Receipts help with tax preparation?',
      answer: 'Yes! Smart Receipts organises all your purchase information with dates, amounts, categories, and store details. You can easily search for business expenses, charitable donations, or other tax-deductible purchases. Export features make it easy to share data with tax preparers.'
    },
    {
      category: 'Usage',
      question: 'Is Smart Receipts useful for business expenses?',
      answer: 'Absolutely! Smart Receipts is perfect for tracking business expenses, client purchases, travel costs, and any business-related spending. The detailed categorisation and search features make expense reporting and reimbursement much easier.'
    },

    // Support & Reliability
    {
      category: 'Support',
      question: 'What if Smart Receipts doesn\'t work properly on my device?',
      answer: 'Smart Receipts is designed to work reliably on all modern devices. If you experience any issues, our support team is available to help via email at smartreceiptsau@gmail.com. Most issues are resolved quickly, and we continuously update the app to improve compatibility and performance.'
    },
    {
      category: 'Support',
      question: 'What happens if I can\'t scan a receipt?',
      answer: 'If automatic scanning fails for any reason, you can manually enter receipt information using our user-friendly interface. This ensures that no receipt is ever lost, even if it\'s damaged, handwritten, or in unusual formats.'
    },
    {
      category: 'Support',
      question: 'Does Smart Receipts work without a strong internet connection?',
      answer: 'Smart Receipts works with basic internet connections. Receipt scanning requires the internet for AI processing, but viewing existing receipts works offline. The app is optimised to work well even on slower connections or limited data plans.'
    }
  ];

  const filteredFAQs = faqs.filter(faq =>
    faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // AI-powered search function using n8n API
  const searchWithAI = async (query: string) => {
    if (!query.trim()) {
      setAiResponse('');
      return;
    }

    setIsSearching(true);
    setAiResponse('');

    try {
      const webhookUrl = import.meta.env.VITE_N8N_WEBHOOK_URL;
      
      if (!webhookUrl) {
        throw new Error('AI search is not configured. Please contact support.');
      }

      // Enhanced request body for FAQ search context
      const requestBody = {
        message: `Help Center Search: ${query.trim()}`,
        sessionId: sessionId,
        timestamp: new Date().toISOString(),
        source: 'help_center_search',
        context: 'faq_search',
        searchQuery: query.trim(),
        conversationContext: {
          isHelpCenterSearch: true,
          searchType: 'faq_assistance'
        }
      };

      console.log(`AI Search with Session ID: ${sessionId}`, requestBody);

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('AI Search response:', data);
      
      // Parse the n8n response format (same as chatbot)
      let responseText = '';
      
      if (Array.isArray(data) && data.length > 0 && data[0].output) {
        responseText = data[0].output;
      } else if (data.response) {
        responseText = data.response;
      } else if (data.message) {
        responseText = data.message;
      } else if (typeof data === 'string') {
        responseText = data;
      } else {
        responseText = 'I apologize, but I couldn\'t find a specific answer to your question. Please try rephrasing your search or contact our support team for personalized assistance.';
      }

      setAiResponse(responseText);
    } catch (error) {
      console.error('AI Search error:', error);
      setAiResponse('I\'m sorry, I\'m having technical difficulties with the search right now. Please try the manual search below or contact our support team.');
    } finally {
      setIsSearching(false);
    }
  };

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim().length > 2) {
        searchWithAI(searchQuery);
      } else {
        setAiResponse('');
      }
    }, 1000); // 1 second delay

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-20">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-primary/10 to-secondary/10 py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-text-primary mb-6">
              Help Center
            </h1>
            <p className="text-xl text-text-secondary max-w-3xl mx-auto leading-relaxed mb-8">
              Find answers to your questions and learn how to get the most out of Smart Receipts
            </p>

            {/* Search Bar */}
            <div className="max-w-2xl mx-auto relative">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-text-secondary" />
                <input
                  type="text"
                  placeholder="Ask me anything about Smart Receipts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 text-lg border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent shadow-card"
                />
                {isSearching && (
                  <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  </div>
                )}
              </div>
              
              {/* AI Response */}
              {(aiResponse || isSearching) && (
                <div className="mt-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 shadow-sm">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                      <Bot className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-primary mb-2">AI Assistant Response</h4>
                      {isSearching ? (
                        <div className="flex items-center space-x-2 text-text-secondary">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Searching for the best answer...</span>
                        </div>
                      ) : (
                        <div className="text-text-secondary leading-relaxed whitespace-pre-wrap">
                          {aiResponse}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        <div className="py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              
              {/* Categories Sidebar */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-lg shadow-card p-6 sticky top-8">
                  <h3 className="text-lg font-semibold text-text-primary mb-4">Help Categories</h3>
                  <nav className="space-y-2">
                    {categories.map((category) => {
                      const Icon = category.icon;
                      return (
                        <button
                          key={category.id}
                          onClick={() => setActiveCategory(category.id)}
                          className={`w-full text-left p-3 rounded-lg transition-colors duration-200 ${
                            activeCategory === category.id
                              ? 'bg-primary/10 text-primary border-l-4 border-primary'
                              : 'hover:bg-gray-50 text-text-secondary'
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            <Icon className="h-5 w-5" />
                            <div>
                              <div className="font-medium">{category.name}</div>
                              <div className="text-sm opacity-75">{category.description}</div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </nav>

                  {/* Contact Support */}
                  <div className="mt-8 pt-6 border-t border-gray-200">
                    <h4 className="text-sm font-semibold text-text-primary mb-3">Need More Help?</h4>
                    <div className="space-y-2">
                      <Link to="/contact" className="flex items-center space-x-2 text-sm text-primary hover:text-primary/80">
                        <MessageCircle className="h-4 w-4" />
                        <span>Contact Support</span>
                      </Link>
                      <a href="mailto:smartreceiptsau@gmail.com" className="flex items-center space-x-2 text-sm text-primary hover:text-primary/80">
                        <Mail className="h-4 w-4" />
                        <span>Email Us</span>
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Main Content */}
              <div className="lg:col-span-3">
                {/* Help Articles */}
                {activeCategory && helpContent[activeCategory] && (
                  <div className="mb-12">
                    <h2 className="text-3xl font-bold text-text-primary mb-8">
                      {helpContent[activeCategory].title}
                    </h2>
                    <div className="space-y-8">
                      {helpContent[activeCategory].articles.map((article, index) => (
                        <div key={index} className="bg-white rounded-lg shadow-card p-8">
                          <h3 className="text-xl font-semibold text-text-primary mb-4">
                            {article.title}
                          </h3>
                          <div 
                            className="prose max-w-none text-text-secondary"
                            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(article.content) }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* FAQ Section */}
                <div>
                  <div className="flex items-center justify-between mb-8">
                    <h2 className="text-3xl font-bold text-text-primary">
                      Frequently Asked Questions
                    </h2>
                    {searchQuery && (
                      <div className="text-sm text-text-secondary">
                        {filteredFAQs.length} result{filteredFAQs.length !== 1 ? 's' : ''} found
                      </div>
                    )}
                  </div>
                  {/* Separator when both AI and manual results exist */}
                  {aiResponse && searchQuery && filteredFAQs.length > 0 && (
                    <div className="mb-6 text-center">
                      <div className="flex items-center">
                        <div className="flex-1 border-t border-gray-300"></div>
                        <div className="px-4 text-sm text-text-secondary bg-background">
                          Or browse related FAQs below
                        </div>
                        <div className="flex-1 border-t border-gray-300"></div>
                      </div>
                    </div>
                  )}
                  
                  <div className="space-y-4">
                    {filteredFAQs.map((faq, index) => (
                      <div key={index} className="bg-white rounded-lg shadow-card">
                        <button
                          onClick={() => setOpenFAQ(openFAQ === index ? null : index)}
                          className="w-full text-left p-6 flex items-center justify-between hover:bg-gray-50 transition-colors duration-200"
                        >
                          <h3 className="text-lg font-semibold text-text-primary pr-4">
                            {faq.question}
                          </h3>
                          {openFAQ === index ? (
                            <ChevronUp className="h-5 w-5 text-text-secondary flex-shrink-0" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-text-secondary flex-shrink-0" />
                          )}
                        </button>
                        {openFAQ === index && (
                          <div className="px-6 pb-6">
                            <p className="text-text-secondary leading-relaxed">
                              {faq.answer}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {searchQuery && filteredFAQs.length === 0 && !aiResponse && !isSearching && (
                    <div className="text-center py-12">
                      <p className="text-text-secondary text-lg">
                        No FAQ results found for "{searchQuery}". Try different keywords or{' '}
                        <Link to="/contact" className="text-primary hover:text-primary/80 font-medium">
                          contact our support team
                        </Link>
                        .
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <HomepageFooter />
    </div>
  );
};

export default HelpCenter; 