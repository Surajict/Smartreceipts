import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { FAQ } from '../types';

const FAQSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs: FAQ[] = [
    {
      question: 'How accurate is the AI receipt scanning?',
      answer: 'Our AI technology achieves 99.5% accuracy in extracting information from receipts. It can read text from various receipt types, lighting conditions, and even slightly damaged receipts. The system continuously learns and improves with each scan.'
    },
    {
      question: 'What happens if I can\'t scan a receipt?',
      answer: 'If automatic scanning fails, you can manually enter receipt information through our user-friendly interface. Our customer support team is also available 24/7 to help with any scanning issues or manual data entry.'
    },
    {
      question: 'How does warranty tracking work?',
      answer: 'Smart Receipt automatically identifies warranty-eligible items from your receipts and registers them with manufacturers when possible. We send you alerts 30, 60, and 90 days before warranty expiration, along with instructions on how to file claims.'
    },
    {
      question: 'Is my data secure and private?',
      answer: 'Absolutely. We use bank-level encryption (AES-256) to protect your data both in transit and at rest. Your receipts are stored in SOC 2 certified data centers, and we never share your personal information with third parties without your consent.'
    },
    {
      question: 'Can I access my receipts from multiple devices?',
      answer: 'Yes! Smart Receipt syncs across all your devices - smartphones, tablets, and computers. Your receipts are securely stored in the cloud and accessible anywhere with an internet connection.'
    },
    {
      question: 'What file formats are supported for receipt uploads?',
      answer: 'You can upload receipts in various formats including JPEG, PNG, PDF, and HEIC. Our mobile app can scan receipts directly using your phone\'s camera, while the web version supports drag-and-drop uploads.'
    },
    {
      question: 'How does the AI chatbot help with warranty claims?',
      answer: 'Our AI chatbot guides you through the warranty claim process step-by-step, helps you gather required documentation, provides manufacturer contact information, and can even help draft claim emails. For complex cases, it escalates to our human support team.'
    },
    {
      question: 'Is there a limit to how many receipts I can store?',
      answer: 'Our free plan includes 100 receipts per month. Premium plans offer unlimited receipt storage, advanced analytics, priority support, and additional features like bulk upload and export capabilities.'
    }
  ];

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="py-20 bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-text-primary mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-xl text-text-secondary">
            Everything you need to know about Smart Receipt and how it works.
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden"
            >
              <button
                onClick={() => toggleFAQ(index)}
                className="w-full px-6 py-6 text-left flex justify-between items-center hover:bg-gray-50 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset"
              >
                <h3 className="text-lg font-bold text-text-primary pr-4">
                  {faq.question}
                </h3>
                <div className="flex-shrink-0">
                  {openIndex === index ? (
                    <ChevronUp className="h-5 w-5 text-primary" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-text-secondary" />
                  )}
                </div>
              </button>
              
              <div
                className={`overflow-hidden transition-all duration-300 ease-in-out ${
                  openIndex === index ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                }`}
              >
                <div className="px-6 pb-6">
                  <div className="h-px bg-gray-200 mb-4"></div>
                  <p className="text-text-secondary leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Contact Support */}
        <div className="text-center mt-12">
          <div className="bg-gradient-feature rounded-2xl p-8 border border-gray-100">
            <h3 className="text-xl font-bold text-text-primary mb-4">
              Still have questions?
            </h3>
            <p className="text-text-secondary mb-6">
              Our support team is available 24/7 to help you get the most out of Smart Receipt.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="bg-primary text-white px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors duration-200">
                Contact Support
              </button>
              <button className="border-2 border-primary text-primary px-6 py-3 rounded-lg font-medium hover:bg-primary hover:text-white transition-colors duration-200">
                Schedule Demo
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FAQSection;