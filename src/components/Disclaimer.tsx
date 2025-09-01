import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Shield, FileX, Info } from 'lucide-react';
import Header from './Header';
import HomepageFooter from './HomepageFooter';

const Disclaimer: React.FC = () => {
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
                <AlertTriangle className="h-12 w-12 text-primary mr-4" />
                <h1 className="text-4xl md:text-5xl font-bold text-text-primary">
                  Disclaimer
                </h1>
              </div>
              <p className="text-xl text-text-secondary max-w-3xl mx-auto leading-relaxed">
                Important legal disclaimers and limitations regarding the use of Smart Receipts A/NZ 
                services and the information provided through our platform.
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
            
            {/* General Disclaimer */}
            <section className="mb-12">
              <div className="flex items-center mb-6">
                <Info className="h-8 w-8 text-primary mr-3" />
                <h2 className="text-3xl font-bold text-text-primary m-0">General Disclaimer</h2>
              </div>
              
              <p className="text-text-secondary mb-4">
                The information contained in this website and the Smart Receipts A/NZ application 
                ("Service") is for general information purposes only. While we endeavor to keep the 
                information up to date and correct, we make no representations or warranties of any 
                kind, express or implied, about the completeness, accuracy, reliability, suitability, 
                or availability of the information, products, services, or related graphics contained 
                in the Service for any purpose.
              </p>

              <p className="text-text-secondary mb-4">
                Any reliance you place on such information is therefore strictly at your own risk. 
                In no event will Smart Receipts A/NZ be liable for any loss or damage including, 
                without limitation, indirect or consequential loss or damage, or any loss or damage 
                whatsoever arising from loss of data or profits arising out of, or in connection 
                with, the use of this Service.
              </p>
            </section>

            {/* AI Technology Disclaimer */}
            <section className="mb-12">
              <div className="flex items-center mb-6">
                <Shield className="h-8 w-8 text-primary mr-3" />
                <h2 className="text-3xl font-bold text-text-primary m-0">AI Technology Limitations</h2>
              </div>
              
              <h3 className="text-xl font-semibold text-text-primary mb-4">Accuracy of AI Processing</h3>
              <p className="text-text-secondary mb-4">
                Our Service utilizes artificial intelligence technology to extract and process 
                information from receipt images. While we strive for high accuracy, AI technology 
                is not infallible and may occasionally produce errors or inaccuracies in data 
                extraction or interpretation.
              </p>

              <h3 className="text-xl font-semibold text-text-primary mb-4">User Responsibility</h3>
              <p className="text-text-secondary mb-4">
                Users are solely responsible for verifying the accuracy of all extracted data 
                before relying on it for any purpose, including but not limited to:
              </p>
              <ul className="text-text-secondary mb-6 space-y-2">
                <li>• Financial record keeping</li>
                <li>• Tax reporting and compliance</li>
                <li>• Warranty claim support</li>
                <li>• Business expense reporting</li>
                <li>• Insurance claims</li>
              </ul>

              <h3 className="text-xl font-semibold text-text-primary mb-4">No Guarantee of Results</h3>
              <p className="text-text-secondary mb-4">
                We do not guarantee that our AI technology will correctly identify all receipt 
                information, warranty periods, or product details. Users should independently 
                verify all extracted information and maintain original receipts for important 
                transactions.
              </p>
            </section>

            {/* Financial and Legal Disclaimer */}
            <section className="mb-12">
              <div className="flex items-center mb-6">
                <FileX className="h-8 w-8 text-primary mr-3" />
                <h2 className="text-3xl font-bold text-text-primary m-0">Financial and Legal Disclaimer</h2>
              </div>
              
              <h3 className="text-xl font-semibold text-text-primary mb-4">Not Financial or Legal Advice</h3>
              <p className="text-text-secondary mb-4">
                The Service is provided for organizational and informational purposes only. 
                Smart Receipts A/NZ does not provide financial, accounting, tax, or legal advice. 
                The information generated by our Service should not be considered as professional 
                advice in any of these areas.
              </p>

              <h3 className="text-xl font-semibold text-text-primary mb-4">Tax Compliance</h3>
              <p className="text-text-secondary mb-4">
                While our Service may assist with organizing receipts and expenses, users are 
                solely responsible for ensuring compliance with all applicable tax laws and 
                regulations. We recommend consulting with qualified tax professionals for 
                tax-related matters.
              </p>

              <h3 className="text-xl font-semibold text-text-primary mb-4">Warranty Claim Support</h3>
              <p className="text-text-secondary mb-4">
                Smart Receipts A/NZ provides warranty tracking as a convenience feature. We do 
                not guarantee the accuracy of warranty period calculations or the success of 
                warranty claim support. Users should verify warranty terms directly with manufacturers 
                and retailers.
              </p>
            </section>

            {/* Third-Party Services */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-text-primary mb-6">Third-Party Services and Content</h2>
              
              <p className="text-text-secondary mb-4">
                Our Service may contain links to third-party websites, services, or content that 
                are not owned or controlled by Smart Receipts A/NZ. We have no control over, and 
                assume no responsibility for, the content, privacy policies, or practices of any 
                third-party websites or services.
              </p>

              <p className="text-text-secondary mb-4">
                We do not warrant the offerings of any of these entities/individuals or their 
                websites. You acknowledge and agree that Smart Receipts A/NZ shall not be 
                responsible or liable, directly or indirectly, for any damage or loss caused or 
                alleged to be caused by or in connection with use of or reliance on any such 
                content, goods, or services available on or through any such websites or services.
              </p>
            </section>

            {/* Data Security */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-text-primary mb-6">Data Security Disclaimer</h2>
              
              <p className="text-text-secondary mb-4">
                While we implement industry-standard security measures to protect your data, 
                no method of transmission over the internet or electronic storage is 100% secure. 
                We cannot guarantee absolute security of your information.
              </p>

              <p className="text-text-secondary mb-4">
                Users are responsible for maintaining the confidentiality of their account 
                credentials and for all activities that occur under their account. We recommend 
                using strong, unique passwords and enabling two-factor authentication where available.
              </p>
            </section>

            {/* Service Availability */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-text-primary mb-6">Service Availability</h2>
              
              <p className="text-text-secondary mb-4">
                We strive to maintain continuous service availability but do not guarantee 
                uninterrupted access. The Service may be temporarily unavailable due to:
              </p>
              <ul className="text-text-secondary mb-6 space-y-2">
                <li>• Scheduled maintenance</li>
                <li>• System updates</li>
                <li>• Technical difficulties</li>
                <li>• Force majeure events</li>
                <li>• Third-party service disruptions</li>
              </ul>

              <p className="text-text-secondary mb-4">
                We shall not be liable for any inconvenience, loss, or damage arising from 
                service interruptions or unavailability.
              </p>
            </section>

            {/* Limitation of Liability */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-text-primary mb-6">Limitation of Liability</h2>
              
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-6 mb-6">
                <div className="flex">
                  <AlertTriangle className="h-6 w-6 text-yellow-400 mr-3 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-yellow-800 font-semibold mb-2">IMPORTANT LEGAL NOTICE</p>
                    <p className="text-yellow-700 text-sm">
                      The following limitations of liability are fundamental to our business model 
                      and the basis on which we provide our services.
                    </p>
                  </div>
                </div>
              </div>

              <p className="text-text-secondary mb-4">
                TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL SMART 
                RECEIPTS A/NZ, ITS OFFICERS, DIRECTORS, EMPLOYEES, AGENTS, OR SUPPLIERS BE 
                LIABLE FOR ANY INDIRECT, PUNITIVE, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR 
                EXEMPLARY DAMAGES, INCLUDING WITHOUT LIMITATION DAMAGES FOR LOSS OF PROFITS, 
                GOODWILL, USE, DATA, OR OTHER INTANGIBLE LOSSES, ARISING OUT OF OR RELATING 
                TO THE USE OF, OR INABILITY TO USE, THE SERVICE.
              </p>

              <p className="text-text-secondary mb-4">
                IN NO EVENT SHALL OUR TOTAL LIABILITY TO YOU FOR ALL DAMAGES, LOSSES, AND 
                CAUSES OF ACTION EXCEED THE AMOUNT PAID BY YOU, IF ANY, FOR ACCESSING OR 
                USING THE SERVICE DURING THE TWELVE (12) MONTHS IMMEDIATELY PRECEDING THE 
                DATE OF THE CLAIM.
              </p>
            </section>

            {/* Indemnification */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-text-primary mb-6">Indemnification</h2>
              
              <p className="text-text-secondary mb-4">
                You agree to defend, indemnify, and hold harmless Smart Receipts A/NZ and its 
                officers, directors, employees, agents, and suppliers from and against any 
                claims, actions, demands, liabilities, and settlements including, without 
                limitation, reasonable legal and accounting fees, resulting from, or alleged 
                to result from, your use of the Service or your violation of these terms.
              </p>
            </section>

            {/* Governing Law */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-text-primary mb-6">Governing Law and Jurisdiction</h2>
              
              <p className="text-text-secondary mb-4">
                This disclaimer shall be governed by and construed in accordance with the laws 
                of New South Wales, Australia, without regard to its conflict of law principles. 
                Any disputes arising from this disclaimer or the use of our Service shall be 
                subject to the exclusive jurisdiction of the courts of New South Wales, Australia.
              </p>
            </section>

            {/* Changes to Disclaimer */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-text-primary mb-6">Changes to This Disclaimer</h2>
              
              <p className="text-text-secondary mb-4">
                We reserve the right to modify this disclaimer at any time without prior notice. 
                Changes will be effective immediately upon posting on our website. Your continued 
                use of the Service after any changes constitutes acceptance of the revised disclaimer.
              </p>
            </section>

            {/* Contact Information */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-text-primary mb-6">Contact Information</h2>
              
              <p className="text-text-secondary mb-4">
                If you have any questions about this disclaimer, please contact us:
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
            <h2 className="text-3xl font-bold text-text-primary mb-6">Understanding Our Service</h2>
            <p className="text-xl text-text-secondary mb-8">
              We're committed to transparency about our service capabilities and limitations. 
              If you have questions about any aspect of our disclaimer, please contact us.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                to="/terms-of-service" 
                className="bg-primary text-white px-8 py-3 rounded-lg font-semibold hover:bg-primary/90 transition-colors duration-200"
              >
                View Terms of Service
              </Link>
              <Link 
                to="/contact" 
                className="border-2 border-primary text-primary px-8 py-3 rounded-lg font-semibold hover:bg-primary hover:text-white transition-colors duration-200"
              >
                Contact Legal Team
              </Link>
            </div>
          </div>
        </section>
      </main>

      <HomepageFooter />
    </div>
  );
};

export default Disclaimer; 