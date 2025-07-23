import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { faqKnowledgeBase } from '../data/faqKnowledgeBase';

const FAQSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  // Use the centralized FAQ knowledge base
  const faqs = faqKnowledgeBase.slice(0, 8); // Show first 8 FAQs on the landing page

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="py-20 bg-gradient-to-b from-white to-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-text-primary mb-4 tracking-tight">
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
              className="bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden backdrop-blur-sm"
            >
              <button
                onClick={() => toggleFAQ(index)}
                className="w-full px-6 py-6 text-left flex justify-between items-center hover:bg-gray-50 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset group"
              >
                <h3 className="text-lg font-bold text-text-primary pr-4 group-hover:text-primary transition-colors duration-200">
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
                <div className="px-6 pb-6 animate-fade-in">
                  <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent mb-4"></div>
                  <p className="text-text-secondary leading-relaxed animate-slide-up">
                    {faq.answer}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Contact Support */}
        <div className="text-center mt-12">
          <div className="bg-gradient-feature rounded-2xl p-8 border border-gray-100 shadow-lg">
            <h3 className="text-xl font-bold text-text-primary mb-4 tracking-tight">
              Still have questions?
            </h3>
            <p className="text-text-secondary mb-6">
              Our FAQ chatbot can answer most questions instantly, or contact our support team for personalized help.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="bg-gradient-primary text-white px-6 py-3 rounded-lg font-medium hover:opacity-90 transition-all duration-200 shadow-button hover:shadow-button-hover transform hover:-translate-y-0.5">
                Try FAQ Chatbot
              </button>
              <button className="border-2 border-primary text-primary px-6 py-3 rounded-lg font-medium hover:bg-primary hover:text-white transition-all duration-200 shadow-sm hover:shadow-md">
                Email Support
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FAQSection;