import React from 'react';
import { Brain, Shield, Headphones, Smartphone } from 'lucide-react';
import { Benefit } from '../types';

interface BenefitsProps {
  onShowLogin: () => void;
  onShowSignUp: () => void;
}

const Benefits: React.FC<BenefitsProps> = ({ onShowLogin, onShowSignUp }) => {
  const benefits: Benefit[] = [
    {
      icon: 'Brain',
      title: 'AI Powered Receipt Digitization',
      description: 'Advanced technology instantly converts your physical receipt into a searchable digital record.'
    },
    {
      icon: 'Shield',
      title: 'Complete Warranty Management',
      description: 'Automatic warranty registration, tracking, and smart notifications before warranties expire.'
    },
    {
      icon: 'Headphones',
      title: 'Customer Care Support',
      description: 'Expert assistance with warranty claims, manufacturer contacts, and full support throughout the process.'
    },
    {
      icon: 'Smartphone',
      title: 'Access Your Receipts Everywhere',
      description: 'Access your complete receipt archive from any device with end-to-end encrypted security.'
    }
  ];

  const getIcon = (iconName: string) => {
    const icons = {
      Brain: Brain,
      Shield: Shield,
      Headphones: Headphones,
      Smartphone: Smartphone
    };
    const Icon = icons[iconName as keyof typeof icons];
    return <Icon className="h-12 w-12 text-secondary" />;
  };

  return (
    <section id="features" className="py-20 bg-white relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5 pointer-events-none">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%2300C48C' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}></div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-text-primary mb-4 tracking-tight">
            Everything You Need to Manage Receipts Smartly
          </h2>
          <p className="text-xl text-text-secondary max-w-3xl mx-auto">
            Our comprehensive platform combines cutting-edge AI technology with user-friendly features 
            to revolutionize how you handle receipts and warranties.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {benefits.map((benefit, index) => (
            <div
              key={index}
              className="group bg-white p-8 rounded-2xl shadow-card border border-gray-100 hover:shadow-card-hover hover:border-primary/20 transition-all duration-300 transform hover:-translate-y-2 backdrop-blur-sm"
            >
              <div className="bg-gradient-feature rounded-xl p-4 w-fit mb-6 group-hover:scale-110 transition-transform duration-300 shadow-sm">
                {getIcon(benefit.icon)}
              </div>
              
              <h3 className="text-xl font-bold text-text-primary mb-4 group-hover:text-primary transition-colors duration-300">
                {benefit.title}
              </h3>
              
              <p className="text-text-secondary leading-relaxed">
                {benefit.description}
              </p>

              {/* Hover Effect Gradient */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-16">
          <button 
            onClick={onShowSignUp}
            className="bg-gradient-primary text-white px-8 py-4 rounded-lg font-medium text-lg hover:opacity-90 transition-all duration-200 shadow-button hover:shadow-button-hover transform hover:-translate-y-1"
          >
            Try All Features Free
          </button>
        </div>
      </div>
    </section>
  );
};

export default Benefits;