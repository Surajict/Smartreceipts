import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Zap, Shield, Brain, Users, Target, Heart } from 'lucide-react';
import Header from './Header';
import HomepageFooter from './HomepageFooter';

const AboutUs: React.FC = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-20">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-primary/10 to-secondary/10 py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h1 className="text-4xl md:text-5xl font-bold text-text-primary mb-6">
                About Smart Receipts A/NZ
              </h1>
              <p className="text-xl text-text-secondary max-w-3xl mx-auto leading-relaxed">
                Transforming receipt chaos into organized digital records with AI-powered technology. 
                Never lose a receipt or miss a warranty claim again.
              </p>
            </div>
          </div>
        </section>

        {/* Our Story Section */}
        <section className="py-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-text-primary mb-8 text-center">Our Story</h2>
            <div className="prose prose-lg max-w-none text-text-secondary">
              <p className="text-lg leading-relaxed mb-6">
                Smart Receipts was born from a simple yet frustrating problem: the chaos of managing paper receipts. 
                Like many Australians and New Zealanders, our founders experienced the all-too-familiar scenario of 
                searching through drawers, wallets, and bags for that one crucial receipt when a warranty claim was needed.
              </p>
              <p className="text-lg leading-relaxed mb-6">
                In 2024, we set out to solve this universal problem using cutting-edge AI technology. Our vision was clear: 
                create an intelligent system that not only stores receipts digitally but actively helps users manage their 
                purchases, track warranties, and maximize their consumer rights.
              </p>
              <p className="text-lg leading-relaxed">
                Today, Smart Receipts serves customers across Australia and New Zealand, helping them transform their 
                receipt management from chaos to organization, ensuring they never miss a warranty claim or lose important 
                purchase records again.
              </p>
            </div>
          </div>
        </section>

        {/* Mission & Vision Section */}
        <section className="py-16 bg-gray-50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div>
                <div className="flex items-center mb-4">
                  <Target className="h-8 w-8 text-primary mr-3" />
                  <h3 className="text-2xl font-bold text-text-primary">Our Mission</h3>
                </div>
                <p className="text-text-secondary text-lg leading-relaxed">
                  To empower consumers with intelligent receipt management technology that protects their purchases, 
                  maximizes warranty claims, and transforms the way people organize their financial records. We believe 
                  everyone deserves to have their consumer rights protected and their purchases organized effortlessly.
                </p>
              </div>
              <div>
                <div className="flex items-center mb-4">
                  <Heart className="h-8 w-8 text-secondary mr-3" />
                  <h3 className="text-2xl font-bold text-text-primary">Our Vision</h3>
                </div>
                <p className="text-text-secondary text-lg leading-relaxed">
                  To become the leading digital receipt management platform in the Asia-Pacific region, where every 
                  consumer can confidently make purchases knowing their receipts are safely stored, their warranties 
                  are actively tracked, and their consumer rights are fully protected.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* What Makes Us Different */}
        <section className="py-16">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-text-primary mb-12 text-center">What Makes Us Different</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="bg-primary/10 rounded-full p-6 w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                  <Brain className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-text-primary mb-3">AI-Powered Intelligence</h3>
                <p className="text-text-secondary">
                  Our cutting-edge AI technology achieves 99.5% accuracy in extracting receipt data, automatically 
                  detects multi-product purchases, and validates information for maximum reliability.
                </p>
              </div>
              <div className="text-center">
                <div className="bg-secondary/10 rounded-full p-6 w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                  <Shield className="h-8 w-8 text-secondary" />
                </div>
                <h3 className="text-xl font-semibold text-text-primary mb-3">Proactive Warranty Protection</h3>
                <p className="text-text-secondary">
                  We don't just store receipts – we actively track warranty periods for each individual product 
                  and send timely alerts before warranties expire, helping you maximize your consumer rights.
                </p>
              </div>
              <div className="text-center">
                <div className="bg-accent/10 rounded-full p-6 w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                  <Zap className="h-8 w-8 text-accent" />
                </div>
                <h3 className="text-xl font-semibold text-text-primary mb-3">Smart Search & Analytics</h3>
                <p className="text-text-secondary">
                  Find any purchase instantly with our AI-powered search that understands natural language queries 
                  like "How much did I spend on electronics this year?"
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Our Values */}
        <section className="py-16 bg-gradient-to-br from-primary/5 to-secondary/5">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-text-primary mb-12 text-center">Our Values</h2>
            <div className="space-y-8">
              <div className="flex items-start space-x-4">
                <div className="bg-primary text-white rounded-full p-2 flex-shrink-0">
                  <Shield className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-text-primary mb-2">Privacy & Security First</h3>
                  <p className="text-text-secondary">
                    Your data is protected with bank-level encryption (AES-256). We never share your personal 
                    information with third parties without your explicit consent.
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-4">
                <div className="bg-secondary text-white rounded-full p-2 flex-shrink-0">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-text-primary mb-2">Customer-Centric Innovation</h3>
                  <p className="text-text-secondary">
                    Every feature we build is designed to solve real problems faced by everyday consumers. 
                    We listen to our users and continuously improve based on their feedback.
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-4">
                <div className="bg-accent text-white rounded-full p-2 flex-shrink-0">
                  <Heart className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-text-primary mb-2">Simplicity & Accessibility</h3>
                  <p className="text-text-secondary">
                    We believe powerful technology should be easy to use. Our interface is designed to be 
                    intuitive for users of all technical backgrounds.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Call to Action */}
        <section className="py-16 bg-gradient-to-r from-primary to-secondary text-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold mb-6">Ready to Transform Your Receipt Management?</h2>
            <p className="text-xl mb-8 opacity-90">
              Join thousands of satisfied customers across Australia and New Zealand who have already 
              transformed their receipt chaos into organized digital records.
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

export default AboutUs; 