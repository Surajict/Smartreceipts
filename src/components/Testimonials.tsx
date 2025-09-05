import React from 'react';
import { Star } from 'lucide-react';
import { Testimonial } from '../types';

const Testimonials: React.FC = () => {
  const testimonials: Testimonial[] = [
    {
      name: 'Harry',
      role: 'Data Analyst',
      company: 'Equifax',
      rating: 5,
      content: 'I recently discovered Smart Receipts and it has truly transformed how I manage my expenses. The app makes scanning and organizing receipts effortless—whether snapping a photo or importing PDFs, the AI-powered OCR extracts all the crucial details like merchant name, date, total, and tax. I love how I can categorize expenses, track mileage, and generate sleek PDF or CSV reports in just a few taps. The automatic cloud backups give me peace of mind, and having all my data under my control—thanks to its open‑source nature—is incredibly reassuring. Whether you\'re a solo freelancer or running a small business, Smart Receipts is smart, simple, and secure—highly recommend!'
    },
    {
      name: 'Michael Rodriguez',
      role: 'IT Manager',
      company: 'Global Enterprises',
      rating: 5,
      content: 'Managing receipts for our entire department was a nightmare until Smart Receipt. Now everything is organized and accessible instantly.'
    },
    {
      name: 'Emily Johnson',
      role: 'Freelance Designer',
      company: 'Creative Studio',
      rating: 5,
      content: 'The customer support team helped me claim a warranty on my expensive camera equipment. Exceptional service and results!'
    }
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
    <section className="py-20 bg-white relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5 pointer-events-none">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%236C63FF' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}></div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Testimonials */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-text-primary mb-4 tracking-tight">
            What Our Users Say
          </h2>
          <p className="text-xl text-text-secondary max-w-3xl mx-auto">
            See what our users say about their experience with Smart Receipt 
            and how it's transformed their receipt management.
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="bg-white p-6 rounded-2xl shadow-card hover:shadow-card-hover transition-all duration-300 transform hover:-translate-y-2 border border-gray-100 backdrop-blur-sm"
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


      </div>
    </section>
  );
};

export default Testimonials;