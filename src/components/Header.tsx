import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';

interface HeaderProps {
  onShowLogin: () => void;
  onShowSignUp: () => void;
}

const Header: React.FC<HeaderProps> = ({ onShowLogin, onShowSignUp }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navLinks = [
    { label: 'How It Works', href: '#how-it-works' },
    { label: 'Features', href: '#features' },
    { label: 'Pricing', href: '#pricing' },
    { label: 'Support', href: '#support' }
  ];

  return (
    <header className="bg-white shadow-card fixed w-full top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <img 
              src="/Smart Receipt Logo.png" 
              alt="Smart Receipts Logo" 
              className="h-10 w-10 object-contain"
            />
            <span className="text-2xl font-bold bg-gradient-to-r from-teal-500 to-blue-600 bg-clip-text text-transparent">
              Smart Receipts
            </span>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-text-secondary hover:text-text-link transition-colors duration-200 font-medium"
              >
                {link.label}
              </a>
            ))}
            <button
              onClick={onShowLogin}
              className="text-text-secondary hover:text-text-link transition-colors duration-200 font-medium"
            >
              Sign In
            </button>
            <button 
              onClick={onShowSignUp}
              className="bg-primary text-white px-6 py-2 rounded-lg font-medium hover:bg-primary/90 transition-all duration-200 shadow-card hover:shadow-card-hover"
            >
              Start Free Trial
            </button>
          </nav>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-text-secondary hover:text-text-link transition-colors duration-200"
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-200">
            <div className="flex flex-col space-y-3">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="text-text-secondary hover:text-text-link transition-colors duration-200 font-medium py-2"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {link.label}
                </a>
              ))}
              <button
                onClick={() => {
                  onShowLogin();
                  setIsMenuOpen(false);
                }}
                className="text-text-secondary hover:text-text-link transition-colors duration-200 font-medium py-2 text-left"
              >
                Sign In
              </button>
              <button 
                onClick={() => {
                  onShowSignUp();
                  setIsMenuOpen(false);
                }}
                className="bg-primary text-white px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors duration-200 mt-4"
              >
                Start Free Trial
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;