import React, { useState, useEffect } from 'react';
import Header from './components/Header';
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
    <div className="min-h-screen flex flex-col justify-center items-center bg-background">
      <div className="text-center p-8 max-w-4xl">
        <div className="flex items-center justify-center space-x-3 mb-6">
          <img 
            src="/Smart Receipt Logo.png" 
            alt="Smart Receipts Logo" 
            className="h-16 w-16 object-contain"
          />
          <span className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Smart Receipts
          </span>
        </div>
        
        <h1 className="text-3xl font-bold mb-6">Redirecting to our homepage...</h1>
        <p className="text-xl text-text-secondary mb-8">
          You'll be redirected to our main website in a moment.
        </p>
        
        <div className="flex justify-center gap-4">
          <button 
            onClick={handleShowLogin}
            className="bg-white text-text-primary border-2 border-gray-300 hover:border-primary px-6 py-3 rounded-lg font-medium transition-all duration-200"
          >
            Sign In
          </button>
          <button 
            onClick={handleShowSignUp}
            className="bg-gradient-primary text-white px-6 py-3 rounded-lg font-medium hover:opacity-90 transition-all duration-200 shadow-button hover:shadow-button-hover transform hover:-translate-y-1"
          >
            Sign Up
          </button>
        </div>
      </div>
      
      <iframe 
        src="https://joyful-palmier-0b6567.netlify.app" 
        className="w-full flex-grow border-t border-gray-200 mt-8"
        style={{ height: 'calc(100vh - 250px)' }}
        title="Smart Receipts Homepage"
      ></iframe>
    </div>
  );
}

export default App;