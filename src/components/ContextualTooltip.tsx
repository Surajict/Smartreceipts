import React, { useState, useRef, useEffect } from 'react';
import { HelpCircle, X, Info } from 'lucide-react';

interface ContextualTooltipProps {
  title: string;
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  trigger?: 'hover' | 'click';
  icon?: 'help' | 'info';
  className?: string;
  maxWidth?: string;
}

const ContextualTooltip: React.FC<ContextualTooltipProps> = ({
  title,
  content,
  position = 'top',
  trigger = 'hover',
  icon = 'help',
  className = '',
  maxWidth = '280px'
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isVisible && triggerRef.current && tooltipRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      
      // Mobile-responsive sizing
      const isMobile = window.innerWidth < 768;
      const responsiveMaxWidth = isMobile ? Math.min(280, window.innerWidth - 32) : parseInt(maxWidth);
      
      let style: React.CSSProperties = {
        maxWidth: `${responsiveMaxWidth}px`,
        position: 'fixed',
        zIndex: 1000
      };

      // On mobile, prefer bottom positioning
      const effectivePosition = isMobile ? 'bottom' : position;

      // Calculate position based on trigger element
      switch (effectivePosition) {
        case 'top':
          style.bottom = window.innerHeight - triggerRect.top + 8;
          style.left = triggerRect.left + (triggerRect.width / 2) - (responsiveMaxWidth / 2);
          break;
        case 'bottom':
          style.top = triggerRect.bottom + 8;
          style.left = triggerRect.left + (triggerRect.width / 2) - (responsiveMaxWidth / 2);
          break;
        case 'left':
          style.right = window.innerWidth - triggerRect.left + 8;
          style.top = triggerRect.top + (triggerRect.height / 2) - 50;
          break;
        case 'right':
          style.left = triggerRect.right + 8;
          style.top = triggerRect.top + (triggerRect.height / 2) - 50;
          break;
      }

      // Ensure tooltip stays within viewport with mobile-friendly margins
      const margin = isMobile ? 12 : 16;
      if (style.left && (style.left as number) < margin) {
        style.left = margin;
      }
      if (style.left && (style.left as number) + responsiveMaxWidth > window.innerWidth - margin) {
        style.left = window.innerWidth - responsiveMaxWidth - margin;
      }
      if (style.top && (style.top as number) < margin) {
        style.top = margin;
      }

      setTooltipStyle(style);
    }
  }, [isVisible, position, maxWidth]);

  // Close tooltip when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        tooltipRef.current &&
        triggerRef.current &&
        !tooltipRef.current.contains(event.target as Node) &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsVisible(false);
      }
    };

    if (isVisible) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isVisible]);

  const IconComponent = icon === 'help' ? HelpCircle : Info;

  const handleTrigger = () => {
    if (trigger === 'click') {
      setIsVisible(!isVisible);
    }
  };

  const handleMouseEnter = () => {
    if (trigger === 'hover') {
      setIsVisible(true);
    }
  };

  const handleMouseLeave = () => {
    if (trigger === 'hover') {
      setIsVisible(false);
    }
  };

  return (
    <>
      <button
        ref={triggerRef}
        onClick={handleTrigger}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`inline-flex items-center justify-center text-text-secondary hover:text-primary transition-colors duration-200 ${className}`}
        aria-label="Help"
      >
        <IconComponent className="h-4 w-4" />
      </button>

      {isVisible && (
        <div
          ref={tooltipRef}
          style={tooltipStyle}
          className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 md:p-4 z-50"
          onMouseEnter={() => trigger === 'hover' && setIsVisible(true)}
          onMouseLeave={() => trigger === 'hover' && setIsVisible(false)}
        >
          {/* Arrow */}
          <div
            className={`absolute w-3 h-3 bg-white border transform rotate-45 ${
              position === 'top' 
                ? 'top-full -translate-y-1/2 border-r-0 border-b-0' 
                : position === 'bottom'
                ? 'bottom-full translate-y-1/2 border-l-0 border-t-0'
                : position === 'left'
                ? 'left-full -translate-x-1/2 border-r-0 border-b-0'
                : 'right-full translate-x-1/2 border-l-0 border-t-0'
            }`}
            style={{
              left: position === 'top' || position === 'bottom' ? '50%' : undefined,
              top: position === 'left' || position === 'right' ? '50%' : undefined,
              transform: `translate(${
                position === 'top' || position === 'bottom' ? '-50%' : 
                position === 'left' ? '50%' : '-50%'
              }, ${
                position === 'top' ? '50%' : 
                position === 'bottom' ? '-50%' : 
                position === 'left' || position === 'right' ? '-50%' : '0'
              }) rotate(45deg)`
            }}
          />

          {/* Content */}
          <div className="relative">
            <div className="flex items-start justify-between mb-2">
              <h4 className="font-semibold text-text-primary text-xs md:text-sm pr-2 leading-tight">
                {title}
              </h4>
              {trigger === 'click' && (
                <button
                  onClick={() => setIsVisible(false)}
                  className="text-text-secondary hover:text-text-primary transition-colors flex-shrink-0 p-0.5"
                >
                  <X className="h-3 w-3 md:h-4 md:w-4" />
                </button>
              )}
            </div>
            <p className="text-text-secondary text-xs md:text-sm leading-relaxed">
              {content}
            </p>
          </div>
        </div>
      )}
    </>
  );
};

export default ContextualTooltip; 