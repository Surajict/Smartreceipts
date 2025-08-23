import React from 'react';
import { Shield, CreditCard, RotateCcw, Lock, Award, Clock } from 'lucide-react';

interface CTAProps {
  onShowLogin: () => void;
}

const CTA: React.FC<CTAProps> = ({ onShowLogin }) => {
  const trustBadges = [
    { icon: CreditCard, text: 'No credit card required' },
    { icon: RotateCcw, text: 'Cancel anytime' },
    { icon: Lock, text: 'Bank-level security' },
    { icon: Award, text: '30-day money-back guarantee' }
  ];

  return (
    <section className="py-20 bg-gradient-to-br from-primary via-secondary to-accent-purple relative overflow-hidden shadow-inner">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-12">
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6 tracking-tight">
            Ready to Never Lose Another Receipt?
          </h2>
          {/* Main marketing message highlighting user base and value proposition.
              Emphasizes social proof (50k+ users), key benefits (warranty claims),
              and reduces friction (no credit card required) 
          <p className="text-xl text-white/90 max-w-3xl mx-auto leading-relaxed">
            Join 50,000+ users who've transformed their receipt management and recovered 
            thousands in warranty claims. Start your free account today – no credit card required.
          </p>*/}
        </div>

        {/* Main CTA */}
        <div className="text-center mb-12">
          <a 
            href="https://docs.google.com/forms/d/e/1FAIpQLScD0r0uJ7lsegRhFL5gsdpdCIrsuuwBizPwPvu0sq6J2Pr0tg/viewform?usp=sharing&ouid=115412616738636624494"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-white text-primary px-12 py-6 rounded-2xl font-bold text-xl hover:bg-gray-100 transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:-translate-y-2 hover:scale-105"
          >
            Join Waitlist
          </a>
        </div>

                 {/* Trust Badges - Commented out as requested */}
         {/*
         <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
           {trustBadges.map((badge, index) => {
             const Icon = badge.icon;
             return (
               <div 
                 key={index}
                 className="flex items-center justify-center space-x-3 bg-white/10 backdrop-blur-sm rounded-xl p-4 text-white hover:bg-white/20 transition-colors duration-300 border border-white/10"
               >
                 <Icon className="h-5 w-5 text-white/80" />
                 <span className="font-medium text-sm">{badge.text}</span>
               </div>
             );
           })}
         </div>
         */}

                 {/* Urgency Element - Commented out as requested */}
         {/*
         <div className="text-center mb-8">
           <div className="bg-gradient-to-r from-accent-yellow to-accent-red rounded-full px-8 py-3 inline-block shadow-lg">
             <div className="flex items-center space-x-2">
               <Clock className="h-5 w-5 text-text-primary" />
               <span className="font-bold text-text-primary">Limited Time: Get 3 Months Premium Free</span>
             </div>
           </div>
           <p className="text-white/90 mt-4 max-w-2xl mx-auto">
             New users who sign up this month receive complimentary premium features including 
             unlimited receipt storage, advanced analytics, and priority warranty support.
           </p>
         </div>

         {/* Additional CTA Options */}
         {/*
         <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
           <button className="bg-transparent border-2 border-white text-white px-8 py-4 rounded-xl font-medium hover:bg-white hover:text-primary transition-all duration-300 shadow-sm hover:shadow-md">
             Watch 2-Minute Demo
           </button>
           <button className="bg-transparent border-2 border-white text-white px-8 py-4 rounded-xl font-medium hover:bg-white hover:text-primary transition-all duration-300 shadow-sm hover:shadow-md">
             Talk to Sales Team
           </button>
         </div>
         */}

        {/* Privacy Assurance */}
        <div className="text-center">
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 max-w-4xl mx-auto border border-white/20 shadow-lg">
            <div className="flex items-center justify-center mb-4">
              <Shield className="h-6 w-6 text-white/80 mr-2" />
              <span className="font-bold text-white">Your Privacy is Protected</span>
            </div>
            <p className="text-white/90 text-sm leading-relaxed">
              We never share your personal information. Your receipts are encrypted with bank-level 
              security and stored in SOC 2 certified data centers. You maintain complete control over your data.
            </p>
            
            {/* Security Badges */}
            <div className="flex justify-center space-x-8 mt-6">
              <div className="text-center">
                <div className="bg-white/10 rounded-lg p-3 mb-2">
                  <Shield className="h-6 w-6 text-white/80 mx-auto" />
                </div>
                <span className="text-xs text-white/80">SOC 2 Certified</span>
              </div>
              <div className="text-center">
                <div className="bg-white/10 rounded-lg p-3 mb-2">
                  <Lock className="h-6 w-6 text-white/80 mx-auto" />
                </div>
                <span className="text-xs text-white/80">AES-256 Encryption</span>
              </div>
              <div className="text-center">
                <div className="bg-white/10 rounded-lg p-3 mb-2">
                  <Award className="h-6 w-6 text-white/80 mx-auto" />
                </div>
                <span className="text-xs text-white/80">APP Compliant</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTA;