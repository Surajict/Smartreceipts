import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, MapPin, Phone, Clock, Send, User, MessageSquare } from 'lucide-react';
import Header from './Header';
import HomepageFooter from './HomepageFooter';

const ContactUs: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Send data to n8n webhook
      const contactWebhookUrl = import.meta.env.VITE_N8N_CONTACT_WEBHOOK_URL;
      
      if (!contactWebhookUrl) {
        throw new Error('Contact webhook URL not configured');
      }
      
      const response = await fetch(contactWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chatInput: {
            name: formData.name,
            email: formData.email,
            subject: formData.subject,
            message: formData.message
          }
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Success - show success message
      setIsSubmitted(true);
      setFormData({ name: '', email: '', subject: '', message: '' });
      
    } catch (error) {
      console.error('Error submitting contact form:', error);
      
      // Show error message to user
      alert('We apologize, but there seems to be a technical difficulty with our contact form at the moment. Please send your message directly to smartreceiptsau@gmail.com and we\'ll get back to you as soon as possible. Thank you for your understanding.');
      
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-20">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-primary/10 to-secondary/10 py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h1 className="text-4xl md:text-5xl font-bold text-text-primary mb-6">
                Contact Us
              </h1>
              <p className="text-xl text-text-secondary max-w-3xl mx-auto leading-relaxed">
                Have questions about Smart Receipts? Need help with your account? We're here to help! 
                Reach out to us using any of the methods below.
              </p>
            </div>
          </div>
        </section>

        <div className="py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              
              {/* Contact Information */}
              <div className="space-y-8">
                <div>
                  <h2 className="text-3xl font-bold text-text-primary mb-6">Get in Touch</h2>
                  <p className="text-text-secondary text-lg mb-8">
                    Our customer support team is ready to help you with any questions or issues you may have. 
                    We typically respond within 24 hours during business days.
                  </p>
                </div>

                {/* Contact Methods */}
                <div className="space-y-6">
                  <div className="flex items-start space-x-4 p-6 bg-white rounded-lg shadow-card">
                    <div className="bg-primary/10 rounded-full p-3">
                      <Mail className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-text-primary mb-2">Email Support</h3>
                      <p className="text-text-secondary mb-2">
                        Send us an email and we'll get back to you as soon as possible.
                      </p>
                      <a 
                        href="mailto:smartreceiptsau@gmail.com" 
                        className="text-primary hover:text-primary/80 font-medium"
                      >
                        smartreceiptsau@gmail.com
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4 p-6 bg-white rounded-lg shadow-card">
                    <div className="bg-secondary/10 rounded-full p-3">
                      <MapPin className="h-6 w-6 text-secondary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-text-primary mb-2">Office Address</h3>
                      <p className="text-text-secondary">
                        47 Waitara Avenue<br />
                        Waitara NSW 2177<br />
                        Australia
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4 p-6 bg-white rounded-lg shadow-card">
                    <div className="bg-accent/10 rounded-full p-3">
                      <Clock className="h-6 w-6 text-accent" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-text-primary mb-2">Support Hours</h3>
                      <div className="text-text-secondary space-y-1">
                        <p>Monday - Friday: 9:00 AM - 6:00 PM AEST</p>
                        <p>Saturday: 10:00 AM - 4:00 PM AEST</p>
                        <p>Sunday: Closed</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Links */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-text-primary mb-4">Quick Support</h3>
                  <div className="space-y-2">
                    <Link to="/help-center" className="block text-primary hover:text-primary/80">
                      → Visit our Help Center
                    </Link>
                    <a href="#faq" className="block text-primary hover:text-primary/80">
                      → Check our FAQ
                    </a>
                    <Link to="/privacy-policy" className="block text-primary hover:text-primary/80">
                      → Privacy Policy
                    </Link>
                    <Link to="/terms-of-service" className="block text-primary hover:text-primary/80">
                      → Terms of Service
                    </Link>
                  </div>
                </div>
              </div>

              {/* Contact Form */}
              <div className="bg-white rounded-lg shadow-card p-8">
                <h3 className="text-2xl font-bold text-text-primary mb-6">Send us a Message</h3>
                
                {isSubmitted ? (
                  <div className="text-center py-8">
                    <div className="bg-green-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                      <Send className="h-8 w-8 text-green-600" />
                    </div>
                    <h4 className="text-lg font-semibold text-text-primary mb-2">Message Sent!</h4>
                    <p className="text-text-secondary">
                      Thank you for contacting us. We'll get back to you within 24 hours.
                    </p>
                    <button
                      onClick={() => setIsSubmitted(false)}
                      className="mt-4 text-primary hover:text-primary/80 font-medium"
                    >
                      Send another message
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label htmlFor="name" className="block text-sm font-medium text-text-primary mb-2">
                          Full Name *
                        </label>
                        <input
                          type="text"
                          id="name"
                          name="name"
                          required
                          value={formData.name}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                          placeholder="Your full name"
                        />
                      </div>
                      <div>
                        <label htmlFor="email" className="block text-sm font-medium text-text-primary mb-2">
                          Email Address *
                        </label>
                        <input
                          type="email"
                          id="email"
                          name="email"
                          required
                          value={formData.email}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                          placeholder="your.email@example.com"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="subject" className="block text-sm font-medium text-text-primary mb-2">
                        Subject *
                      </label>
                      <select
                        id="subject"
                        name="subject"
                        required
                        value={formData.subject}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      >
                        <option value="">Select a subject</option>
                        <option value="general">General Inquiry</option>
                        <option value="support">Technical Support</option>
                        <option value="billing">Billing & Subscription</option>
                        <option value="feature">Feature Request</option>
                        <option value="bug">Bug Report</option>
                        <option value="partnership">Partnership Inquiry</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="message" className="block text-sm font-medium text-text-primary mb-2">
                        Message *
                      </label>
                      <textarea
                        id="message"
                        name="message"
                        required
                        rows={6}
                        value={formData.message}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-vertical"
                        placeholder="Please describe your question or issue in detail..."
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-primary text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center space-x-2"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>Sending...</span>
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4" />
                          <span>Send Message</span>
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <section className="py-16 bg-gray-50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-text-primary mb-4">Frequently Asked Questions</h2>
              <p className="text-text-secondary">
                Quick answers to common questions. For more detailed help, visit our{' '}
                <Link to="/help-center" className="text-primary hover:text-primary/80 font-medium">
                  Help Center
                </Link>
              </p>
            </div>

            <div className="space-y-6">
              <div className="bg-white rounded-lg p-6 shadow-card">
                <h3 className="text-lg font-semibold text-text-primary mb-2">
                  How do I reset my password?
                </h3>
                <p className="text-text-secondary">
                  Go to the login page and click "Forgot Password". Enter your email address and we'll send you a reset link.
                </p>
              </div>

              <div className="bg-white rounded-lg p-6 shadow-card">
                <h3 className="text-lg font-semibold text-text-primary mb-2">
                  Can I cancel my subscription anytime?
                </h3>
                <p className="text-text-secondary">
                  Yes, you can cancel your subscription at any time from your account settings. You'll continue to have access until the end of your current billing period.
                </p>
              </div>

              <div className="bg-white rounded-lg p-6 shadow-card">
                <h3 className="text-lg font-semibold text-text-primary mb-2">
                  Is my receipt data secure?
                </h3>
                <p className="text-text-secondary">
                  Absolutely. We use bank-level encryption (AES-256) to protect your data and never share your information with third parties without your consent.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <HomepageFooter />
    </div>
  );
};

export default ContactUs; 