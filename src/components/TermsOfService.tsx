import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, Scale, AlertTriangle, Shield, CreditCard, Users } from 'lucide-react';
import Header from './Header';
import HomepageFooter from './HomepageFooter';

const TermsOfService: React.FC = () => {
  const lastUpdated = "January 24, 2025";
  const effectiveDate = "January 24, 2025";

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-20">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-primary/10 to-secondary/10 py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <div className="flex items-center justify-center mb-6">
                <Scale className="h-12 w-12 text-primary mr-4" />
                <h1 className="text-4xl md:text-5xl font-bold text-text-primary">
                  Terms of Service
                </h1>
              </div>
              <p className="text-xl text-text-secondary max-w-3xl mx-auto leading-relaxed">
                These Terms of Service govern your use of Smart Receipts A/NZ services 
                and establish the legal relationship between you and our company.
              </p>
              <div className="mt-6 space-y-2">
                <p className="text-text-secondary">
                  <strong>Last Updated:</strong> {lastUpdated}
                </p>
                <p className="text-text-secondary">
                  <strong>Effective Date:</strong> {effectiveDate}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Table of Contents */}
        <section className="py-8 border-b border-gray-200">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-xl font-semibold text-text-primary mb-4">Table of Contents</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              <a href="#acceptance" className="text-primary hover:text-primary/80">1. Acceptance of Terms</a>
              <a href="#description" className="text-primary hover:text-primary/80">2. Service Description</a>
              <a href="#accounts" className="text-primary hover:text-primary/80">3. User Accounts</a>
              <a href="#acceptable-use" className="text-primary hover:text-primary/80">4. Acceptable Use Policy</a>
              <a href="#subscription" className="text-primary hover:text-primary/80">5. Subscription and Payment</a>
              <a href="#intellectual-property" className="text-primary hover:text-primary/80">6. Intellectual Property</a>
              <a href="#privacy" className="text-primary hover:text-primary/80">7. Privacy and Data Protection</a>
              <a href="#availability" className="text-primary hover:text-primary/80">8. Service Availability</a>
              <a href="#limitation" className="text-primary hover:text-primary/80">9. Limitation of Liability</a>
              <a href="#termination" className="text-primary hover:text-primary/80">10. Termination</a>
              <a href="#governing-law" className="text-primary hover:text-primary/80">11. Governing Law</a>
              <a href="#amendments" className="text-primary hover:text-primary/80">12. Amendments</a>
              <a href="#contact" className="text-primary hover:text-primary/80">13. Contact Information</a>
            </div>
          </div>
        </section>

        {/* Main Content */}
        <div className="py-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 prose prose-lg max-w-none">
            
            {/* Section 1 */}
            <section id="acceptance" className="mb-12">
              <div className="flex items-center mb-6">
                <FileText className="h-8 w-8 text-primary mr-3" />
                <h2 className="text-3xl font-bold text-text-primary m-0">1. Acceptance of Terms</h2>
              </div>
              
              <p className="text-text-secondary mb-4">
                By accessing, downloading, installing, or using the Smart Receipts A/NZ application 
                ("Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not 
                agree to these Terms, you must not use our Service.
              </p>
              
              <p className="text-text-secondary mb-4">
                These Terms constitute a legally binding agreement between you ("User," "you," or "your") 
                and Smart Receipts A/NZ ("Company," "we," "us," or "our"). Your use of the Service 
                confirms your acceptance of these Terms and your agreement to comply with them.
              </p>

              <p className="text-text-secondary mb-4">
                If you are using the Service on behalf of an organization, you represent and warrant 
                that you have the authority to bind that organization to these Terms.
              </p>
            </section>

            {/* Section 2 */}
            <section id="description" className="mb-12">
              <div className="flex items-center mb-6">
                <Shield className="h-8 w-8 text-primary mr-3" />
                <h2 className="text-3xl font-bold text-text-primary m-0">2. Service Description</h2>
              </div>
              
              <p className="text-text-secondary mb-4">
                Smart Receipts A/NZ provides an artificial intelligence-powered digital receipt 
                management system that enables users to:
              </p>
              <ul className="text-text-secondary mb-6 space-y-2">
                <li>• Capture, store, and organize digital receipts</li>
                <li>• Extract and process receipt data using AI technology</li>
                <li>• Track warranty periods and receive expiration notifications</li>
                <li>• Search and analyze purchase history</li>
                <li>• Access receipt data across multiple devices</li>
              </ul>

              <p className="text-text-secondary mb-4">
                The Service is provided on a Software-as-a-Service (SaaS) basis and is accessible 
                through web browsers and mobile applications. We reserve the right to modify, 
                suspend, or discontinue any aspect of the Service at any time, with or without notice.
              </p>
            </section>

            {/* Section 3 */}
            <section id="accounts" className="mb-12">
              <div className="flex items-center mb-6">
                <Users className="h-8 w-8 text-primary mr-3" />
                <h2 className="text-3xl font-bold text-text-primary m-0">3. User Accounts</h2>
              </div>
              
              <h3 className="text-xl font-semibold text-text-primary mb-4">3.1 Account Creation</h3>
              <p className="text-text-secondary mb-4">
                To use the Service, you must create an account by providing accurate and complete 
                information. You are solely responsible for maintaining the confidentiality of your 
                account credentials and for all activities that occur under your account.
              </p>

              <h3 className="text-xl font-semibold text-text-primary mb-4">3.2 Account Responsibilities</h3>
              <p className="text-text-secondary mb-4">You must:</p>
              <ul className="text-text-secondary mb-6 space-y-2">
                <li>• Provide accurate, current, and complete information</li>
                <li>• Maintain and promptly update your account information</li>
                <li>• Notify us immediately of any unauthorized use of your account</li>
                <li>• Be responsible for all activities under your account</li>
                <li>• Comply with all applicable laws and regulations</li>
              </ul>

              <h3 className="text-xl font-semibold text-text-primary mb-4">3.3 Account Restrictions</h3>
              <p className="text-text-secondary mb-4">
                You may not create multiple accounts, share your account with others, or use the 
                Service for any unlawful purpose. We reserve the right to suspend or terminate 
                accounts that violate these Terms.
              </p>
            </section>

            {/* Section 4 */}
            <section id="acceptable-use" className="mb-12">
              <div className="flex items-center mb-6">
                <AlertTriangle className="h-8 w-8 text-primary mr-3" />
                <h2 className="text-3xl font-bold text-text-primary m-0">4. Acceptable Use Policy</h2>
              </div>
              
              <h3 className="text-xl font-semibold text-text-primary mb-4">4.1 Permitted Use</h3>
              <p className="text-text-secondary mb-4">
                You may use the Service only for lawful purposes and in accordance with these Terms. 
                The Service is intended for personal and business receipt management purposes.
              </p>

              <h3 className="text-xl font-semibold text-text-primary mb-4">4.2 Prohibited Activities</h3>
              <p className="text-text-secondary mb-4">You must not:</p>
              <ul className="text-text-secondary mb-6 space-y-2">
                <li>• Use the Service for any illegal or unauthorized purpose</li>
                <li>• Upload fraudulent, false, or misleading receipt data</li>
                <li>• Attempt to gain unauthorized access to our systems</li>
                <li>• Interfere with or disrupt the Service or servers</li>
                <li>• Reverse engineer, decompile, or disassemble the Service</li>
                <li>• Use automated scripts or bots to access the Service</li>
                <li>• Violate any applicable laws or regulations</li>
                <li>• Infringe upon intellectual property rights</li>
              </ul>

              <h3 className="text-xl font-semibold text-text-primary mb-4">4.3 Enforcement</h3>
              <p className="text-text-secondary mb-4">
                We reserve the right to investigate violations of this Acceptable Use Policy and 
                take appropriate action, including suspension or termination of accounts, reporting 
                to law enforcement, and pursuing legal remedies.
              </p>
            </section>

            {/* Section 5 */}
            <section id="subscription" className="mb-12">
              <div className="flex items-center mb-6">
                <CreditCard className="h-8 w-8 text-primary mr-3" />
                <h2 className="text-3xl font-bold text-text-primary m-0">5. Subscription and Payment</h2>
              </div>
              
              <h3 className="text-xl font-semibold text-text-primary mb-4">5.1 Service Plans</h3>
              <p className="text-text-secondary mb-4">
                We offer the following service plans:
              </p>
              <ul className="text-text-secondary mb-6 space-y-2">
                <li>• <strong>Free Trial:</strong> Limited to 5 receipts total, no recurring charges</li>
                <li>• <strong>Premium Plan:</strong> AU$7.00 per month, unlimited receipt scanning and advanced features</li>
              </ul>

              <h3 className="text-xl font-semibold text-text-primary mb-4">5.2 Payment Terms</h3>
              <p className="text-text-secondary mb-4">
                Premium subscriptions are billed monthly in advance. Payment is due immediately upon 
                subscription activation and then monthly thereafter. All prices are in Australian 
                Dollars (AUD) and include applicable taxes.
              </p>

              <h3 className="text-xl font-semibold text-text-primary mb-4">5.3 Automatic Renewal</h3>
              <p className="text-text-secondary mb-4">
                Premium subscriptions automatically renew each month unless cancelled. You may cancel 
                your subscription at any time through your account settings. Cancellation takes effect 
                at the end of the current billing period.
              </p>

              <h3 className="text-xl font-semibold text-text-primary mb-4">5.4 Refunds</h3>
              <p className="text-text-secondary mb-4">
                We offer a 30-day money-back guarantee for Premium subscriptions. Refund requests must 
                be submitted within 30 days of the initial payment. No refunds are provided for partial 
                months or unused portions of the Service.
              </p>

              <h3 className="text-xl font-semibold text-text-primary mb-4">5.5 Price Changes</h3>
              <p className="text-text-secondary mb-4">
                We reserve the right to modify subscription prices with 30 days' written notice. 
                Price changes will take effect at the start of your next billing cycle. Continued 
                use of the Service after price changes constitutes acceptance of the new pricing.
              </p>
            </section>

            {/* Section 6 */}
            <section id="intellectual-property" className="mb-12">
              <h2 className="text-3xl font-bold text-text-primary mb-6">6. Intellectual Property Rights</h2>
              
              <h3 className="text-xl font-semibold text-text-primary mb-4">6.1 Our Intellectual Property</h3>
              <p className="text-text-secondary mb-4">
                The Service, including all content, features, functionality, software, designs, 
                text, graphics, logos, and trademarks, is owned by Smart Receipts A/NZ and is 
                protected by Australian and international copyright, trademark, and other 
                intellectual property laws.
              </p>

              <h3 className="text-xl font-semibold text-text-primary mb-4">6.2 Your Content</h3>
              <p className="text-text-secondary mb-4">
                You retain ownership of receipt images and data you upload to the Service ("User Content"). 
                By using the Service, you grant us a limited, non-exclusive, royalty-free license to 
                process, store, and display your User Content solely for the purpose of providing the Service.
              </p>

              <h3 className="text-xl font-semibold text-text-primary mb-4">6.3 Restrictions</h3>
              <p className="text-text-secondary mb-4">
                You may not copy, modify, distribute, sell, or lease any part of the Service. You may 
                not reverse engineer or attempt to extract source code unless expressly permitted by law.
              </p>
            </section>

            {/* Section 7 */}
            <section id="privacy" className="mb-12">
              <h2 className="text-3xl font-bold text-text-primary mb-6">7. Privacy and Data Protection</h2>
              
              <p className="text-text-secondary mb-4">
                Your privacy is important to us. Our collection, use, and protection of your personal 
                information is governed by our Privacy Policy, which is incorporated into these Terms 
                by reference. By using the Service, you consent to the collection and use of your 
                information as described in our Privacy Policy.
              </p>

              <p className="text-text-secondary mb-4">
                We implement appropriate technical and organizational measures to protect your data 
                against unauthorized access, alteration, disclosure, or destruction. However, no 
                internet transmission or electronic storage is completely secure.
              </p>
            </section>

            {/* Section 8 */}
            <section id="availability" className="mb-12">
              <h2 className="text-3xl font-bold text-text-primary mb-6">8. Service Availability</h2>
              
              <p className="text-text-secondary mb-4">
                While we strive to provide reliable service, we do not guarantee that the Service 
                will be available at all times or free from interruptions. The Service may be 
                temporarily unavailable due to maintenance, updates, or circumstances beyond our control.
              </p>

              <p className="text-text-secondary mb-4">
                We reserve the right to modify, suspend, or discontinue the Service or any part 
                thereof, temporarily or permanently, with or without notice. We shall not be liable 
                for any such modification, suspension, or discontinuation.
              </p>
            </section>

            {/* Section 9 */}
            <section id="limitation" className="mb-12">
              <h2 className="text-3xl font-bold text-text-primary mb-6">9. Limitation of Liability</h2>
              
              <p className="text-text-secondary mb-4">
                TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, SMART RECEIPTS A/NZ SHALL NOT BE 
                LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, 
                INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA, USE, OR GOODWILL, ARISING FROM 
                YOUR USE OF THE SERVICE.
              </p>

              <p className="text-text-secondary mb-4">
                OUR TOTAL LIABILITY TO YOU FOR ALL CLAIMS ARISING FROM OR RELATING TO THE SERVICE 
                SHALL NOT EXCEED THE AMOUNT PAID BY YOU TO US IN THE TWELVE (12) MONTHS PRECEDING 
                THE CLAIM.
              </p>

              <p className="text-text-secondary mb-4">
                SOME JURISDICTIONS DO NOT ALLOW THE EXCLUSION OR LIMITATION OF CERTAIN DAMAGES. 
                IN SUCH JURISDICTIONS, OUR LIABILITY IS LIMITED TO THE FULLEST EXTENT PERMITTED BY LAW.
              </p>
            </section>

            {/* Section 10 */}
            <section id="termination" className="mb-12">
              <h2 className="text-3xl font-bold text-text-primary mb-6">10. Termination</h2>
              
              <h3 className="text-xl font-semibold text-text-primary mb-4">10.1 Termination by You</h3>
              <p className="text-text-secondary mb-4">
                You may terminate your account at any time by following the account deletion process 
                in your account settings or by contacting us directly.
              </p>

              <h3 className="text-xl font-semibold text-text-primary mb-4">10.2 Termination by Us</h3>
              <p className="text-text-secondary mb-4">
                We may terminate or suspend your account immediately, without prior notice, if you 
                violate these Terms or engage in conduct that we reasonably believe is harmful to 
                other users or our business interests.
              </p>

              <h3 className="text-xl font-semibold text-text-primary mb-4">10.3 Effect of Termination</h3>
              <p className="text-text-secondary mb-4">
                Upon termination, your right to use the Service will cease immediately. We may, at 
                our discretion, delete your account and User Content. We are not obligated to retain 
                or provide copies of your User Content after termination.
              </p>
            </section>

            {/* Section 11 */}
            <section id="governing-law" className="mb-12">
              <h2 className="text-3xl font-bold text-text-primary mb-6">11. Governing Law</h2>
              
              <p className="text-text-secondary mb-4">
                These Terms are governed by and construed in accordance with the laws of New South 
                Wales, Australia. Any disputes arising from these Terms or the Service shall be 
                subject to the exclusive jurisdiction of the courts of New South Wales, Australia.
              </p>

              <p className="text-text-secondary mb-4">
                The United Nations Convention on Contracts for the International Sale of Goods does 
                not apply to these Terms.
              </p>
            </section>

            {/* Section 12 */}
            <section id="amendments" className="mb-12">
              <h2 className="text-3xl font-bold text-text-primary mb-6">12. Amendments</h2>
              
              <p className="text-text-secondary mb-4">
                We reserve the right to modify these Terms at any time. We will provide notice of 
                material changes by posting the updated Terms on our website and sending notification 
                to your registered email address.
              </p>

              <p className="text-text-secondary mb-4">
                Your continued use of the Service after the effective date of revised Terms 
                constitutes acceptance of the changes. If you do not agree to the revised Terms, 
                you must discontinue use of the Service.
              </p>
            </section>

            {/* Section 13 */}
            <section id="contact" className="mb-12">
              <h2 className="text-3xl font-bold text-text-primary mb-6">13. Contact Information</h2>
              
              <p className="text-text-secondary mb-4">
                For questions regarding these Terms of Service, please contact us:
              </p>
              <div className="bg-gray-50 rounded-lg p-6 space-y-2">
                <p className="text-text-secondary">
                  <strong>Smart Receipts A/NZ</strong><br />
                  Legal Department<br />
                  47 Waitara Avenue<br />
                  Waitara NSW 2177<br />
                  Australia
                </p>
                <p className="text-text-secondary">
                  Email: <a href="mailto:legal@smartreceiptsau.com" className="text-primary hover:text-primary/80">legal@smartreceiptsau.com</a><br />
                  General Inquiries: <a href="mailto:smartreceiptsau@gmail.com" className="text-primary hover:text-primary/80">smartreceiptsau@gmail.com</a>
                </p>
              </div>
            </section>
          </div>
        </div>

        {/* CTA Section */}
        <section className="py-16 bg-gray-50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold text-text-primary mb-6">Ready to Get Started?</h2>
            <p className="text-xl text-text-secondary mb-8">
              By creating an account, you agree to these Terms of Service and our Privacy Policy. 
              Try Smart Receipts free with 5 receipts, then AU$7/month for unlimited access.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                to="/signup" 
                className="bg-primary text-white px-8 py-3 rounded-lg font-semibold hover:bg-primary/90 transition-colors duration-200"
              >
                Create Account
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

export default TermsOfService; 