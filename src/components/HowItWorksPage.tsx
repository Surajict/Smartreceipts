import React from 'react';
import { Link } from 'react-router-dom';
import { Camera, Brain, Shield, Search, CheckCircle, ArrowRight } from 'lucide-react';
import Header from './Header';
import HomepageFooter from './HomepageFooter';

const HowItWorksPage: React.FC = () => {
  const steps = [
    {
      number: 1,
      title: 'Scan Your Receipt',
      description: 'Simply take a photo of any receipt using your phone, tablet, or computer camera. You can also upload existing receipt images or PDFs.',
      icon: Camera,
      details: [
        'Works with any device camera',
        'Supports multiple formats (JPG, PNG, PDF, HEIC)',
        'Handles long receipts and multi-product purchases',
        'Works in various lighting conditions'
      ]
    },
    {
      number: 2,
      title: 'AI Extracts Data',
      description: 'Our advanced AI instantly reads and extracts all important information from your receipt with over 95% accuracy.',
      icon: Brain,
      details: [
        'Product names and descriptions',
        'Prices and totals',
        'Store information and location',
        'Purchase dates and warranty periods',
        'Brand and model numbers'
      ]
    },
    {
      number: 3,
      title: 'Smart Organization',
      description: 'Your receipts are automatically organized, searchable, and stored securely in the cloud with warranty tracking.',
      icon: Shield,
      details: [
        'Automatic categorization by store and product type',
        'Individual warranty tracking for each product',
        'Secure cloud storage with bank-level encryption',
        'Accessible from all your devices'
      ]
    },
    {
      number: 4,
      title: 'Smart Search & Insights',
      description: 'Ask questions in natural language and get intelligent answers about your purchases, spending, and warranties.',
      icon: Search,
      details: [
        'Natural language search queries',
        'Spending analysis and insights',
        'Warranty expiration alerts',
        'Easy receipt retrieval for returns'
      ]
    }
  ];

  const benefits = [
    {
      title: 'Save Time',
      description: 'No more manual data entry or organizing paper receipts',
      icon: CheckCircle
    },
    {
      title: 'Never Lose Receipts',
      description: 'All receipts safely stored in the cloud forever',
      icon: CheckCircle
    },
    {
      title: 'Track Warranties',
      description: 'Automatic warranty tracking with expiration alerts',
      icon: CheckCircle
    },
    {
      title: 'Smart Insights',
      description: 'Understand your spending patterns with AI analytics',
      icon: CheckCircle
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-20">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-primary/10 to-secondary/10 py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-text-primary mb-6">
              How Smart Receipts Works
            </h1>
            <p className="text-xl text-text-secondary max-w-3xl mx-auto leading-relaxed mb-8">
              Transform your receipt chaos into organized digital records in just 4 simple steps. 
              Our AI-powered system makes receipt management effortless and intelligent.
            </p>
            <a 
              href="https://docs.google.com/forms/d/e/1FAIpQLScD0r0uJ7lsegRhFL5gsdpdCIrsuuwBizPwPvu0sq6J2Pr0tg/viewform?usp=sharing&ouid=115412616738636624494"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center bg-primary text-white px-8 py-4 rounded-xl font-semibold hover:bg-primary/90 transition-all duration-200 shadow-card hover:shadow-card-hover text-lg"
            >
              Join Waitlist
              <ArrowRight className="ml-2 h-5 w-5" />
            </a>
          </div>
        </section>

        {/* How It Works Steps */}
        <section className="py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="space-y-20">
              {steps.map((step, index) => {
                const Icon = step.icon;
                const isEven = index % 2 === 1;
                
                return (
                  <div key={step.number} className={`flex flex-col lg:flex-row items-center gap-12 ${isEven ? 'lg:flex-row-reverse' : ''}`}>
                    {/* Content */}
                    <div className="flex-1 space-y-6">
                      <div className="flex items-center space-x-4">
                        <div className="bg-primary text-white rounded-full w-12 h-12 flex items-center justify-center font-bold text-xl">
                          {step.number}
                        </div>
                        <h2 className="text-3xl font-bold text-text-primary">
                          {step.title}
                        </h2>
                      </div>
                      
                      <p className="text-lg text-text-secondary leading-relaxed">
                        {step.description}
                      </p>
                      
                      <ul className="space-y-3">
                        {step.details.map((detail, detailIndex) => (
                          <li key={detailIndex} className="flex items-center space-x-3">
                            <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                            <span className="text-text-secondary">{detail}</span>
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

        {/* Benefits Section */}
        <section className="bg-gray-50 py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-6">
                Why Choose Smart Receipts?
              </h2>
              <p className="text-xl text-text-secondary max-w-3xl mx-auto">
                Experience the benefits of intelligent receipt management
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {benefits.map((benefit, index) => {
                const Icon = benefit.icon;
                return (
                  <div key={index} className="bg-white p-8 rounded-2xl shadow-card hover:shadow-card-hover transition-all duration-200">
                    <div className="bg-green-100 p-3 rounded-full w-fit mb-6">
                      <Icon className="h-8 w-8 text-green-600" />
                    </div>
                    <h3 className="text-xl font-semibold text-text-primary mb-4">
                      {benefit.title}
                    </h3>
                    <p className="text-text-secondary">
                      {benefit.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-6">
              Ready to Get Started?
            </h2>
            <p className="text-xl text-text-secondary mb-8">
              Join thousands of users who have transformed their receipt management with Smart Receipts
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
                to="/help-center"
                className="border border-primary text-primary px-8 py-4 rounded-xl font-semibold hover:bg-primary/10 transition-all duration-200"
              >
                Learn More
              </Link>
            </div>
          </div>
        </section>
      </main>

      <HomepageFooter />
    </div>
  );
};

export default HowItWorksPage; 