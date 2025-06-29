import React from 'react';
import { Star } from 'lucide-react';
import { Testimonial } from '../types';

const Testimonials: React.FC = () => {
  const testimonials: Testimonial[] = [
    {
      name: 'Sarah Chen',
      role: 'Small Business Owner',
      company: 'TechStart Solutions',
      avatar: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
      rating: 5,
      content: 'Smart Receipt saved me over $1,200 in warranty claims last year. The AI is incredibly accurate and the alerts are perfectly timed.'
    },
    {
      name: 'Michael Rodriguez',
      role: 'IT Manager',
      company: 'Global Enterprises',
      avatar: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
      rating: 5,
      content: 'Managing receipts for our entire department was a nightmare until Smart Receipt. Now everything is organized and accessible instantly.'
    },
    {
      name: 'Emily Johnson',
      role: 'Freelance Designer',
      company: 'Creative Studio',
      avatar: 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
      rating: 5,
      content: 'The customer support team helped me claim a warranty on my expensive camera equipment. Exceptional service and results!'
    },
    {
      name: 'David Park',
      role: 'Operations Director',
      company: 'Manufacturing Co',
      avatar: 'https://images.pexels.com/photos/614810/pexels-photo-614810.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
      rating: 5,
      content: 'The ROI on Smart Receipt is incredible. We\'ve recovered thousands in warranty claims and saved countless hours on organization.'
    },
    {
      name: 'Lisa Thompson',
      role: 'Restaurant Owner',
      company: 'Bistro Moderne',
      avatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
      rating: 5,
      content: 'Perfect for managing all our equipment warranties. The mobile app makes it easy to scan receipts on the go.'
    },
    {
      name: 'James Wilson',
      role: 'Tech Consultant',
      company: 'Digital Solutions',
      avatar: 'https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
      rating: 5,
      content: 'Smart Receipt has transformed how I handle client equipment purchases. Everything is tracked and organized automatically.'
    }
  ];

  const partnerLogos = [
    { name: 'Apple', logo: '🍎' },
    { name: 'Samsung', logo: '📱' },
    { name: 'Dell', logo: '💻' },
    { name: 'HP', logo: '🖨️' },
    { name: 'Canon', logo: '📷' },
    { name: 'Sony', logo: '🎵' },
    { name: 'LG', logo: '📺' },
    { name: 'Microsoft', logo: '🪟' }
  ];

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-5 w-5 ${i < rating ? 'text-accent-yellow fill-current' : 'text-gray-300'}`}
      />
    ));
  };

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Testimonials */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-text-primary mb-4">
            Trusted by <span className="text-primary">50,000+</span> Happy Users
          </h2>
          <p className="text-xl text-text-secondary max-w-3xl mx-auto">
            See what our users say about their experience with Smart Receipt 
            and how it's transformed their receipt management.
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
          {testimonials.slice(0, 6).map((testimonial, index) => (
            <div
              key={index}
              className="bg-white p-6 rounded-2xl shadow-card hover:shadow-card-hover transition-all duration-300 transform hover:-translate-y-2 border border-gray-100"
            >
              {/* Rating */}
              <div className="flex items-center mb-4">
                {renderStars(testimonial.rating)}
              </div>

              {/* Content */}
              <p className="text-text-secondary leading-relaxed mb-6 italic">
                "{testimonial.content}"
              </p>

              {/* Author */}
              <div className="flex items-center">
                <img
                  src={testimonial.avatar}
                  alt={testimonial.name}
                  className="w-12 h-12 rounded-full object-cover mr-4"
                />
                <div>
                  <h4 className="font-bold text-text-primary">{testimonial.name}</h4>
                  <p className="text-sm text-text-secondary">
                    {testimonial.role} at {testimonial.company}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Partner Logos */}
        <div className="text-center">
          <h3 className="text-2xl font-bold text-text-primary mb-8">
            Partnered with Leading Brands
          </h3>
          <p className="text-text-secondary mb-12 max-w-2xl mx-auto">
            We work directly with major manufacturers to streamline warranty processes 
            and ensure you get the support you deserve.
          </p>

          <div className="grid grid-cols-4 md:grid-cols-8 gap-8 items-center">
            {partnerLogos.map((partner, index) => (
              <div
                key={index}
                className="bg-white p-4 rounded-lg shadow-card hover:shadow-card-hover transition-shadow duration-300 flex items-center justify-center group"
              >
                <div className="text-3xl group-hover:scale-110 transition-transform duration-300">
                  {partner.logo}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Trust Indicators */}
        <div className="mt-16 text-center">
          <div className="bg-gradient-feature rounded-2xl p-8 border border-gray-100">
            <div className="grid md:grid-cols-3 gap-8">
              <div>
                <div className="text-3xl font-bold text-primary mb-2">94%</div>
                <div className="text-text-primary font-medium">Claim Success Rate</div>
                <div className="text-sm text-text-secondary mt-1">Higher than industry average</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-secondary mb-2">4.9/5</div>
                <div className="text-text-primary font-medium">Average Rating</div>
                <div className="text-sm text-text-secondary mt-1">Based on 12,000+ reviews</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-accent-purple mb-2">24/7</div>
                <div className="text-text-primary font-medium">Customer Support</div>
                <div className="text-sm text-text-secondary mt-1">Always here to help</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Testimonials;