import React from 'react';
import { Camera, Cpu, Bell } from 'lucide-react';
import { Step } from '../types';

interface HowItWorksProps {}

const HowItWorks: React.FC<HowItWorksProps> = () => {
  const steps: Step[] = [
    {
      number: 1,
      title: 'Scan Receipt',
      description: 'Take a photo of your receipt, AI processes the data with high accuracy.'
    },
    {
      number: 2,
      title: 'Process Receipt',
      description: 'AI instantly extracts and organizes all details including item, brand, and warranty period.'
    },
    {
      number: 3,
      title: 'Track Warranty',
      description: 'AI registers warranties on your behalf and sends smart alerts to ensure efficient claim process.'
    }
  ];

  const getIcon = (stepNumber: number) => {
    const icons = [Camera, Cpu, Bell];
    const Icon = icons[stepNumber - 1];
    return <Icon className="h-full w-full text-white" />;
  };

  return (
    <section id="how-it-works" className="py-12 sm:py-16 lg:py-20 bg-gradient-to-b from-background to-white">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8">
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-text-primary mb-4 tracking-tight">
            From Chaos to Organized in{' '}
            <span className="text-primary">3 Simple Steps</span>
          </h2>
          <p className="text-base sm:text-lg lg:text-xl text-text-secondary max-w-3xl mx-auto">
            Our streamlined process makes receipt management effortless, 
            turning your paper clutter into a smart digital system.
          </p>
        </div>

        <div className="relative">
          {/* Connection Lines - Desktop */}
          <div className="hidden lg:block absolute top-1/2 left-1/4 right-1/4 h-1 bg-gradient-to-r from-primary to-secondary transform -translate-y-1/2 z-0 rounded-full opacity-70"></div>
          
          <div className="grid md:grid-cols-3 gap-6 sm:gap-8 lg:gap-12 relative z-10">
            {steps.map((step, index) => (
              <div key={step.number} className="text-center group">
                {/* Step Circle */}
                <div className="relative mb-6 sm:mb-8">
                  <div className="bg-gradient-to-br from-primary to-secondary rounded-full w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center mx-auto shadow-lg group-hover:shadow-xl transition-all duration-300 transform group-hover:scale-110">
                    <div className="h-6 w-6 sm:h-8 sm:w-8">
                      {getIcon(step.number)}
                    </div>
                  </div>
                  
                  {/* Step Number Badge */}
                  <div className="absolute -bottom-2 -right-2 bg-white border-4 border-primary rounded-full w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-primary font-bold text-xs sm:text-sm shadow-lg">
                    {step.number}
                  </div>
                </div>

                {/* Content */}
                <div className="bg-white p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-card group-hover:shadow-card-hover transition-all duration-300 transform group-hover:-translate-y-2">
                  <h3 className="text-lg sm:text-xl font-bold text-text-primary mb-3 sm:mb-4 group-hover:text-primary transition-colors duration-300">
                    {step.title}
                  </h3>
                  
                  <p className="text-sm sm:text-base text-text-secondary leading-relaxed">
                    {step.description}
                  </p>
                </div>

                {/* Arrow - Mobile */}
                {index < steps.length - 1 && (
                  <div className="lg:hidden flex justify-center mt-8 mb-4">
                    <div className="bg-primary rounded-full p-2">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                      </svg>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;