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
      value: '50,000+',
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
    return <Icon className="h-6 w-6 text-secondary" />;
  };

  return (
    <section className="bg-background pt-20 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Column - Content */}
          <div className="text-center lg:text-left">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-text-primary leading-tight mb-6">
              Never Lose a Receipt or{' '}
              <span className="text-primary">Miss a Warranty Claim</span> Again
            </h1>
            
            <p className="text-xl text-text-secondary mb-8 leading-relaxed">
              Smart Receipts uses AI to instantly scan, organize, and track your receipts 
              while sending timely warranty alerts.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-12">
              <button 
                onClick={onShowSignUp}
                className="bg-primary text-white px-8 py-4 rounded-lg font-medium text-lg hover:bg-primary/90 transition-all duration-200 shadow-card hover:shadow-card-hover transform hover:-translate-y-1"
              >
                Start Free Trial
              </button>
              <button className="flex items-center justify-center space-x-2 text-text-secondary hover:text-text-link transition-colors duration-200 px-6 py-4 rounded-lg border-2 border-gray-300 hover:border-secondary font-medium bg-white">
                <Play className="h-5 w-5" />
                <span>Watch Demo</span>
              </button>
            </div>

            {/* Trust Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              {trustStats.map((stat, index) => (
                <div
                  key={index}
                  className="group relative bg-white p-4 rounded-2xl shadow-card hover:shadow-card-hover transition-all duration-300 transform hover:-translate-y-1 cursor-pointer border border-gray-100"
                >
                  <div className="flex items-center justify-center mb-2">
                    {getStatIcon(index)}
                  </div>
                  <div className="text-2xl font-bold text-text-primary mb-1">{stat.value}</div>
                  <div className="text-sm text-text-secondary font-medium">{stat.label}</div>
                  
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
            <div className="bg-white rounded-2xl shadow-card p-8 relative overflow-hidden">
              {/* Background Pattern */}
              <div className="absolute inset-0 opacity-5">
                <div className="w-full h-full bg-gradient-to-br from-primary to-secondary"></div>
              </div>
              
              {/* Video Placeholder */}
              <div className="relative bg-gray-100 rounded-lg aspect-video flex items-center justify-center group cursor-pointer hover:bg-gray-200 transition-colors duration-200">
                <div className="text-center">
                  <div className="bg-primary rounded-full p-6 mb-4 group-hover:bg-primary/90 transition-colors duration-200 mx-auto w-fit">
                    <Play className="h-12 w-12 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-text-primary mb-2">
                    See Smart Receipts in Action
                  </h3>
                  <p className="text-text-secondary">
                    Watch our 30-second demo showing receipt scanning, warranty tracking, and claim support
                  </p>
                </div>
              </div>
              
              {/* Feature Highlights */}
              <div className="mt-6 grid grid-cols-3 gap-4 text-center">
                <div className="p-3">
                  <div className="text-2xl font-bold text-secondary">AI</div>
                  <div className="text-sm text-text-secondary">Powered</div>
                </div>
                <div className="p-3">
                  <div className="text-2xl font-bold text-primary">Secure</div>
                  <div className="text-sm text-text-secondary">Encrypted</div>
                </div>
                <div className="p-3">
                  <div className="text-2xl font-bold text-accent-purple">Smart</div>
                  <div className="text-sm text-text-secondary">Alerts</div>
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