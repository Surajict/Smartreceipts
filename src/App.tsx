import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import Benefits from './components/Benefits';
import HowItWorks from './components/HowItWorks';
import Testimonials from './components/Testimonials';
import FAQ from './components/FAQ';
import CTA from './components/CTA';
import Footer from './components/Footer';
import Login from './components/Login';
import SignUp from './components/SignUp';
import Dashboard from './components/Dashboard';
import ReceiptScanning from './components/ReceiptScanning';
import ProfilePage from './components/ProfilePage';
import MyLibrary from './components/MyLibrary';
import { getCurrentUser, onAuthStateChange } from './lib/supabase';

type PageState = 'home' | 'login' | 'signup' | 'dashboard' | 'receipt-scanning' | 'profile' | 'library';

function App() {
  const [currentPage, setCurrentPage] = useState<PageState>('home');
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session on app load
    const checkUser = async () => {
      try {
        const currentUser = await getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
          setCurrentPage('dashboard');
        }
      } catch (error) {
        console.error('Error checking user:', error);
      } finally {
        setLoading(false);
      }
    };

    checkUser();

    // Listen for auth state changes
    const { data: { subscription } } = onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user);
        setCurrentPage('dashboard');
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setCurrentPage('home');
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const handleShowLogin = () => setCurrentPage('login');
  const handleShowSignUp = () => setCurrentPage('signup');
  const handleShowHome = () => setCurrentPage('home');
  const handleShowDashboard = () => setCurrentPage('dashboard');
  const handleShowReceiptScanning = () => setCurrentPage('receipt-scanning');
  const handleShowProfile = () => setCurrentPage('profile');
  const handleShowLibrary = () => setCurrentPage('library');
  const handleSignOut = () => {
    setUser(null);
    setCurrentPage('home');
  };

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-text-secondary">Loading...</p>
        </div>
      </div>
    );
  }

  // Show profile page
  if (user && currentPage === 'profile') {
    return <ProfilePage onBackToDashboard={handleShowDashboard} />;
  }

  // Show library page
  if (user && currentPage === 'library') {
    return <MyLibrary onBackToDashboard={handleShowDashboard} onShowReceiptScanning={handleShowReceiptScanning} />;
  }

  // Show receipt scanning page
  if (user && currentPage === 'receipt-scanning') {
    return <ReceiptScanning onBackToDashboard={handleShowDashboard} />;
  }

  // Show dashboard if user is authenticated
  if (user && currentPage === 'dashboard') {
    return <Dashboard onSignOut={handleSignOut} onShowReceiptScanning={handleShowReceiptScanning} onShowProfile={handleShowProfile} onShowLibrary={handleShowLibrary} />;
  }

  if (currentPage === 'login') {
    return <Login onBackToHome={handleShowHome} onShowSignUp={handleShowSignUp} />;
  }

  if (currentPage === 'signup') {
    return <SignUp onBackToHome={handleShowHome} onShowLogin={handleShowLogin} />;
  }

  return (
    <div className="min-h-screen font-['Inter',sans-serif]">
      <Header onShowLogin={handleShowLogin} onShowSignUp={handleShowSignUp} />
      <main>
        <Hero onShowLogin={handleShowLogin} onShowSignUp={handleShowSignUp} />
        <Benefits onShowLogin={handleShowLogin} onShowSignUp={handleShowSignUp} />
        <HowItWorks onShowLogin={handleShowLogin} onShowSignUp={handleShowSignUp} />
        <Testimonials />
        <FAQ />
        <CTA onShowLogin={handleShowLogin} onShowSignUp={handleShowSignUp} />
      </main>
      <Footer />
    </div>
  );
}

export default App;