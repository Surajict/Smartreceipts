import React from 'react';
import { Facebook, Twitter, Linkedin, Instagram, Youtube, Mail, Phone, MapPin } from 'lucide-react';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  const footerSections = {
    product: {
      title: 'Product & Features',
      links: [
        { label: 'How it Works', href: '#how-it-works' },
        { label: 'AI Technology', href: '#ai-tech' },
        { label: 'Security', href: '#security' },
        { label: 'Plans & Pricing', href: '#pricing' },
        { label: 'System Requirements', href: '#requirements' },
        { label: 'Enterprise Solutions', href: '#enterprise' },
        { label: 'Mobile App', href: '#mobile' },
        { label: 'API Access', href: '#api' }
      ]
    },
    support: {
      title: 'Support & Resources',
      links: [
        { label: 'Help Center', href: '#help' },
        { label: 'Video Tutorials', href: '#tutorials' },
        { label: 'FAQ', href: '#faq' },
        { label: 'Community Forum', href: '#community' },
        { label: 'Educational Resources', href: '#education' },
        { label: 'Case Studies', href: '#case-studies' },
        { label: 'Webinars', href: '#webinars' },
        { label: 'Blog', href: '#blog' }
      ]
    },
    legal: {
      title: 'Legal & Compliance',
      links: [
        { label: 'Terms of Service', href: '#terms' },
        { label: 'Privacy Policy', href: '#privacy' },
        { label: 'Cookie Policy', href: '#cookies' },
        { label: 'Data Processing', href: '#data-processing' },
        { label: 'GDPR Compliance', href: '#gdpr' },
        { label: 'CCPA Compliance', href: '#ccpa' },
        { label: 'SOC 2 Certification', href: '#soc2' },
        { label: 'ISO 27001', href: '#iso' }
      ]
    }
  };

  const socialLinks = [
    { icon: Facebook, href: '#facebook', label: 'Facebook' },
    { icon: Twitter, href: '#twitter', label: 'Twitter' },
    { icon: Linkedin, href: '#linkedin', label: 'LinkedIn' },
    { icon: Instagram, href: '#instagram', label: 'Instagram' },
    { icon: Youtube, href: '#youtube', label: 'YouTube' }
  ];

  const trustBadges = [
    'SSL Secure',
    'SOC 2 Certified',
    'App Store Featured',
    'Google Play Featured'
  ];

  return (
    <footer className="bg-text-primary text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Footer Content */}
        <div className="py-16">
          <div className="grid lg:grid-cols-4 gap-12">
            {/* Brand & Contact Column */}
            <div className="lg:col-span-1">
              <div className="flex items-center space-x-3 mb-6">
                <img 
                  src="/Smart Receipt Logo.png" 
                  alt="Smart Receipts Logo" 
                  className="h-8 w-8 object-contain"
                />
                <span className="text-xl font-bold bg-gradient-to-r from-teal-400 to-blue-500 bg-clip-text text-transparent">
                  Smart Receipts
                </span>
              </div>
              
              <p className="text-gray-300 mb-6 leading-relaxed">
                Transform your receipt management with AI-powered scanning, 
                smart warranty tracking, and expert claim support.
              </p>

              {/* Contact Info */}
              <div className="space-y-3 mb-8">
                <div className="flex items-center space-x-3">
                  <Mail className="h-5 w-5 text-primary" />
                  <span className="text-gray-300">support@smartreceipts.com</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Phone className="h-5 w-5 text-primary" />
                  <span className="text-gray-300">1-800-RECEIPT</span>
                </div>
                <div className="flex items-center space-x-3">
                  <MapPin className="h-5 w-5 text-primary" />
                  <span className="text-gray-300">Global Presence - 50+ Countries</span>
                </div>
              </div>

              {/* Social Media */}
              <div>
                <h4 className="font-bold mb-4">Follow Us</h4>
                <div className="flex space-x-4">
                  {socialLinks.map((social, index) => {
                    const Icon = social.icon;
                    return (
                      <a
                        key={index}
                        href={social.href}
                        aria-label={social.label}
                        className="bg-gray-800 p-2 rounded-lg hover:bg-primary transition-colors duration-200"
                      >
                        <Icon className="h-5 w-5" />
                      </a>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Links Columns */}
            {Object.entries(footerSections).map(([key, section]) => (
              <div key={key}>
                <h4 className="font-bold text-lg mb-6">{section.title}</h4>
                <ul className="space-y-3">
                  {section.links.map((link, index) => (
                    <li key={index}>
                      <a
                        href={link.href}
                        className="text-gray-300 hover:text-primary transition-colors duration-200"
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Newsletter Signup */}
          <div className="mt-16 pt-16 border-t border-gray-800">
            <div className="bg-gray-800 rounded-2xl p-8">
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div>
                  <h3 className="text-2xl font-bold mb-4">Join Our Community</h3>
                  <p className="text-gray-300">
                    Get the latest updates, tips, and exclusive offers delivered to your inbox.
                  </p>
                </div>
                <div>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <input
                      type="email"
                      placeholder="Enter your email address"
                      className="flex-1 px-4 py-3 rounded-lg bg-gray-700 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                    <button className="bg-primary text-white px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors duration-200 whitespace-nowrap">
                      Subscribe
                    </button>
                  </div>
                  <p className="text-sm text-gray-400 mt-2">
                    We respect your privacy. Unsubscribe at any time.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Footer */}
        <div className="py-8 border-t border-gray-800">
          <div className="flex flex-col lg:flex-row justify-between items-center space-y-6 lg:space-y-0">
            {/* Copyright */}
            <div className="text-center lg:text-left">
              <p className="text-gray-400">
                © {currentYear} Smart Receipts Technologies Pty Ltd. All rights reserved.
              </p>
              <div className="flex flex-wrap justify-center lg:justify-start gap-6 mt-2">
                <a href="#accessibility" className="text-sm text-gray-400 hover:text-primary">
                  Accessibility
                </a>
                <a href="#modern-slavery" className="text-sm text-gray-400 hover:text-primary">
                  Modern Slavery
                </a>
                <a href="#sustainability" className="text-sm text-gray-400 hover:text-primary">
                  Sustainability
                </a>
                <a href="#dei" className="text-sm text-gray-400 hover:text-primary">
                  DEI
                </a>
                <a href="#csr" className="text-sm text-gray-400 hover:text-primary">
                  CSR
                </a>
              </div>
            </div>

            {/* Trust Badges */}
            <div className="flex flex-wrap justify-center lg:justify-end gap-6">
              {trustBadges.map((badge, index) => (
                <div
                  key={index}
                  className="bg-gray-800 px-4 py-2 rounded-lg border border-gray-700"
                >
                  <span className="text-sm text-gray-300">{badge}</span>
                </div>
              ))}
            </div>

            {/* Language/Region Selector */}
            <div className="flex items-center space-x-4">
              <select className="bg-gray-800 border border-gray-700 text-gray-300 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
                <option>🇺🇸 English (US)</option>
                <option>🇬🇧 English (UK)</option>
                <option>🇨🇦 English (CA)</option>
                <option>🇦🇺 English (AU)</option>
                <option>🇪🇸 Español</option>
                <option>🇫🇷 Français</option>
                <option>🇩🇪 Deutsch</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;