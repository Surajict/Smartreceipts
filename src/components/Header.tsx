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

  // Additional navigation links for authenticated users
  const authenticatedLinks = [
    {
      label: 'Dashboard',
      href: '/dashboard',
      isExternal: true
    },
    {
      label: 'My Library',
      href: '/library',
      isExternal: true
    },
    {
      label: 'Warranty Claims',
      href: '/warranty-claims',
      isExternal: true
    }
  ];

  return (
    <header className="bg-white shadow-card fixed w-full top-0 z-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3 sm:space-x-4 group min-w-0 flex-shrink-0">
            <div className="relative">
              <img 
                src="/Smart Receipt Logo.png" 
                alt="Smart Receipts A/NZ Logo" 
                className="h-10 w-10 sm:h-12 sm:w-12 object-contain transition-all duration-300 group-hover:scale-110 flex-shrink-0 drop-shadow-sm group-hover:drop-shadow-md"
              />
              {/* Subtle glow effect on hover */}
              <div className="absolute inset-0 bg-primary/20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-md -z-10"></div>
            </div>
            <div className="flex flex-col">
              <span className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent truncate group-hover:from-primary/90 group-hover:to-secondary/90 transition-all duration-300">
                Smart Receipts
              </span>
              <span className="text-xs sm:text-sm text-primary/70 font-medium truncate opacity-0 group-hover:opacity-100 transition-all duration-300 -mt-1">
                A/NZ
              </span>
            </div>
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
            {/* Sign In button - Hidden as requested */}
            {/*
            <button
              onClick={() => navigate('/login')}
              className="text-text-secondary hover:text-text-link transition-colors duration-200 font-medium text-sm lg:text-base"
            >
              Sign In
            </button>
            */}
            <a 
              href="https://docs.google.com/forms/d/e/1FAIpQLScD0r0uJ7lsegRhFL5gsdpdCIrsuuwBizPwPvu0sq6J2Pr0tg/viewform?usp=sharing&ouid=115412616738636624494"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white px-4 lg:px-6 py-2 rounded-lg font-medium transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 text-sm lg:text-base text-center border border-primary/20"
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
              {/* Sign In button - Hidden as requested */}
              {/*
              <button
                onClick={() => {
                  navigate('/login');
                  setIsMenuOpen(false);
                }}
                className="block w-full text-left px-3 py-2 text-text-secondary hover:text-text-link transition-colors duration-200 font-medium"
              >
                Sign In
              </button>
              */}
              <a 
                href="https://docs.google.com/forms/d/e/1FAIpQLScD0r0uJ7lsegRhFL5gsdpdCIrsuuwBizPwPvu0sq6J2Pr0tg/viewform?usp=sharing&ouid=115412616738636624494"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setIsMenuOpen(false)}
                className="block w-full text-left px-3 py-2 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white rounded-lg font-medium transition-all duration-300 shadow-md hover:shadow-lg border border-primary/20"
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