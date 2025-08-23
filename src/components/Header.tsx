import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';

// Removed unused props
// interface HeaderProps {
//   onShowLogin: () => void;
//   onShowSignUp: () => void;
// }

const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Check if we're on the homepage
  const isHomepage = location.pathname === '/';

  const navLinks = [
    { 
      label: 'How It Works', 
      href: isHomepage ? '#how-it-works' : '/how-it-works',
      isExternal: !isHomepage
    },
    { 
      label: 'Features', 
      href: isHomepage ? '#features' : '/features',
      isExternal: !isHomepage
    },
    { 
      label: 'Pricing', 
      href: '/pricing',
      isExternal: true
    },
    { 
      label: 'Support', 
      href: '/help-center',
      isExternal: true
    }
  ];

  return (
    <header className="bg-white shadow-card fixed w-full top-0 z-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 sm:space-x-3 group min-w-0 flex-shrink-0">
            <img 
              src="/Smart Receipt Logo.png" 
              alt="Smart Receipts Logo" 
              className="h-8 w-8 sm:h-10 sm:w-10 object-contain transition-transform duration-300 group-hover:scale-110 flex-shrink-0"
            />
            <span className="text-lg sm:text-xl lg:text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent truncate">
              Smart Receipts
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-4 lg:space-x-6 xl:space-x-8">
            {navLinks.map((link) => (
              link.isExternal ? (
                <Link
                  key={link.label}
                  to={link.href}
                  className="text-text-secondary hover:text-primary transition-colors duration-200 font-medium text-sm lg:text-base"
                >
                  {link.label}
                </Link>
              ) : (
                <a
                  key={link.label}
                  href={link.href}
                  className="text-text-secondary hover:text-primary transition-colors duration-200 font-medium text-sm lg:text-base"
                >
                  {link.label}
                </a>
              )
            ))}
            <button
              onClick={() => navigate('/login')}
              className="text-text-secondary hover:text-text-link transition-colors duration-200 font-medium text-sm lg:text-base"
            >
              Sign In
            </button>
            <a 
              href="https://docs.google.com/forms/d/e/1FAIpQLScD0r0uJ7lsegRhFL5gsdpdCIrsuuwBizPwPvu0sq6J2Pr0tg/viewform?usp=sharing&ouid=115412616738636624494"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-primary text-white px-4 lg:px-6 py-2 rounded-lg font-medium hover:bg-primary/90 transition-all duration-200 shadow-card hover:shadow-card-hover text-sm lg:text-base text-center"
            >
              Join Waitlist
            </a>
          </nav>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-text-secondary hover:text-primary transition-colors duration-200"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white border-t border-gray-200">
              {navLinks.map((link) => (
                link.isExternal ? (
                  <Link
                    key={link.label}
                    to={link.href}
                    className="block px-3 py-2 text-text-secondary hover:text-primary transition-colors duration-200 font-medium"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {link.label}
                  </Link>
                ) : (
                  <a
                    key={link.label}
                    href={link.href}
                    className="block px-3 py-2 text-text-secondary hover:text-primary transition-colors duration-200 font-medium"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {link.label}
                  </a>
                )
              ))}
              <button
                onClick={() => {
                  navigate('/login');
                  setIsMenuOpen(false);
                }}
                className="block w-full text-left px-3 py-2 text-text-secondary hover:text-text-link transition-colors duration-200 font-medium"
              >
                Sign In
              </button>
              <a 
                href="https://docs.google.com/forms/d/e/1FAIpQLScD0r0uJ7lsegRhFL5gsdpdCIrsuuwBizPwPvu0sq6J2Pr0tg/viewform?usp=sharing&ouid=115412616738636624494"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setIsMenuOpen(false)}
                className="block w-full text-left px-3 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-all duration-200"
              >
                Join Waitlist
              </a>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;