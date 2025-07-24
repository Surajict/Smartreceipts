import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, ChevronDown, ChevronUp, Book, MessageCircle, Phone, Mail, Camera, Shield, Brain, Settings } from 'lucide-react';
import Header from './Header';
import HomepageFooter from './HomepageFooter';

const HelpCenter: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>('getting-started');
  const [openFAQ, setOpenFAQ] = useState<number | null>(0);

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
    {
      question: 'How accurate is the AI receipt scanning?',
      answer: 'Our AI technology achieves 99.5% accuracy in extracting information from receipts. It can read text from various receipt types, lighting conditions, and even slightly damaged receipts. The system continuously learns and improves with each scan.'
    },
    {
      question: 'What happens if I can\'t scan a receipt?',
      answer: 'If automatic scanning fails, you can manually enter receipt information through our user-friendly interface. Our customer support team is also available to help with any scanning issues or manual data entry.'
    },
    {
      question: 'How does warranty tracking work?',
      answer: 'Smart Receipts automatically identifies warranty-eligible items from your receipts and tracks warranty periods for each individual product. We send you alerts before warranties expire, along with all the information you need to file claims.'
    },
    {
      question: 'Is my data secure and private?',
      answer: 'Absolutely. We use bank-level encryption (AES-256) to protect your data both in transit and at rest. Your receipts are stored in secure data centers, and we never share your personal information with third parties without your consent.'
    },
    {
      question: 'Can I access my receipts from multiple devices?',
      answer: 'Yes! Smart Receipts syncs across all your devices - smartphones, tablets, and computers. Your receipts are securely stored in the cloud and accessible anywhere with an internet connection.'
    },
    {
      question: 'What file formats are supported for uploading?',
      answer: 'You can upload receipts in JPEG, PNG, PDF, and HEIC formats. Our mobile app can scan receipts directly using your phone\'s camera, while the web version supports drag-and-drop uploads.'
    }
  ];

  const filteredFAQs = faqs.filter(faq =>
    faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
                  placeholder="Search for help articles and FAQs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 text-lg border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent shadow-card"
                />
              </div>
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
                            dangerouslySetInnerHTML={{ __html: article.content }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* FAQ Section */}
                <div>
                  <h2 className="text-3xl font-bold text-text-primary mb-8">
                    Frequently Asked Questions
                  </h2>
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

                  {searchQuery && filteredFAQs.length === 0 && (
                    <div className="text-center py-12">
                      <p className="text-text-secondary text-lg">
                        No results found for "{searchQuery}". Try different keywords or{' '}
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