import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, X, Star, Zap, Shield, Brain, Users, Camera, Search, AlertCircle } from 'lucide-react';
import Header from './Header';
import HomepageFooter from './HomepageFooter';

const Pricing: React.FC = () => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  const plans = [
    {
      name: 'Free Trial',
      price: { monthly: 0, yearly: 0 },
      description: 'Try Smart Receipts with up to 5 receipts to get started',
      popular: false,
      features: [
        'Up to 5 receipts (trial)',
        'AI-powered receipt scanning',
        'Basic warranty tracking',
        'Web & mobile access',
        'Standard OCR technology',
        'Basic search functionality',
        'Email support',
        '1GB storage'
      ],
      limitations: [
        'Limited to 5 receipts total',
        'No advanced analytics',
        'No bulk upload',
        'No export features',
        'Basic warranty alerts only'
      ],
      cta: 'Join Waitlist',
      ctaLink: 'https://docs.google.com/forms/d/e/1FAIpQLScD0r0uJ7lsegRhFL5gsdpdCIrsuuwBizPwPvu0sq6J2Pr0tg/viewform?usp=sharing&ouid=115412616738636624494'
    },
    {
      name: 'Premium',
      price: { monthly: 7.00, yearly: 70.00 },
      description: 'Unlimited receipt scanning and advanced features for serious users',
      popular: true,
      features: [
        'Unlimited receipt scanning',
        'Advanced AI with 99.5% accuracy',
        'Multi-product receipt detection',
        'Smart warranty tracking',
        'Perplexity AI validation',
        'RAG-powered smart search',
        'Advanced analytics & insights',
        'Bulk upload & export',
        'Priority support',
        'Unlimited storage',
        'PDF document support',
        'Custom warranty periods',
        'Advanced notifications',
        'Mobile app access'
      ],
      limitations: [],
      cta: 'Join Waitlist',
      ctaLink: 'https://docs.google.com/forms/d/e/1FAIpQLScD0r0uJ7lsegRhFL5gsdpdCIrsuuwBizPwPvu0sq6J2Pr0tg/viewform?usp=sharing&ouid=115412616738636624494'
    }
  ];

  const faqs = [
    {
      question: 'Can I change my plan anytime?',
      answer: 'Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately, and we\'ll prorate any billing adjustments.'
    },
    {
      question: 'What happens when I exceed my 5 receipt trial limit?',
      answer: 'After scanning 5 receipts, you\'ll need to upgrade to the Premium plan (AU$7/month) to continue scanning unlimited receipts.'
    },
    {
      question: 'Do you offer refunds?',
      answer: 'Yes, we offer a 30-day money-back guarantee on all paid plans. If you\'re not satisfied, we\'ll refund your payment in full.'
    },
    {
      question: 'Is my data secure?',
      answer: 'Absolutely. All plans include bank-level encryption (AES-256), secure data centers, and we never share your data with third parties.'
    },
    {
      question: 'Can I cancel anytime?',
      answer: 'Yes, you can cancel your subscription at any time with no cancellation fees. You\'ll retain access until the end of your billing period.'
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
              Choose Your Plan
            </h1>
            <p className="text-base sm:text-lg lg:text-xl text-text-secondary max-w-3xl mx-auto leading-relaxed mb-6 sm:mb-8">
              Transform your receipt management with AI-powered scanning, smart warranty tracking, 
              and intelligent search. Try free with 5 receipts, then AU$7/month for unlimited scanning.
            </p>

            {/* Billing Toggle */}
            <div className="flex items-center justify-center space-x-4 mb-12">
              <span className={`text-sm font-medium ${billingCycle === 'monthly' ? 'text-text-primary' : 'text-text-secondary'}`}>
                Monthly
              </span>
              <button
                onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
                className="relative inline-flex h-6 w-11 items-center rounded-full bg-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    billingCycle === 'yearly' ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              <span className={`text-sm font-medium ${billingCycle === 'yearly' ? 'text-text-primary' : 'text-text-secondary'}`}>
                Yearly
              </span>
              {billingCycle === 'yearly' && (
                <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                  Save 17%
                </span>
              )}
            </div>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="py-12 sm:py-16">
          <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 max-w-4xl mx-auto">
              {plans.map((plan, index) => (
                <div
                  key={plan.name}
                  className={`relative bg-white rounded-xl shadow-card p-6 sm:p-8 ${
                    plan.popular
                      ? 'border-2 border-primary transform sm:scale-105'
                      : 'border border-gray-200'
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                      <span className="bg-primary text-white px-4 py-1 rounded-full text-sm font-medium flex items-center space-x-1">
                        <Star className="h-4 w-4" />
                        <span>Most Popular</span>
                      </span>
                    </div>
                  )}

                  <div className="text-center mb-8">
                    <h3 className="text-2xl font-bold text-text-primary mb-2">{plan.name}</h3>
                    <p className="text-text-secondary mb-4">{plan.description}</p>
                    
                    <div className="mb-4">
                      <span className="text-4xl font-bold text-text-primary">
                        AU${billingCycle === 'monthly' ? plan.price.monthly.toFixed(2) : plan.price.yearly.toFixed(2)}
                      </span>
                      <span className="text-text-secondary">
                        {plan.price.monthly === 0 ? '' : billingCycle === 'monthly' ? '/month' : '/year'}
                      </span>
                    </div>

                    {billingCycle === 'yearly' && plan.price.yearly > 0 && (
                      <p className="text-sm text-text-secondary">
                        AU${(plan.price.yearly / 12).toFixed(2)} per month billed annually
                      </p>
                    )}
                  </div>

                  <div className="space-y-4 mb-8">
                    {plan.features.map((feature, featureIndex) => (
                      <div key={featureIndex} className="flex items-start space-x-3">
                        <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-text-secondary text-sm">{feature}</span>
                      </div>
                    ))}
                    
                    {plan.limitations.map((limitation, limitationIndex) => (
                      <div key={limitationIndex} className="flex items-start space-x-3">
                        <X className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                        <span className="text-text-secondary text-sm line-through opacity-60">{limitation}</span>
                      </div>
                    ))}
                  </div>

                  {plan.ctaLink.startsWith('http') ? (
                    <a
                      href={plan.ctaLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`block w-full text-center py-3 px-6 rounded-lg font-semibold transition-colors duration-200 ${
                        plan.popular
                          ? 'bg-primary text-white hover:bg-primary/90'
                          : plan.name === 'Free'
                          ? 'bg-gray-100 text-text-primary hover:bg-gray-200'
                          : 'bg-secondary text-white hover:bg-secondary/90'
                      }`}
                    >
                      {plan.cta}
                    </a>
                  ) : (
                    <Link
                      to={plan.ctaLink}
                      className={`block w-full text-center py-3 px-6 rounded-lg font-semibold transition-colors duration-200 ${
                        plan.popular
                          ? 'bg-primary text-white hover:bg-primary/90'
                          : plan.name === 'Free'
                          ? 'bg-gray-100 text-text-primary hover:bg-gray-200'
                          : 'bg-secondary text-white hover:bg-secondary/90'
                      }`}
                    >
                      {plan.cta}
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Comparison */}
        <section className="py-16 bg-gray-50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-text-primary mb-4">Feature Comparison</h2>
              <p className="text-text-secondary">
                See what's included in each plan to find the perfect fit for your needs
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-card overflow-hidden">
              <div className="overflow-x-auto">
                                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-medium text-text-primary">Features</th>
                        <th className="px-6 py-4 text-center text-sm font-medium text-text-primary">Free Trial</th>
                        <th className="px-6 py-4 text-center text-sm font-medium text-text-primary">Premium</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      <tr>
                        <td className="px-6 py-4 text-sm text-text-primary">Receipt Limit</td>
                        <td className="px-6 py-4 text-center text-sm text-text-secondary">5 receipts total</td>
                        <td className="px-6 py-4 text-center text-sm text-text-secondary">Unlimited</td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 text-sm text-text-primary">AI Accuracy</td>
                        <td className="px-6 py-4 text-center text-sm text-text-secondary">95%</td>
                        <td className="px-6 py-4 text-center text-sm text-text-secondary">99.5%</td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 text-sm text-text-primary">Smart Search</td>
                        <td className="px-6 py-4 text-center"><X className="h-5 w-5 text-red-400 mx-auto" /></td>
                        <td className="px-6 py-4 text-center"><Check className="h-5 w-5 text-green-500 mx-auto" /></td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 text-sm text-text-primary">Multi-Product Detection</td>
                        <td className="px-6 py-4 text-center"><X className="h-5 w-5 text-red-400 mx-auto" /></td>
                        <td className="px-6 py-4 text-center"><Check className="h-5 w-5 text-green-500 mx-auto" /></td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 text-sm text-text-primary">Bulk Upload & Export</td>
                        <td className="px-6 py-4 text-center"><X className="h-5 w-5 text-red-400 mx-auto" /></td>
                        <td className="px-6 py-4 text-center"><Check className="h-5 w-5 text-green-500 mx-auto" /></td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 text-sm text-text-primary">Priority Support</td>
                        <td className="px-6 py-4 text-center"><X className="h-5 w-5 text-red-400 mx-auto" /></td>
                        <td className="px-6 py-4 text-center"><Check className="h-5 w-5 text-green-500 mx-auto" /></td>
                      </tr>
                    </tbody>
                  </table>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-text-primary mb-4">Frequently Asked Questions</h2>
              <p className="text-text-secondary">
                Got questions about our pricing? We're here to help.
              </p>
            </div>

            <div className="space-y-6">
              {faqs.map((faq, index) => (
                <div key={index} className="bg-white rounded-lg p-6 shadow-card">
                  <h3 className="text-lg font-semibold text-text-primary mb-2">
                    {faq.question}
                  </h3>
                  <p className="text-text-secondary">
                    {faq.answer}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 bg-gradient-to-r from-primary to-secondary text-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold mb-6">Ready to Get Started?</h2>
            <p className="text-xl mb-8 opacity-90">
              Join thousands of satisfied customers who have transformed their receipt management. 
              Try free with 5 receipts, then just AU$7/month for unlimited access.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a 
                href="https://docs.google.com/forms/d/e/1FAIpQLScD0r0uJ7lsegRhFL5gsdpdCIrsuuwBizPwPvu0sq6J2Pr0tg/viewform?usp=sharing&ouid=115412616738636624494"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white text-primary px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors duration-200 text-center"
              >
                Join Waitlist
              </a>
              <Link 
                to="/contact" 
                className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-primary transition-colors duration-200"
              >
                Contact Sales
              </Link>
            </div>
          </div>
        </section>
      </main>

      <HomepageFooter />
    </div>
  );
};

export default Pricing; 