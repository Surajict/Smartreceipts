import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, Play, CheckCircle } from 'lucide-react';

interface TourStep {
  id: string;
  title: string;
  content: string;
  target: string; // CSS selector for the element to highlight
  position: 'top' | 'bottom' | 'left' | 'right';
  action?: string; // Optional action text
}

interface OnboardingTourProps {
  isActive: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

const tourSteps: TourStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Smart Receipts! 🎉',
    content: 'Let\'s take a quick tour to help you get started with managing your receipts and warranties like a pro!',
    target: '[data-tour="welcome-section"]',
    position: 'bottom',
    action: 'Start Tour'
  },
  {
    id: 'usage-indicator',
    title: 'Track Your Usage',
    content: 'Keep an eye on your receipt scanning usage. Free users get 5 receipts to try the service, then upgrade to Premium for unlimited scanning.',
    target: '[data-tour="usage-indicator"]',
    position: 'bottom'
  },
  {
    id: 'scan-receipt',
    title: 'Scan Your First Receipt',
    content: 'This is where the magic happens! Click here to scan or upload your receipts. Our AI will extract all the important information automatically.',
    target: '[data-tour="scan-receipt"]',
    position: 'bottom',
    action: 'Try Scanning'
  },
  {
    id: 'my-library',
    title: 'Your Receipt Library',
    content: 'All your scanned receipts are organized here. Search, filter, and manage your purchase history with ease.',
    target: '[data-tour="my-library"]',
    position: 'bottom'
  },
  {
    id: 'warranty-manager',
    title: 'Never Miss a Warranty',
    content: 'Smart Receipts automatically tracks warranty periods and sends you alerts before they expire. No more missed claims!',
    target: '[data-tour="warranty-manager"]',
    position: 'bottom'
  },
  {
    id: 'smart-search',
    title: 'AI-Powered Smart Search',
    content: 'Ask questions about your receipts in natural language! Try "How much did I spend on electronics?" or "Show me Apple products".',
    target: '[data-tour="smart-search"]',
    position: 'top',
    action: 'Try Search'
  },
  {
    id: 'stats-overview',
    title: 'Your Purchase Analytics',
    content: 'Get insights into your spending habits with automatically calculated statistics from your receipts.',
    target: '[data-tour="stats-overview"]',
    position: 'top'
  },
  {
    id: 'notifications',
    title: 'Stay Informed',
    content: 'Important warranty alerts and system notifications appear here. Never miss an important update!',
    target: '[data-tour="notifications"]',
    position: 'bottom'
  }
];

const OnboardingTour: React.FC<OnboardingTourProps> = ({ isActive, onComplete, onSkip }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [highlightElement, setHighlightElement] = useState<HTMLElement | null>(null);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isActive) {
      document.body.style.overflow = 'hidden';
      updateHighlight();
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isActive, currentStep]);

  // Handle window resize for mobile orientation changes
  useEffect(() => {
    if (isActive) {
      const handleResize = () => {
        setTimeout(updateHighlight, 100); // Small delay to allow layout to settle
      };

      window.addEventListener('resize', handleResize);
      window.addEventListener('orientationchange', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('orientationchange', handleResize);
      };
    }
  }, [isActive, currentStep]);

  const updateHighlight = () => {
    const step = tourSteps[currentStep];
    const element = document.querySelector(step.target) as HTMLElement;
    
    if (element) {
      setHighlightElement(element);
      
      // Calculate tooltip position with responsive sizing
      const rect = element.getBoundingClientRect();
      const isMobile = window.innerWidth < 768; // Tailwind md breakpoint
      const tooltipWidth = isMobile ? Math.min(320, window.innerWidth - 32) : 400;
      const tooltipHeight = isMobile ? 250 : 200;
      
      let style: React.CSSProperties = {};
      
      // On mobile, prefer bottom positioning for better usability, with exceptions for specific steps
      const position = isMobile && step.id !== 'smart-search' && step.id !== 'stats-overview' ? 'bottom' : step.position;
      
      switch (position) {
        case 'top':
          style = {
            top: rect.top - tooltipHeight - 20,
            left: rect.left + (rect.width / 2) - (tooltipWidth / 2),
          };
          break;
        case 'bottom':
          style = {
            top: rect.bottom + 20,
            left: rect.left + (rect.width / 2) - (tooltipWidth / 2),
          };
          break;
        case 'left':
          style = {
            top: rect.top + (rect.height / 2) - (tooltipHeight / 2),
            left: rect.left - tooltipWidth - 20,
          };
          break;
        case 'right':
          style = {
            top: rect.top + (rect.height / 2) - (tooltipHeight / 2),
            left: rect.right + 20,
          };
          break;
      }
      
      // Ensure tooltip stays within viewport with mobile-friendly margins
      const margin = isMobile ? 16 : 20;
      if (style.left! < margin) style.left = margin;
      if (style.left! + tooltipWidth > window.innerWidth - margin) {
        style.left = window.innerWidth - tooltipWidth - margin;
      }
      if (style.top! < margin) style.top = margin;
      if (style.top! + tooltipHeight > window.innerHeight - margin) {
        style.top = window.innerHeight - tooltipHeight - margin;
      }
      
      // On mobile, if tooltip would be too close to bottom, move it up
      if (isMobile && style.top! + tooltipHeight > window.innerHeight - 100) {
        style.top = Math.max(margin, rect.top - tooltipHeight - 20);
      }
      
      // Special handling for Smart Search on mobile - ensure it's visible
      if (isMobile && step.id === 'smart-search') {
        // If the Smart Search section is large, position tooltip at the top of viewport with margin
        if (rect.height > 200) {
          style.top = margin + 60; // Account for mobile header height
          style.left = margin;
          style.right = 'auto';
        }
      }
      
      // Special handling for Stats Overview on mobile - handle wide grid layout
      if (isMobile && step.id === 'stats-overview') {
        // For wide grid layouts, position tooltip at the center but ensure it's visible
        if (rect.width > window.innerWidth * 0.8) {
          // Grid is very wide, center the tooltip and adjust for better visibility
          style.left = margin;
          style.right = 'auto';
          // Position above the grid with some spacing
          style.top = Math.max(margin + 60, rect.top - tooltipHeight - 30);
        }
      }
      
      setTooltipStyle(style);
    }
  };

  const nextStep = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeTour();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const completeTour = () => {
    onComplete();
    setCurrentStep(0);
  };

  const skipTour = () => {
    onSkip();
    setCurrentStep(0);
  };

  if (!isActive) return null;

  const step = tourSteps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === tourSteps.length - 1;

  return (
    <div className="fixed inset-0 z-50">
      {/* Overlay with highlight cutout */}
      <div 
        ref={overlayRef}
        className="absolute inset-0 bg-black/70"
        style={{
          background: highlightElement 
            ? (() => {
                const rect = highlightElement.getBoundingClientRect();
                const centerX = rect.left + rect.width/2;
                const centerY = rect.top + rect.height/2;
                const isMobile = window.innerWidth < 768;
                
                // For large elements on mobile, use appropriate radius calculation
                let radius;
                if (isMobile) {
                  if (rect.width > 300) {
                    // For wide elements like Smart Search or Stats Grid
                    if (rect.width > rect.height * 2) {
                      // Very wide element (like stats grid) - use height-based radius
                      radius = rect.height / 2 + 30;
                    } else {
                      // Moderately wide element - use conservative radius
                      radius = Math.min(rect.width, rect.height) / 2 + 20;
                    }
                  } else {
                    radius = Math.max(rect.width, rect.height) / 2 + 10;
                  }
                } else {
                  radius = Math.max(rect.width, rect.height) / 2 + 10;
                }
                
                return `radial-gradient(circle at ${centerX}px ${centerY}px, transparent ${radius}px, rgba(0,0,0,0.7) ${radius + 10}px)`;
              })()
            : 'rgba(0,0,0,0.7)'
        }}
      />
      
      {/* Highlight border */}
      {highlightElement && (
        <div
          className="absolute border-2 md:border-4 border-primary rounded-lg animate-pulse"
          style={{
            top: highlightElement.getBoundingClientRect().top - (window.innerWidth < 768 ? 2 : 4),
            left: highlightElement.getBoundingClientRect().left - (window.innerWidth < 768 ? 2 : 4),
            width: highlightElement.getBoundingClientRect().width + (window.innerWidth < 768 ? 4 : 8),
            height: highlightElement.getBoundingClientRect().height + (window.innerWidth < 768 ? 4 : 8),
            pointerEvents: 'none'
          }}
        />
      )}

      {/* Tooltip */}
      <div
        className="absolute bg-white rounded-xl shadow-2xl p-4 md:p-6 max-w-sm md:max-w-md z-10 border-2 border-primary/20"
        style={tooltipStyle}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3 md:mb-4">
          <div className="flex items-center space-x-2 md:space-x-3">
            <div className="bg-primary/10 rounded-full p-1.5 md:p-2">
              <Play className="h-3 w-3 md:h-4 md:w-4 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-text-primary text-base md:text-lg">{step.title}</h3>
              <p className="text-xs text-text-secondary">
                Step {currentStep + 1} of {tourSteps.length}
              </p>
            </div>
          </div>
          <button
            onClick={skipTour}
            className="text-text-secondary hover:text-text-primary transition-colors p-1"
          >
            <X className="h-4 w-4 md:h-5 md:w-5" />
          </button>
        </div>

        {/* Content */}
        <p className="text-text-secondary mb-4 md:mb-6 leading-relaxed text-sm md:text-base">
          {step.content}
        </p>

        {/* Progress bar */}
        <div className="mb-4 md:mb-6">
          <div className="flex justify-between text-xs text-text-secondary mb-2">
            <span>Progress</span>
            <span>{Math.round(((currentStep + 1) / tourSteps.length) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5 md:h-2">
            <div 
              className="bg-gradient-to-r from-primary to-secondary h-1.5 md:h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentStep + 1) / tourSteps.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between space-y-2 md:space-y-0">
          <div className="flex items-center space-x-2">
            {!isFirstStep && (
              <button
                onClick={prevStep}
                className="flex items-center space-x-2 px-3 md:px-4 py-2 text-text-secondary hover:text-primary transition-colors text-sm"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Back</span>
              </button>
            )}
          </div>

          <div className="flex items-center justify-between md:justify-end space-x-2 md:space-x-3">
            <button
              onClick={skipTour}
              className="text-text-secondary hover:text-primary transition-colors text-sm px-2 py-1"
            >
              Skip Tour
            </button>
            
            <button
              onClick={nextStep}
              className="bg-gradient-to-r from-primary to-secondary text-white px-4 md:px-6 py-2 rounded-lg font-semibold hover:shadow-lg transition-all duration-200 flex items-center space-x-2 text-sm md:text-base flex-1 md:flex-none justify-center"
            >
              {isLastStep ? (
                <>
                  <CheckCircle className="h-4 w-4" />
                  <span>Finish</span>
                </>
              ) : (
                <>
                  <span>{step.action || 'Next'}</span>
                  <ChevronRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingTour; 