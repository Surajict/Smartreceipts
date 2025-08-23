import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Eye, Lock, UserCheck, Database, FileText } from 'lucide-react';
import Header from './Header';
import HomepageFooter from './HomepageFooter';

const PrivacyPolicy: React.FC = () => {
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
                <Shield className="h-12 w-12 text-primary mr-4" />
                <h1 className="text-4xl md:text-5xl font-bold text-text-primary">
                  Privacy Policy
                </h1>
              </div>
              <p className="text-xl text-text-secondary max-w-3xl mx-auto leading-relaxed">
                Your privacy is fundamental to us. This policy explains how Smart Receipts A/NZ 
                collects, uses, and protects your personal information.
              </p>
              <p className="text-text-secondary mt-4">
                Last updated: {lastUpdated}
              </p>
            </div>
          </div>
        </section>

        {/* Table of Contents */}
        <section className="py-8 border-b border-gray-200">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-xl font-semibold text-text-primary mb-4">Table of Contents</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              <a href="#information-collection" className="text-primary hover:text-primary/80">1. Information We Collect</a>
              <a href="#how-we-use" className="text-primary hover:text-primary/80">2. How We Use Your Information</a>
              <a href="#data-storage" className="text-primary hover:text-primary/80">3. Data Storage and Security</a>
              <a href="#sharing" className="text-primary hover:text-primary/80">4. Information Sharing</a>
              <a href="#your-rights" className="text-primary hover:text-primary/80">5. Your Rights and Choices</a>
              <a href="#cookies" className="text-primary hover:text-primary/80">6. Cookies and Tracking</a>
              <a href="#retention" className="text-primary hover:text-primary/80">7. Data Retention</a>
              <a href="#international" className="text-primary hover:text-primary/80">8. International Transfers</a>
              <a href="#children" className="text-primary hover:text-primary/80">9. Children's Privacy</a>
              <a href="#changes" className="text-primary hover:text-primary/80">10. Policy Changes</a>
              <a href="#contact" className="text-primary hover:text-primary/80">11. Contact Information</a>
            </div>
          </div>
        </section>

        {/* Main Content */}
        <div className="py-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 prose prose-lg max-w-none">
            
            {/* Section 1 */}
            <section id="information-collection" className="mb-12">
              <div className="flex items-center mb-6">
                <Database className="h-8 w-8 text-primary mr-3" />
                <h2 className="text-3xl font-bold text-text-primary m-0">1. Information We Collect</h2>
              </div>
              
              <h3 className="text-xl font-semibold text-text-primary mb-4">Personal Information</h3>
              <p className="text-text-secondary mb-4">
                When you create an account with Smart Receipts A/NZ, we collect:
              </p>
              <ul className="text-text-secondary mb-6 space-y-2">
                <li>• Email address and password for authentication</li>
                <li>• Full name for personalization</li>
                <li>• Profile picture (optional)</li>
                <li>• Contact preferences and notification settings</li>
                <li>• Billing information for paid subscriptions</li>
              </ul>

              <h3 className="text-xl font-semibold text-text-primary mb-4">Receipt and Purchase Data</h3>
              <p className="text-text-secondary mb-4">
                To provide our core services, we process:
              </p>
              <ul className="text-text-secondary mb-6 space-y-2">
                <li>• Receipt images and PDF documents you upload</li>
                <li>• Extracted text and data from receipts (product names, prices, dates, store information)</li>
                <li>• Purchase history and spending patterns</li>
                <li>• Warranty information and tracking preferences</li>
                <li>• Search queries and interaction data</li>
              </ul>

              <h3 className="text-xl font-semibold text-text-primary mb-4">Technical Information</h3>
              <p className="text-text-secondary mb-4">
                We automatically collect certain technical data:
              </p>
              <ul className="text-text-secondary mb-6 space-y-2">
                <li>• IP address and geographic location (country/region level)</li>
                <li>• Device information (type, operating system, browser)</li>
                <li>• Usage analytics and performance metrics</li>
                <li>• Log files and error reports</li>
                <li>• Session duration and feature usage patterns</li>
              </ul>
            </section>

            {/* Section 2 */}
            <section id="how-we-use" className="mb-12">
              <div className="flex items-center mb-6">
                <Eye className="h-8 w-8 text-primary mr-3" />
                <h2 className="text-3xl font-bold text-text-primary m-0">2. How We Use Your Information</h2>
              </div>
              
              <h3 className="text-xl font-semibold text-text-primary mb-4">Core Service Delivery</h3>
              <ul className="text-text-secondary mb-6 space-y-2">
                <li>• Process and extract data from receipt images using AI</li>
                <li>• Organize and categorize your purchase records</li>
                <li>• Track warranty periods and send expiration alerts</li>
                <li>• Provide smart search and analytics features</li>
                <li>• Sync data across your devices</li>
              </ul>

              <h3 className="text-xl font-semibold text-text-primary mb-4">Account Management</h3>
              <ul className="text-text-secondary mb-6 space-y-2">
                <li>• Authenticate your access to the service</li>
                <li>• Process subscription payments and billing</li>
                <li>• Send account-related notifications</li>
                <li>• Provide customer support and troubleshooting</li>
              </ul>

              <h3 className="text-xl font-semibold text-text-primary mb-4">Service Improvement</h3>
              <ul className="text-text-secondary mb-6 space-y-2">
                <li>• Improve AI accuracy and feature performance</li>
                <li>• Develop new features and capabilities</li>
                <li>• Analyze usage patterns for optimization</li>
                <li>• Conduct security monitoring and fraud prevention</li>
              </ul>
            </section>

            {/* Section 3 */}
            <section id="data-storage" className="mb-12">
              <div className="flex items-center mb-6">
                <Lock className="h-8 w-8 text-primary mr-3" />
                <h2 className="text-3xl font-bold text-text-primary m-0">3. Data Storage and Security</h2>
              </div>
              
              <p className="text-text-secondary mb-4">
                We implement industry-standard security measures to protect your data:
              </p>
              <ul className="text-text-secondary mb-6 space-y-2">
                <li>• <strong>Encryption:</strong> All data is encrypted in transit (TLS 1.3) and at rest (AES-256)</li>
                <li>• <strong>Infrastructure:</strong> Data stored in secure, certified cloud facilities in Australia</li>
                <li>• <strong>Access Controls:</strong> Strict employee access controls with regular audits</li>
                <li>• <strong>Monitoring:</strong> 24/7 security monitoring and threat detection</li>
                <li>• <strong>Backups:</strong> Regular encrypted backups with disaster recovery procedures</li>
                <li>• <strong>Compliance:</strong> SOC 2 certified data centers and APP compliance</li>
              </ul>

              <p className="text-text-secondary mb-4">
                <strong>AI Processing:</strong> Receipt data sent to AI services (OpenAI, Perplexity) is processed 
                securely and not stored or used for training by these providers under our enterprise agreements.
              </p>
            </section>

            {/* Section 4 */}
            <section id="sharing" className="mb-12">
              <div className="flex items-center mb-6">
                <UserCheck className="h-8 w-8 text-primary mr-3" />
                <h2 className="text-3xl font-bold text-text-primary m-0">4. Information Sharing</h2>
              </div>
              
              <p className="text-text-secondary mb-4">
                We do not sell, rent, or trade your personal information. We only share data in these limited circumstances:
              </p>

              <h3 className="text-xl font-semibold text-text-primary mb-4">Service Providers</h3>
              <p className="text-text-secondary mb-4">
                We work with trusted third-party providers for:
              </p>
              <ul className="text-text-secondary mb-6 space-y-2">
                <li>• Cloud hosting and storage (Supabase/AWS)</li>
                <li>• AI processing services (OpenAI, Perplexity)</li>
                <li>• Payment processing (Stripe)</li>
                <li>• Email delivery and communications</li>
                <li>• Analytics and error tracking</li>
              </ul>

              <h3 className="text-xl font-semibold text-text-primary mb-4">Legal Requirements</h3>
              <p className="text-text-secondary mb-4">
                We may disclose information if required by law or to:
              </p>
              <ul className="text-text-secondary mb-6 space-y-2">
                <li>• Comply with legal processes or government requests</li>
                <li>• Protect our rights, property, or safety</li>
                <li>• Prevent fraud or illegal activities</li>
                <li>• Enforce our Terms of Service</li>
              </ul>

              <h3 className="text-xl font-semibold text-text-primary mb-4">Business Transfers</h3>
              <p className="text-text-secondary mb-4">
                In the event of a merger, acquisition, or sale, your data may be transferred as part of the transaction. 
                We will notify you of any such change and your rights regarding your data.
              </p>
            </section>

            {/* Section 5 */}
            <section id="your-rights" className="mb-12">
              <div className="flex items-center mb-6">
                <FileText className="h-8 w-8 text-primary mr-3" />
                <h2 className="text-3xl font-bold text-text-primary m-0">5. Your Rights and Choices</h2>
              </div>
              
              <p className="text-text-secondary mb-4">
                Under Australian Privacy Principles and international privacy laws, you have the right to:
              </p>
              <ul className="text-text-secondary mb-6 space-y-2">
                <li>• <strong>Access:</strong> Request a copy of your personal data</li>
                <li>• <strong>Rectification:</strong> Correct inaccurate or incomplete information</li>
                <li>• <strong>Deletion:</strong> Request deletion of your account and data</li>
                <li>• <strong>Portability:</strong> Export your data in a portable format</li>
                <li>• <strong>Restriction:</strong> Limit how we process your data</li>
                <li>• <strong>Objection:</strong> Object to certain types of processing</li>
                <li>• <strong>Withdraw Consent:</strong> Revoke consent for optional data processing</li>
              </ul>

              <p className="text-text-secondary mb-4">
                To exercise these rights, contact us at{' '}
                <a href="mailto:privacy@smartreceiptsau.com" className="text-primary hover:text-primary/80">
                  privacy@smartreceiptsau.com
                </a>{' '}
                or through your account settings.
              </p>
            </section>

            {/* Section 6 */}
            <section id="cookies" className="mb-12">
              <h2 className="text-3xl font-bold text-text-primary mb-6">6. Cookies and Tracking</h2>
              
              <p className="text-text-secondary mb-4">
                We use cookies and similar technologies to enhance your experience:
              </p>
              <ul className="text-text-secondary mb-6 space-y-2">
                <li>• <strong>Essential Cookies:</strong> Required for login and core functionality</li>
                <li>• <strong>Performance Cookies:</strong> Help us understand usage patterns</li>
                <li>• <strong>Preference Cookies:</strong> Remember your settings and preferences</li>
              </ul>

              <p className="text-text-secondary mb-4">
                You can control cookies through your browser settings. Note that disabling essential cookies may affect service functionality.
              </p>
            </section>

            {/* Section 7 */}
            <section id="retention" className="mb-12">
              <h2 className="text-3xl font-bold text-text-primary mb-6">7. Data Retention</h2>
              
              <p className="text-text-secondary mb-4">
                We retain your data for as long as necessary to provide services:
              </p>
              <ul className="text-text-secondary mb-6 space-y-2">
                <li>• Account data: Until account deletion plus 30 days</li>
                <li>• Receipt data: Until manual deletion or account closure</li>
                <li>• Billing records: 7 years as required by Australian law</li>
                <li>• Support communications: 3 years</li>
                <li>• Analytics data: 26 months (anonymized)</li>
              </ul>
            </section>

            {/* Section 8 */}
            <section id="international" className="mb-12">
              <h2 className="text-3xl font-bold text-text-primary mb-6">8. International Data Transfers</h2>
              
              <p className="text-text-secondary mb-4">
                Your data is primarily stored in Australia. When we use international service providers 
                (such as AI processing), we ensure appropriate safeguards including:
              </p>
              <ul className="text-text-secondary mb-6 space-y-2">
                <li>• Standard contractual clauses</li>
                <li>• Adequacy decisions where available</li>
                <li>• Data processing agreements with strict privacy requirements</li>
              </ul>
            </section>

            {/* Section 9 */}
            <section id="children" className="mb-12">
              <h2 className="text-3xl font-bold text-text-primary mb-6">9. Children's Privacy</h2>
              
              <p className="text-text-secondary mb-4">
                Our service is not intended for children under 18. We do not knowingly collect personal 
                information from children. If we become aware of such collection, we will delete the 
                information promptly.
              </p>
            </section>

            {/* Section 10 */}
            <section id="changes" className="mb-12">
              <h2 className="text-3xl font-bold text-text-primary mb-6">10. Changes to this Policy</h2>
              
              <p className="text-text-secondary mb-4">
                We may update this Privacy Policy periodically. We will notify you of material changes by:
              </p>
              <ul className="text-text-secondary mb-6 space-y-2">
                <li>• Email notification to registered users</li>
                <li>• Prominent notice on our website</li>
                <li>• In-app notifications</li>
              </ul>
              
              <p className="text-text-secondary mb-4">
                Continued use of our service after changes constitute acceptance of the updated policy.
              </p>
            </section>

            {/* Section 11 */}
            <section id="contact" className="mb-12">
              <h2 className="text-3xl font-bold text-text-primary mb-6">11. Contact Information</h2>
              
              <p className="text-text-secondary mb-4">
                For privacy-related questions or to exercise your rights, contact us:
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
              
              <p className="text-text-secondary mt-6">
                If you're not satisfied with our response, you may lodge a complaint with the Australian 
                Privacy Commissioner at <a href="https://www.oaic.gov.au" className="text-primary hover:text-primary/80">www.oaic.gov.au</a>.
              </p>
            </section>
          </div>
        </div>

        {/* CTA Section */}
        <section className="py-16 bg-gray-50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold text-text-primary mb-6">Questions About Your Privacy?</h2>
            <p className="text-xl text-text-secondary mb-8">
              We're committed to protecting your privacy and being transparent about our practices. 
              If you have any questions, we're here to help.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                to="/contact" 
                className="bg-primary text-white px-8 py-3 rounded-lg font-semibold hover:bg-primary/90 transition-colors duration-200"
              >
                Contact Privacy Officer
              </Link>
              <Link 
                to="/help-center" 
                className="border-2 border-primary text-primary px-8 py-3 rounded-lg font-semibold hover:bg-primary hover:text-white transition-colors duration-200"
              >
                Visit Help Center
              </Link>
            </div>
          </div>
        </section>
      </main>

      <HomepageFooter />
    </div>
  );
};

export default PrivacyPolicy; 