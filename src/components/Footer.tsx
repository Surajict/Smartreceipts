import React from 'react';
import { Link } from 'react-router-dom';

export const OldFooter: React.FC = () => {
  const year = new Date().getFullYear();
  return (
    <footer className="bg-gradient-to-br from-text-primary to-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-12 flex flex-col md:flex-row items-center justify-between">
          <div className="flex items-center space-x-3 mb-4 md:mb-0">
            <img src="/Smart Receipt Logo.png" alt="Smart Receipts Logo" className="h-8 w-8 object-contain filter brightness-150" />
            <span className="text-xl font-bold bg-gradient-to-r from-teal-300 to-blue-400 bg-clip-text text-transparent">
              Smart Receipts
            </span>
          </div>
          <div className="text-gray-300 text-sm">
            Transform your receipt management with AI-powered scanning, smart warranty tracking, and expert claim support.
          </div>
          <div className="text-gray-400 text-xs mt-4 md:mt-0">© {year} Smart Receipts Technologies Pty Ltd. All rights reserved.</div>
        </div>
      </div>
    </footer>
  );
};

const Footer: React.FC = () => {
  const year = new Date().getFullYear();
  return (
    <footer className="bg-white border-t border-gray-200 py-4 sm:py-6 mt-auto">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 flex flex-col md:flex-row md:justify-between md:items-center gap-4 sm:gap-6 md:gap-0">
        {/* Logo Section */}
        <div className="flex items-center space-x-2 justify-center md:justify-start">
          <img src="/Smart Receipt Logo.png" alt="Smart Receipts Logo" className="h-6 w-6 sm:h-8 sm:w-8" />
          <span className="font-bold text-base sm:text-lg text-primary">Smart Receipts</span>
        </div>
        {/* Navigation - stack on mobile, row on md+ */}
        <nav className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-2 sm:gap-4 md:gap-6 mt-2 md:mt-0">
          <Link to="/dashboard" className="text-text-secondary hover:text-primary transition-colors duration-200 text-sm sm:text-base">Dashboard</Link>
          <Link to="/library" className="text-text-secondary hover:text-primary transition-colors duration-200 text-sm sm:text-base">My Receipts</Link>
          <Link to="/warranty" className="text-text-secondary hover:text-primary transition-colors duration-200 text-sm sm:text-base">Warranty Center</Link>
          <Link to="/profile" className="text-text-secondary hover:text-primary transition-colors duration-200 text-sm sm:text-base">Profile</Link>
          <Link to="/help-center" className="text-text-secondary hover:text-primary transition-colors duration-200 text-sm sm:text-base">Help</Link>
        </nav>
        {/* Support Links & Copyright */}
        <div className="flex flex-col items-center md:items-end mt-2 md:mt-0 w-full md:w-auto">
          <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-2 sm:gap-3 mb-1">
            <Link to="/help-center" className="text-text-secondary hover:text-primary text-xs sm:text-sm transition-colors duration-200">Contact Support</Link>
            <Link to="/privacy-policy" className="text-text-secondary hover:text-primary text-xs sm:text-sm transition-colors duration-200">Privacy Policy</Link>
            <Link to="/terms-of-service" className="text-text-secondary hover:text-primary text-xs sm:text-sm transition-colors duration-200">Terms</Link>
          </div>
          {/* Divider for mobile */}
          <div className="block md:hidden w-full border-t border-gray-200 my-1"></div>
          <span className="text-xs text-gray-400 text-center md:text-right">© {year} Smart Receipts. All rights reserved.</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;