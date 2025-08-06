import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Play, CheckCircle, ArrowDown, ArrowUp, ArrowLeft, ArrowRight } from 'lucide-react';

interface TourStep {
  id: string;
  title: string;
  content: string;
  target: string; // CSS selector for the element to highlight
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
  action?: string; // Optional action text
  scrollToTarget?: boolean; // Whether to scroll the target into view
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
    action: 'Start Tour',
    scrollToTarget: true
  },
  {
    id: 'scan-receipt',
    title: 'Scan Your First Receipt',
    content: 'This is where the magic happens! Click here to scan or upload your receipts. Our AI will extract all the important information automatically.',
    target: '[data-tour="scan-receipt"]',
    position: 'bottom',
    action: 'Next',
    scrollToTarget: true
  },
  {
    id: 'my-library',
    title: 'Your Receipt Library',
    content: 'All your scanned receipts are organized here. Search, filter, and manage your purchase history with ease.',
    target: '[data-tour="my-library"]',
    position: 'bottom',
    scrollToTarget: true
  },
  {
    id: 'warranty-manager',
    title: 'Never Miss a Warranty',
    content: 'Smart Receipts automatically tracks warranty periods and sends you alerts before they expire. No more missed claims!',
    target: '[data-tour="warranty-manager"]',
    position: 'bottom',
    scrollToTarget: true
  },
  {
    id: 'stats-overview',
    title: 'Your Purchase Analytics',
    content: 'Get insights into your spending habits with automatically calculated statistics from your receipts.',
    target: '[data-tour="stats-overview"]',
    position: 'top',
    scrollToTarget: true
  },
  {
    id: 'smart-search',
    title: 'AI-Powered Smart Search',
    content: 'Ask questions about your receipts in natural language! Try "How much did I spend on electronics?" or "Show me Apple products".',
    target: '[data-tour="smart-search"]',
    position: 'top',
    action: 'Next',
    scrollToTarget: true
  },
  {
    id: 'notifications',
    title: 'Stay Informed',
    content: 'Important warranty alerts and system notifications appear here. Never miss an important update!',
    target: '[data-tour="notifications"]',
    position: 'bottom',
    scrollToTarget: true
  }
];

const OnboardingTour: React.FC<OnboardingTourProps> = ({ isActive, onComplete, onSkip }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [highlightElement, setHighlightElement] = useState<HTMLElement | null>(null);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
  const [isScrolling, setIsScrolling] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const scrollToElement = useCallback((element: HTMLElement) => {
    if (!element) return;
    
    setIsScrolling(true);
    
    // Calculate the position to center the element in the viewport
    const elementRect = element.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const targetScrollY = window.scrollY + elementRect.top - (viewportHeight / 2) + (elementRect.height / 2);
    
    // Smooth scroll to the target position
    window.scrollTo({
      top: Math.max(0, targetScrollY),
      behavior: 'smooth'
    });
    
    // Wait for scroll to complete
    setTimeout(() => {
      setIsScrolling(false);
    }, 800);
  }, []);

  const updateHighlight = useCallback(() => {
    if (!isActive || isScrolling) return;
    
    const step = tourSteps[currentStep];
    if (!step) return;

    const element = document.querySelector(step.target) as HTMLElement;
    if (!element) {
      console.warn(`Tour target not found: ${step.target}`);
      return;
    }

    setHighlightElement(element);

    // Scroll to element if needed
    if (step.scrollToTarget) {
      scrollToElement(element);
    }

    // Calculate tooltip position
    setTimeout(() => {
      const rect = element.getBoundingClientRect();
      const tooltipEl = tooltipRef.current;
      if (!tooltipEl) return;

      const tooltipRect = tooltipEl.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      let top = 0;
      let left = 0;
      
      // Calculate position based on step position and available space
      switch (step.position) {
        case 'top':
          top = rect.top - tooltipRect.height - 20;
          left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
          break;
        case 'bottom':
          top = rect.bottom + 20;
          left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
          break;
        case 'left':
          top = rect.top + (rect.height / 2) - (tooltipRect.height / 2);
          left = rect.left - tooltipRect.width - 20;
          break;
        case 'right':
          top = rect.top + (rect.height / 2) - (tooltipRect.height / 2);
          left = rect.right + 20;
          break;
        case 'center':
          top = viewportHeight / 2 - tooltipRect.height / 2;
          left = viewportWidth / 2 - tooltipRect.width / 2;
          break;
      }

      // Ensure tooltip stays within viewport bounds
      if (left < 10) left = 10;
      if (left + tooltipRect.width > viewportWidth - 10) {
        left = viewportWidth - tooltipRect.width - 10;
      }
      if (top < 10) top = 10;
      if (top + tooltipRect.height > viewportHeight - 10) {
        top = viewportHeight - tooltipRect.height - 10;
      }

      setTooltipStyle({
        position: 'fixed',
        top: `${top}px`,
        left: `${left}px`,
        zIndex: 10001,
      });
    }, 100);
  }, [isActive, currentStep, isScrolling, scrollToElement]);

  useEffect(() => {
    if (isActive) {
      document.body.style.overflow = 'auto'; // Allow scrolling during tour
      updateHighlight();
    } else {
      document.body.style.overflow = '';
      setHighlightElement(null);
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isActive, currentStep, updateHighlight]);

  // Handle window resize and scroll
  useEffect(() => {
    if (!isActive) return;

    const handleResize = () => {
      setTimeout(updateHighlight, 100);
    };

    const handleScroll = () => {
      if (!isScrolling) {
        setTimeout(updateHighlight, 50);
      }
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [isActive, updateHighlight, isScrolling]);

  const nextStep = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    setCurrentStep(0);
    setHighlightElement(null);
    onSkip();
  };

  const getPositionIcon = (position: string) => {
    switch (position) {
      case 'top': return <ArrowUp className="h-4 w-4" />;
      case 'bottom': return <ArrowDown className="h-4 w-4" />;
      case 'left': return <ArrowLeft className="h-4 w-4" />;
      case 'right': return <ArrowRight className="h-4 w-4" />;
      default: return <Play className="h-4 w-4" />;
    }
  };

  if (!isActive) return null;

  const step = tourSteps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === tourSteps.length - 1;

  return (
    <>
      {/* Overlay */}
      <div
        ref={overlayRef}
        className="fixed inset-0 bg-black/60 z-10000 transition-opacity duration-300"
        style={{ zIndex: 10000 }}
      >
        {/* Highlight cutout */}
        {highlightElement && (
          <div
            className="absolute border-4 border-primary rounded-lg transition-all duration-300 pointer-events-none"
            style={{
              top: highlightElement.getBoundingClientRect().top - 8,
              left: highlightElement.getBoundingClientRect().left - 8,
              width: highlightElement.getBoundingClientRect().width + 16,
              height: highlightElement.getBoundingClientRect().height + 16,
              boxShadow: `
                0 0 0 4px rgba(0, 196, 140, 0.3),
                0 0 0 9999px rgba(0, 0, 0, 0.6)
              `,
              zIndex: 10001,
            }}
          />
        )}
      </div>

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className="fixed bg-white rounded-xl shadow-2xl border border-gray-200 p-4 sm:p-6 max-w-sm sm:max-w-md mx-4 transition-all duration-300"
        style={tooltipStyle}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-2 flex-1 min-w-0">
            <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
              {getPositionIcon(step.position)}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 truncate">
                {step.title}
              </h3>
              <div className="flex items-center space-x-2 mt-1">
                <span className="text-xs text-gray-500">
                  Step {currentStep + 1} of {tourSteps.length}
                </span>
                <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                  <div
                    className="bg-primary h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${((currentStep + 1) / tourSteps.length) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
          <button
            onClick={handleSkip}
            className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 transition-colors duration-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="mb-6">
          <p className="text-sm sm:text-base text-gray-700 leading-relaxed">
            {step.content}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between space-x-3">
          <div className="flex items-center space-x-2">
            {!isFirstStep && (
              <button
                onClick={prevStep}
                className="flex items-center space-x-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors duration-200"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Back</span>
              </button>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleSkip}
              className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors duration-200"
            >
              Skip Tour
            </button>
            <button
              onClick={nextStep}
              className="flex items-center space-x-2 bg-primary text-white px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors duration-200 text-sm"
            >
              <span>
                {isFirstStep && step.action ? step.action : 
                 isLastStep ? 'Complete Tour' : 
                 step.action || 'Next'}
              </span>
              {!isLastStep && <ChevronRight className="h-4 w-4" />}
              {isLastStep && <CheckCircle className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default OnboardingTour;