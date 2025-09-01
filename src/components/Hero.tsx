import React from 'react';
import { Play } from 'lucide-react';

interface HeroProps {
  onShowLogin: () => void;
}

const Hero: React.FC<HeroProps> = ({ onShowLogin }) => {


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
              <a 
                href="https://docs.google.com/forms/d/e/1FAIpQLScD0r0uJ7lsegRhFL5gsdpdCIrsuuwBizPwPvu0sq6J2Pr0tg/viewform?usp=sharing&ouid=115412616738636624494"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white px-6 sm:px-8 py-3 sm:py-4 rounded-lg font-medium text-base sm:text-lg transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 text-center border border-primary/20 hover:border-primary/40"
              >
                Join Waitlist
              </a>
              <a 
                href="https://youtu.be/wJ6iOkoH-pg"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center space-x-2 text-text-secondary hover:text-primary transition-colors duration-300 px-4 sm:px-6 py-3 sm:py-4 rounded-lg border-2 border-gray-300 hover:border-primary font-medium bg-white/90 backdrop-blur-sm text-sm sm:text-base hover:bg-primary/5"
              >
                <Play className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                <span className="truncate">Smart Receipts Explainer</span>
              </a>
            </div>


          </div>

          {/* Right Column - Demo Video */}
          <div className="relative">
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-card p-2 sm:p-3 lg:p-4 relative overflow-hidden">
              {/* Background Pattern */}
              <div className="absolute inset-0 opacity-5">
                <div className="w-full h-full bg-gradient-to-br from-primary to-secondary"></div>
              </div>
              
              {/* Video - Bigger Size */}
              <div className="relative rounded-lg overflow-hidden aspect-video shadow-lg bg-gradient-to-br from-gray-900 to-gray-800">
                <iframe
                  src="https://www.youtube.com/embed/qWJCuc1kUoI?autoplay=1&loop=1&playlist=qWJCuc1kUoI&mute=1"
                  title="Smart Receipts Demo"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  className="absolute inset-0 w-full h-full border-0"
                ></iframe>
              </div>
            </div>
            
            {/* Feature Highlights - Unified Box */}
            <div className="mt-4 sm:mt-6">
              <div className="bg-white/95 backdrop-blur-sm rounded-xl p-4 sm:p-6 shadow-card border border-gray-100">
                <div className="grid grid-cols-3 gap-4 sm:gap-8 text-center">
                  <div className="flex flex-col items-center">
                    <div className="text-2xl sm:text-3xl font-bold text-secondary mb-2">AI</div>
                    <div className="text-sm sm:text-base text-text-secondary font-medium">Powered</div>
                  </div>
                  <div className="flex flex-col items-center border-l border-r border-gray-200 px-2">
                    <div className="text-2xl sm:text-3xl font-bold text-primary mb-2">Secure</div>
                    <div className="text-sm sm:text-base text-text-secondary font-medium">Encrypted</div>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="text-2xl sm:text-3xl font-bold text-accent-purple mb-2">Smart</div>
                    <div className="text-sm sm:text-base text-text-secondary font-medium">Alerts</div>
                  </div>
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