import React from 'react';
import { Play, TrendingUp, Users, Shield, Clock } from 'lucide-react';
import { TrustStat } from '../types';

interface HeroProps {
  onShowLogin: () => void;
  onShowSignUp: () => void;
}

const Hero: React.FC<HeroProps> = ({ onShowLogin, onShowSignUp }) => {
  const trustStats: TrustStat[] = [
    {
      value: '99.5%',
      label: 'Scanning accuracy',
      description: 'AI-powered precision in receipt digitization'
    },
    {
      value: '$2.3M',
      label: 'Potential claim recovery',
      description: 'Total warranty claims our users have recovered'
    },
    {
      value: '50k+',
      label: 'Active users within 1 year',
      description: 'Growing community of smart receipt users'
    },
    {
      value: '94%',
      label: 'Claim success rate',
      description: 'Successful warranty claims with our support'
    },
    {
      value: '< 3 sec',
      label: 'Processing time',
      description: 'Lightning-fast receipt scanning and analysis'
    }
  ];

  const getStatIcon = (index: number) => {
    const icons = [Shield, TrendingUp, Users, TrendingUp, Clock];
    const Icon = icons[index];
    return <Icon className="h-full w-full text-secondary" />;
  };

  return (
    <section className="bg-gradient-to-b from-white to-background pt-16 sm:pt-20 pb-6 sm:pb-8">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8">
        <div className="grid lg:grid-cols-2 gap-8 sm:gap-12 lg:items-start">
          {/* Left Column - Content */}
          <div className="text-center lg:text-left animate-fade-in">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-text-primary leading-tight mb-4 sm:mb-6 tracking-tight">
              Never Lose a Receipt or{' '}
              <span className="text-primary">Miss a Warranty Claim</span> Again
            </h1>
            
            <p className="text-base sm:text-lg lg:text-xl text-text-secondary mb-6 sm:mb-8 leading-relaxed">
              Smart Receipts uses AI to instantly scan, organize, and track your receipts 
              while sending timely warranty alerts.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center lg:justify-start mb-8 sm:mb-12">
              <button 
                onClick={onShowSignUp}
                className="bg-gradient-primary text-white px-6 sm:px-8 py-3 sm:py-4 rounded-lg font-medium text-base sm:text-lg hover:opacity-90 transition-all duration-200 shadow-button hover:shadow-button-hover transform hover:-translate-y-1"
              >
                Start Free Trial
              </button>
              <a 
                href="https://youtu.be/wJ6iOkoH-pg"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center space-x-2 text-text-secondary hover:text-secondary transition-colors duration-200 px-4 sm:px-6 py-3 sm:py-4 rounded-lg border-2 border-gray-300 hover:border-secondary font-medium bg-white/90 backdrop-blur-sm text-sm sm:text-base"
              >
                <Play className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                <span className="truncate">Smart Receipts Explainer</span>
              </a>
            </div>

            {/* Trust Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 lg:gap-4 mt-6 sm:mt-8">
              {trustStats.map((stat, index) => (
                <div
                  key={index}
                  className="group relative bg-white p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-card hover:shadow-card-hover transition-all duration-300 transform hover:-translate-y-1 cursor-pointer border border-gray-100"
                >
                  <div className="flex items-center justify-center mb-2 sm:mb-3">
                    <div className="h-4 w-4 sm:h-6 sm:w-6">
                      {getStatIcon(index)}
                    </div>
                  </div>
                  <div className="text-lg sm:text-2xl font-bold text-text-primary mb-1">{stat.value}</div>
                  <div className="text-xs text-text-secondary font-medium leading-tight">{stat.label}</div>
                  
                  {/* Tooltip */}
                  <div className="absolute invisible group-hover:visible bg-text-primary text-white text-xs rounded-lg px-3 py-2 -mt-2 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 whitespace-nowrap z-10">
                    {stat.description}
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-text-primary"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column - Demo Video */}
          <div className="relative">
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-card p-4 sm:p-6 lg:p-8 relative overflow-hidden">
              {/* Background Pattern */}
              <div className="absolute inset-0 opacity-5">
                <div className="w-full h-full bg-gradient-to-br from-primary to-secondary"></div>
              </div>
              
              {/* Video Placeholder */}
              <div className="relative rounded-lg overflow-hidden aspect-video shadow-lg bg-gradient-to-br from-gray-900 to-gray-800">
                <iframe
                  src="https://www.youtube.com/embed/qWJCuc1kUoI"
                  title="Smart Receipts Demo"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  className="absolute inset-0 w-full h-full border-0"
                ></iframe>
              </div>
              
              {/* Feature Highlights */}
              <div className="mt-4 sm:mt-6 grid grid-cols-3 gap-2 sm:gap-4 text-center">
                <div className="p-2 sm:p-3">
                  <div className="text-lg sm:text-2xl font-bold text-secondary">AI</div>
                  <div className="text-xs sm:text-sm text-text-secondary">Powered</div>
                </div>
                <div className="p-2 sm:p-3">
                  <div className="text-lg sm:text-2xl font-bold text-primary">Secure</div>
                  <div className="text-xs sm:text-sm text-text-secondary">Encrypted</div>
                </div>
                <div className="p-2 sm:p-3">
                  <div className="text-lg sm:text-2xl font-bold text-accent-purple">Smart</div>
                  <div className="text-xs sm:text-sm text-text-secondary">Alerts</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;