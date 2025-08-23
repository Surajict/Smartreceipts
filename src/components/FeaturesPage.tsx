import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Camera, 
  Brain, 
  Shield, 
  Search, 
  Bell, 
  Cloud, 
  Smartphone, 
  BarChart3, 
  FileText, 
  Zap, 
  Lock, 
  RefreshCw,
  CheckCircle,
  ArrowRight
} from 'lucide-react';
import Header from './Header';
import HomepageFooter from './HomepageFooter';

const FeaturesPage: React.FC = () => {
  const mainFeatures = [
    {
      title: 'AI-Powered Receipt Scanning',
      description: 'Advanced OCR and AI technology that reads receipts with over 95% accuracy, extracting all important details instantly.',
      icon: Camera,
      features: [
        'Works with any receipt type or format',
        'Handles multiple products per receipt',
        'Processes long receipts automatically',
        'Works in various lighting conditions'
      ]
    },
    {
      title: 'Intelligent Data Extraction',
      description: 'Our AI understands context and extracts structured information including products, prices, warranties, and store details.',
      icon: Brain,
      features: [
        'Product names and descriptions',
        'Brand and model information',
        'Warranty periods and terms',
        'Store locations and contact info'
      ]
    },
    {
      title: 'Smart Warranty Tracking',
      description: 'Automatically tracks warranty periods for each product and sends timely alerts before expiration.',
      icon: Shield,
      features: [
        'Individual product warranty tracking',
        'Multiple alert notifications (90, 30, 7 days)',
        'Extended warranty support',
        'Claim preparation assistance'
      ]
    },
    {
      title: 'Natural Language Search',
      description: 'Ask questions in plain English and get intelligent answers about your purchases, spending, and warranties.',
      icon: Search,
      features: [
        'Conversational search queries',
        'Spending analysis and insights',
        'Product and brand filtering',
        'Date range and amount searches'
      ]
    }
  ];

  const additionalFeatures = [
    {
      title: 'Smart Notifications',
      description: 'Get timely alerts for warranty expirations and important updates',
      icon: Bell
    },
    {
      title: 'Cloud Storage',
      description: 'Secure, unlimited cloud storage with automatic backup',
      icon: Cloud
    },
    {
      title: 'Multi-Device Sync',
      description: 'Access your receipts from any device, anywhere',
      icon: Smartphone
    },
    {
      title: 'Spending Analytics',
      description: 'Detailed insights into your purchasing patterns',
      icon: BarChart3
    },
    {
      title: 'Export & Reports',
      description: 'Export data for tax preparation and expense reporting',
      icon: FileText
    },
    {
      title: 'Instant Processing',
      description: 'Receipt processing in under 10 seconds',
      icon: Zap
    },
    {
      title: 'Bank-Level Security',
      description: 'AES-256 encryption and SOC 2 certified data centers',
      icon: Lock
    },
    {
      title: 'Auto-Updates',
      description: 'Progressive Web App with automatic updates',
      icon: RefreshCw
    }
  ];

  const useCases = [
    {
      title: 'Personal Use',
      description: 'Perfect for individuals who want to organize their receipts and track warranties',
      benefits: [
        'Never lose important receipts',
        'Track warranties on electronics and appliances',
        'Organize tax-deductible purchases',
        'Quick receipt retrieval for returns'
      ]
    },
    {
      title: 'Business Expenses',
      description: 'Ideal for professionals and business owners managing expenses',
      benefits: [
        'Automatic expense categorization',
        'Easy expense report generation',
        'Client purchase tracking',
        'Tax preparation assistance'
      ]
    },
    {
      title: 'Family Management',
      description: 'Great for families managing multiple purchases and warranties',
      benefits: [
        'Track purchases for multiple family members',
        'Monitor warranty periods on household items',
        'Budget tracking and spending insights',
        'Shared access across family devices'
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-20">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-primary/10 to-secondary/10 py-12 sm:py-16">
          <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 text-center">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-text-primary mb-4 sm:mb-6">
              Powerful Features for Smart Receipt Management
            </h1>
            <p className="text-base sm:text-lg lg:text-xl text-text-secondary max-w-3xl mx-auto leading-relaxed mb-6 sm:mb-8">
              Discover all the intelligent features that make Smart Receipts the most advanced 
              receipt management solution available.
            </p>
            <a 
              href="https://docs.google.com/forms/d/e/1FAIpQLScD0r0uJ7lsegRhFL5gsdpdCIrsuuwBizPwPvu0sq6J2Pr0tg/viewform?usp=sharing&ouid=115412616738636624494"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center bg-primary text-white px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-semibold hover:bg-primary/90 transition-all duration-200 shadow-card hover:shadow-card-hover text-base sm:text-lg"
            >
              Join Waitlist
              <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
            </a>
          </div>
        </section>

        {/* Main Features */}
        <section className="py-12 sm:py-16 lg:py-20">
          <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8">
            <div className="text-center mb-12 sm:mb-16">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-text-primary mb-4 sm:mb-6">
                Core Features
              </h2>
              <p className="text-base sm:text-lg lg:text-xl text-text-secondary max-w-3xl mx-auto">
                The essential features that make receipt management effortless
              </p>
            </div>
            
            <div className="space-y-20">
              {mainFeatures.map((feature, index) => {
                const Icon = feature.icon;
                const isEven = index % 2 === 1;
                
                return (
                  <div key={index} className={`flex flex-col lg:flex-row items-center gap-12 ${isEven ? 'lg:flex-row-reverse' : ''}`}>
                    {/* Content */}
                    <div className="flex-1 space-y-6">
                      <div className="flex items-center space-x-4">
                        <div className="bg-primary/10 p-3 rounded-xl">
                          <Icon className="h-8 w-8 text-primary" />
                        </div>
                        <h3 className="text-2xl md:text-3xl font-bold text-text-primary">
                          {feature.title}
                        </h3>
                      </div>
                      
                      <p className="text-lg text-text-secondary leading-relaxed">
                        {feature.description}
                      </p>
                      
                      <ul className="space-y-3">
                        {feature.features.map((item, itemIndex) => (
                          <li key={itemIndex} className="flex items-center space-x-3">
                            <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                            <span className="text-text-secondary">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    {/* Icon */}
                    <div className="flex-shrink-0">
                      <div className="bg-gradient-to-br from-primary/20 to-secondary/20 p-12 rounded-3xl">
                        <Icon className="h-24 w-24 text-primary" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Additional Features Grid */}
        <section className="bg-gray-50 py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-6">
                Additional Features
              </h2>
              <p className="text-xl text-text-secondary max-w-3xl mx-auto">
                More powerful features to enhance your experience
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {additionalFeatures.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <div key={index} className="bg-white p-6 rounded-2xl shadow-card hover:shadow-card-hover transition-all duration-200">
                    <div className="bg-primary/10 p-3 rounded-xl w-fit mb-4">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold text-text-primary mb-3">
                      {feature.title}
                    </h3>
                    <p className="text-text-secondary text-sm">
                      {feature.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Use Cases */}
        <section className="py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-6">
                Perfect for Every Use Case
              </h2>
              <p className="text-xl text-text-secondary max-w-3xl mx-auto">
                Whether you're an individual, business owner, or managing a family, 
                Smart Receipts adapts to your needs
              </p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {useCases.map((useCase, index) => (
                <div key={index} className="bg-white p-8 rounded-2xl shadow-card hover:shadow-card-hover transition-all duration-200">
                  <h3 className="text-xl font-bold text-text-primary mb-4">
                    {useCase.title}
                  </h3>
                  <p className="text-text-secondary mb-6">
                    {useCase.description}
                  </p>
                  <ul className="space-y-3">
                    {useCase.benefits.map((benefit, benefitIndex) => (
                      <li key={benefitIndex} className="flex items-center space-x-3">
                        <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                        <span className="text-sm text-text-secondary">{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-gradient-to-br from-primary/10 to-secondary/10 py-20">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-6">
              Experience All Features Today
            </h2>
            <p className="text-xl text-text-secondary mb-8">
              Start your free trial and discover how Smart Receipts can transform 
              your receipt management experience
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a 
                href="https://docs.google.com/forms/d/e/1FAIpQLScD0r0uJ7lsegRhFL5gsdpdCIrsuuwBizPwPvu0sq6J2Pr0tg/viewform?usp=sharing&ouid=115412616738636624494"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-primary text-white px-8 py-4 rounded-xl font-semibold hover:bg-primary/90 transition-all duration-200 shadow-card hover:shadow-card-hover text-center"
              >
                Join Waitlist
              </a>
              <Link 
                to="/how-it-works"
                className="border border-primary text-primary px-8 py-4 rounded-xl font-semibold hover:bg-primary/10 transition-all duration-200"
              >
                See How It Works
              </Link>
            </div>
          </div>
        </section>
      </main>

      <HomepageFooter />
    </div>
  );
};

export default FeaturesPage; 