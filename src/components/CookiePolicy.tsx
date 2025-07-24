import React from 'react';
import { Link } from 'react-router-dom';
import { Cookie, Settings, Eye, Shield } from 'lucide-react';
import Header from './Header';
import HomepageFooter from './HomepageFooter';

const CookiePolicy: React.FC = () => {
  const lastUpdated = "January 24, 2025";

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-20">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-primary/10 to-secondary/10 py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <div className="flex items-center justify-center mb-6">
                <Cookie className="h-12 w-12 text-primary mr-4" />
                <h1 className="text-4xl md:text-5xl font-bold text-text-primary">
                  Cookie Policy
                </h1>
              </div>
              <p className="text-xl text-text-secondary max-w-3xl mx-auto leading-relaxed">
                This Cookie Policy explains how Smart Receipts A/NZ uses cookies and similar 
                technologies to provide, improve, and protect our services.
              </p>
              <p className="text-text-secondary mt-4">
                Last updated: {lastUpdated}
              </p>
            </div>
          </div>
        </section>

        {/* Main Content */}
        <div className="py-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 prose prose-lg max-w-none">
            
            {/* What Are Cookies */}
            <section className="mb-12">
              <div className="flex items-center mb-6">
                <Cookie className="h-8 w-8 text-primary mr-3" />
                <h2 className="text-3xl font-bold text-text-primary m-0">What Are Cookies</h2>
              </div>
              
              <p className="text-text-secondary mb-4">
                Cookies are small text files that are stored on your device when you visit a website. 
                They are widely used to make websites work more efficiently and to provide information 
                to website owners about user behavior and preferences.
              </p>

              <p className="text-text-secondary mb-4">
                We use cookies and similar technologies such as web beacons, pixels, and local storage 
                to enhance your experience with Smart Receipts A/NZ, provide our services, and understand 
                how our services are being used.
              </p>
            </section>

            {/* Types of Cookies */}
            <section className="mb-12">
              <div className="flex items-center mb-6">
                <Settings className="h-8 w-8 text-primary mr-3" />
                <h2 className="text-3xl font-bold text-text-primary m-0">Types of Cookies We Use</h2>
              </div>
              
              <h3 className="text-xl font-semibold text-text-primary mb-4">Essential Cookies</h3>
              <p className="text-text-secondary mb-4">
                These cookies are necessary for the proper functioning of our Service. They enable 
                core functionality such as user authentication, security, network management, and 
                accessibility. Without these cookies, the Service cannot function properly.
              </p>
              <ul className="text-text-secondary mb-6 space-y-2">
                <li>• Session management and user authentication</li>
                <li>• Security and fraud prevention</li>
                <li>• Load balancing and performance optimization</li>
                <li>• Remembering your preferences and settings</li>
              </ul>

              <h3 className="text-xl font-semibold text-text-primary mb-4">Performance Cookies</h3>
              <p className="text-text-secondary mb-4">
                These cookies collect information about how you use our Service, including which 
                pages you visit most often and any error messages you receive. This information 
                helps us improve the performance and functionality of our Service.
              </p>
              <ul className="text-text-secondary mb-6 space-y-2">
                <li>• Analytics and usage statistics</li>
                <li>• Error tracking and debugging</li>
                <li>• Performance monitoring</li>
                <li>• Feature usage analysis</li>
              </ul>

              <h3 className="text-xl font-semibold text-text-primary mb-4">Functional Cookies</h3>
              <p className="text-text-secondary mb-4">
                These cookies enable the Service to provide enhanced functionality and personalization. 
                They may be set by us or by third-party providers whose services we use on our pages.
              </p>
              <ul className="text-text-secondary mb-6 space-y-2">
                <li>• User interface preferences</li>
                <li>• Language and region settings</li>
                <li>• Customized content and features</li>
                <li>• Social media integration</li>
              </ul>
            </section>

            {/* Third-Party Cookies */}
            <section className="mb-12">
              <div className="flex items-center mb-6">
                <Eye className="h-8 w-8 text-primary mr-3" />
                <h2 className="text-3xl font-bold text-text-primary m-0">Third-Party Services</h2>
              </div>
              
              <p className="text-text-secondary mb-4">
                We work with trusted third-party service providers who may place cookies on your 
                device to help us deliver and improve our Service. These include:
              </p>

              <h3 className="text-xl font-semibold text-text-primary mb-4">Analytics Services</h3>
              <p className="text-text-secondary mb-4">
                We use analytics services to understand how our Service is used and to improve 
                user experience. These services may collect information about your visits and 
                usage patterns.
              </p>

              <h3 className="text-xl font-semibold text-text-primary mb-4">Payment Processing</h3>
              <p className="text-text-secondary mb-4">
                Our payment processors may use cookies to facilitate secure transactions and 
                prevent fraud. These cookies are essential for processing payments.
              </p>

              <h3 className="text-xl font-semibold text-text-primary mb-4">Infrastructure Providers</h3>
              <p className="text-text-secondary mb-4">
                Our hosting and infrastructure providers may use cookies for security, performance 
                monitoring, and service delivery purposes.
              </p>
            </section>

            {/* Cookie Control */}
            <section className="mb-12">
              <div className="flex items-center mb-6">
                <Shield className="h-8 w-8 text-primary mr-3" />
                <h2 className="text-3xl font-bold text-text-primary m-0">Your Cookie Choices</h2>
              </div>
              
              <h3 className="text-xl font-semibold text-text-primary mb-4">Browser Settings</h3>
              <p className="text-text-secondary mb-4">
                Most web browsers allow you to control cookies through their settings. You can:
              </p>
              <ul className="text-text-secondary mb-6 space-y-2">
                <li>• Block all cookies</li>
                <li>• Block third-party cookies</li>
                <li>• Delete existing cookies</li>
                <li>• Set your browser to notify you when cookies are set</li>
              </ul>

              <h3 className="text-xl font-semibold text-text-primary mb-4">Impact of Disabling Cookies</h3>
              <p className="text-text-secondary mb-4">
                Please note that disabling cookies may affect the functionality of our Service. 
                Specifically:
              </p>
              <ul className="text-text-secondary mb-6 space-y-2">
                <li>• You may not be able to log in or access your account</li>
                <li>• Your preferences and settings may not be saved</li>
                <li>• Some features may not work properly</li>
                <li>• You may need to re-enter information repeatedly</li>
              </ul>

              <h3 className="text-xl font-semibold text-text-primary mb-4">Browser-Specific Instructions</h3>
              <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                <div>
                  <p className="font-semibold text-text-primary">Chrome:</p>
                  <p className="text-text-secondary text-sm">Settings → Privacy and security → Cookies and other site data</p>
                </div>
                <div>
                  <p className="font-semibold text-text-primary">Firefox:</p>
                  <p className="text-text-secondary text-sm">Preferences → Privacy & Security → Cookies and Site Data</p>
                </div>
                <div>
                  <p className="font-semibold text-text-primary">Safari:</p>
                  <p className="text-text-secondary text-sm">Preferences → Privacy → Manage Website Data</p>
                </div>
                <div>
                  <p className="font-semibold text-text-primary">Edge:</p>
                  <p className="text-text-secondary text-sm">Settings → Cookies and site permissions → Cookies and stored data</p>
                </div>
              </div>
            </section>

            {/* Data Retention */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-text-primary mb-6">Cookie Retention</h2>
              
              <p className="text-text-secondary mb-4">
                Different types of cookies are retained for different periods:
              </p>
              <ul className="text-text-secondary mb-6 space-y-2">
                <li>• <strong>Session Cookies:</strong> Deleted when you close your browser</li>
                <li>• <strong>Persistent Cookies:</strong> Remain until their expiration date or manual deletion</li>
                <li>• <strong>Authentication Cookies:</strong> Typically 30 days or until logout</li>
                <li>• <strong>Preference Cookies:</strong> Up to 1 year</li>
                <li>• <strong>Analytics Cookies:</strong> Up to 2 years</li>
              </ul>
            </section>

            {/* Updates */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-text-primary mb-6">Updates to This Policy</h2>
              
              <p className="text-text-secondary mb-4">
                We may update this Cookie Policy from time to time to reflect changes in our 
                practices or for other operational, legal, or regulatory reasons. We will notify 
                you of any material changes by posting the updated policy on our website.
              </p>

              <p className="text-text-secondary mb-4">
                Your continued use of our Service after any changes to this Cookie Policy will 
                constitute your acceptance of such changes.
              </p>
            </section>

            {/* Contact */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-text-primary mb-6">Contact Information</h2>
              
              <p className="text-text-secondary mb-4">
                If you have questions about our use of cookies or this Cookie Policy, please contact us:
              </p>
              <div className="bg-gray-50 rounded-lg p-6 space-y-2">
                <p className="text-text-secondary">
                  <strong>Smart Receipts A/NZ</strong><br />
                  Privacy Officer<br />
                  47 Waitara Avenue<br />
                  Waitara NSW 2177<br />
                  Australia
                </p>
                <p className="text-text-secondary">
                  Email: <a href="mailto:privacy@smartreceiptsau.com" className="text-primary hover:text-primary/80">privacy@smartreceiptsau.com</a><br />
                  General Contact: <a href="mailto:smartreceiptsau@gmail.com" className="text-primary hover:text-primary/80">smartreceiptsau@gmail.com</a>
                </p>
              </div>
            </section>
          </div>
        </div>

        {/* CTA Section */}
        <section className="py-16 bg-gray-50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold text-text-primary mb-6">Questions About Cookies?</h2>
            <p className="text-xl text-text-secondary mb-8">
              We're committed to transparency about how we use cookies to improve your experience. 
              If you have any questions, please don't hesitate to contact us.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                to="/privacy-policy" 
                className="bg-primary text-white px-8 py-3 rounded-lg font-semibold hover:bg-primary/90 transition-colors duration-200"
              >
                View Privacy Policy
              </Link>
              <Link 
                to="/contact" 
                className="border-2 border-primary text-primary px-8 py-3 rounded-lg font-semibold hover:bg-primary hover:text-white transition-colors duration-200"
              >
                Contact Us
              </Link>
            </div>
          </div>
        </section>
      </main>

      <HomepageFooter />
    </div>
  );
};

export default CookiePolicy; 