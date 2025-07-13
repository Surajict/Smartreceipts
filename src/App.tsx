import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Header from './components/Header';
import Hero from './components/Hero';
import Benefits from './components/Benefits';
import HowItWorks from './components/HowItWorks';
import Testimonials from './components/Testimonials';
import FAQ from './components/FAQ';
import CTA from './components/CTA';
import Footer, { OldFooter } from './components/Footer';
import Login from './components/Login';
import SignUp from './components/SignUp';
import Dashboard from './components/Dashboard';
import ReceiptScanning from './components/ReceiptScanning';
import ProfilePage from './components/ProfilePage';
import MyLibrary from './components/MyLibrary';
import WarrantyPage from './components/WarrantyPage';
import { getCurrentUser, onAuthStateChange } from './lib/supabase';

// Protected Route Component
const ProtectedRoute = ({ children, user }: { children: React.ReactNode; user: any }) => {
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

// Home Page Component
const HomePage = () => {
  const navigate = useNavigate();
  const handleShowLogin = () => navigate('/login');
  const handleShowSignUp = () => navigate('/signup');
  return (
    <div className="min-h-screen font-['Inter',sans-serif]">
      <Header />
      <main>
        <Hero onShowLogin={handleShowLogin} onShowSignUp={handleShowSignUp} />
        <Benefits onShowLogin={handleShowLogin} onShowSignUp={handleShowSignUp} />
        <HowItWorks onShowLogin={handleShowLogin} onShowSignUp={handleShowSignUp} />
        <Testimonials />
        <FAQ />
        <CTA onShowLogin={handleShowLogin} onShowSignUp={handleShowSignUp} />
      </main>
      <OldFooter />
    </div>
  );
};

// Login Page Component
const LoginPage = ({ user }: { user: any }) => {
  const navigate = useNavigate();
  const handleBackToHome = () => navigate('/');
  const handleShowSignUp = () => navigate('/signup');
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }
  return <Login onBackToHome={handleBackToHome} onShowSignUp={handleShowSignUp} />;
};

// SignUp Page Component
const SignUpPage = ({ user }: { user: any }) => {
  const navigate = useNavigate();
  const handleBackToHome = () => navigate('/');
  const handleShowLogin = () => navigate('/login');
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }
  return <SignUp onBackToHome={handleBackToHome} onShowLogin={handleShowLogin} />;
};

// Dashboard Page Component
const DashboardPage = ({ user, onSignOut }: { user: any; onSignOut: () => void }) => {
  const navigate = useNavigate();
  const handleShowReceiptScanning = () => navigate('/scan');
  const handleShowProfile = () => navigate('/profile');
  const handleShowLibrary = () => navigate('/library');
  const handleShowWarranty = () => navigate('/warranty');
  return (
    <Dashboard
      onSignOut={onSignOut}
      onShowReceiptScanning={handleShowReceiptScanning}
      onShowProfile={handleShowProfile}
      onShowLibrary={handleShowLibrary}
      onShowWarranty={handleShowWarranty}
    />
  );
};

// Receipt Scanning Page Component
const ReceiptScanningPage = () => {
  const navigate = useNavigate();
  const handleBackToDashboard = () => navigate('/dashboard');
  return <ReceiptScanning onBackToDashboard={handleBackToDashboard} />;
};

// Profile Page Component
const ProfilePageComponent = () => {
  const navigate = useNavigate();
  const handleBackToDashboard = () => navigate('/dashboard');
  return <ProfilePage onBackToDashboard={handleBackToDashboard} />;
};

// Library Page Component
const LibraryPage = () => {
  const navigate = useNavigate();
  const handleBackToDashboard = () => navigate('/dashboard');
  const handleShowReceiptScanning = () => navigate('/scan');
  return <MyLibrary onBackToDashboard={handleBackToDashboard} onShowReceiptScanning={handleShowReceiptScanning} />;
};

// Warranty Page Component
const WarrantyPageComponent = () => {
  const navigate = useNavigate();
  const handleBackToDashboard = () => navigate('/dashboard');
  return <WarrantyPage onBackToDashboard={handleBackToDashboard} />;
};

function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session on app load
    const checkUser = async () => {
      try {
        const currentUser = await getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
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
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const handleSignOut = () => {
    setUser(null);
  };

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

  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage user={user} />} />
        <Route path="/signup" element={<SignUpPage user={user} />} />

        {/* Protected Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute user={user}>
              <DashboardPage user={user} onSignOut={handleSignOut} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/scan"
          element={
            <ProtectedRoute user={user}>
              <ReceiptScanningPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute user={user}>
              <ProfilePageComponent />
            </ProtectedRoute>
          }
        />
        <Route
          path="/library"
          element={
            <ProtectedRoute user={user}>
              <LibraryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/warranty"
          element={
            <ProtectedRoute user={user}>
              <WarrantyPageComponent />
            </ProtectedRoute>
          }
        />

        {/* Catch all route - redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;