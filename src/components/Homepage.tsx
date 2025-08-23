import React from 'react';
import { useNavigate } from 'react-router-dom';
import Header from './Header';
import Hero from './Hero';
import HowItWorks from './HowItWorks';
import Benefits from './Benefits';
import Testimonials from './Testimonials';
import FAQ from './FAQ';
import CTA from './CTA';
import HomepageFooter from './HomepageFooter';
import Chatbot from './Chatbot';

const Homepage: React.FC = () => {
  const navigate = useNavigate();

  const handleShowLogin = () => {
    navigate('/login');
  };



  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main>
        <Hero 
          onShowLogin={handleShowLogin}
        />
        
        <HowItWorks />
        
        <Benefits 
          onShowLogin={handleShowLogin}
        />
        
        <Testimonials />
        
        <FAQ />
        
        <CTA 
          onShowLogin={handleShowLogin}
        />
      </main>
      
      <HomepageFooter />
      
      {/* Floating Chatbot */}
      <Chatbot />
    </div>
  );
};

export default Homepage; 