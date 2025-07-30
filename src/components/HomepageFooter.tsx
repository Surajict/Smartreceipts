import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, MapPin, Phone } from 'lucide-react';

interface HomepageFooterProps {}

const HomepageFooter: React.FC<HomepageFooterProps> = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gradient-to-br from-gray-900 to-gray-800 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          
          {/* Company & Contact Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white mb-4">Company & Contact</h3>
            <ul className="space-y-3 text-gray-300">
              <li>
                <Link to="/about" className="hover:text-white transition-colors duration-200">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-white transition-colors duration-200">
                  Contact Us
                </Link>
              </li>
              <li className="flex items-start space-x-2 text-sm">
                <Mail className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <a href="mailto:smartreceiptsau@gmail.com" className="hover:text-white transition-colors duration-200">
                  smartreceiptsau@gmail.com
                </a>
              </li>
              <li className="flex items-start space-x-2 text-sm">
                <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>47 Waitara Avenue<br />Waitara NSW 2177<br />Australia</span>
              </li>
            </ul>
          </div>

          {/* Policy & Legal Links */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white mb-4">Policies & Legal</h3>
            <ul className="space-y-3 text-gray-300">
              <li>
                <Link to="/privacy-policy" className="hover:text-white transition-colors duration-200">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms-of-service" className="hover:text-white transition-colors duration-200">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link to="/cookie-policy" className="hover:text-white transition-colors duration-200">
                  Cookie Policy
                </Link>
              </li>
              <li>
                <Link to="/disclaimer" className="hover:text-white transition-colors duration-200">
                  Disclaimer
                </Link>
              </li>
            </ul>
          </div>

          {/* Product & Features */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white mb-4">Product & Support</h3>
            <ul className="space-y-3 text-gray-300">
              <li>
                <Link to="/how-it-works" className="hover:text-white transition-colors duration-200">
                  How It Works
                </Link>
              </li>
              <li>
                <Link to="/features" className="hover:text-white transition-colors duration-200">
                  Features
                </Link>
              </li>
              <li>
                <Link to="/pricing" className="hover:text-white transition-colors duration-200">
                  Pricing & Plans
                </Link>
              </li>
              <li>
                <Link to="/help-center" className="hover:text-white transition-colors duration-200">
                  Help Center
                </Link>
              </li>
            </ul>
          </div>

          {/* User Account Links */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white mb-4">Get Started</h3>
            <ul className="space-y-3 text-gray-300">
              <li>
                <Link to="/signup" className="hover:text-white transition-colors duration-200">
                  Sign Up / Register
                </Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-white transition-colors duration-200">
                  Log In
                </Link>
              </li>
              <li>
                <Link to="/signup" className="inline-flex items-center bg-primary text-white px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-all duration-200 text-sm">
                  Start Free Trial
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-700 pt-8">
          <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
            
            {/* Logo & Branding */}
            <div className="flex items-center space-x-3">
              <img 
                src="/Smart Receipt Logo.png" 
                alt="Smart Receipts A/NZ Logo" 
                className="h-10 w-10 object-contain filter brightness-150"
              />
              <div className="flex flex-col">
                <span className="text-xl font-bold bg-gradient-to-r from-teal-300 to-blue-400 bg-clip-text text-transparent">
                  Smart Receipts A/NZ
                </span>
                <span className="text-xs text-gray-400">
                  AI-Powered Receipt Management
                </span>
              </div>
            </div>

            {/* Copyright Notice */}
            <div className="text-center md:text-right">
              <p className="text-sm text-gray-400">
                © {currentYear} Smart Receipts A/NZ. All rights reserved.
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Transform your receipt chaos into organized digital records
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default HomepageFooter; 