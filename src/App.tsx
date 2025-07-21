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
import Chatbot from './components/Chatbot';
import { UserProvider, useUser } from './contexts/UserContext';

// Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useUser();
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-text-secondary">Loading...</p>
        </div>
      </div>
    );
  }
  
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
      {/* Chatbot - Only show on landing page */}
      <Chatbot />
    </div>
  );
};

// Login Page Component
const LoginPage = () => {
  const { user } = useUser();
  const navigate = useNavigate();
  const handleBackToHome = () => navigate('/');
  const handleShowSignUp = () => navigate('/signup');
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }
  return <Login onBackToHome={handleBackToHome} onShowSignUp={handleShowSignUp} />;
};

// SignUp Page Component
const SignUpPage = () => {
  const { user } = useUser();
  const navigate = useNavigate();
  const handleBackToHome = () => navigate('/');
  const handleShowLogin = () => navigate('/login');
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }
  return <SignUp onBackToHome={handleBackToHome} onShowLogin={handleShowLogin} />;
};

// Dashboard Page Component
const DashboardPage = () => {
  const navigate = useNavigate();
  const handleShowReceiptScanning = () => navigate('/scan');
  const handleShowProfile = () => navigate('/profile');
  const handleShowLibrary = () => navigate('/library');
  const handleShowWarranty = () => navigate('/warranty');
  const handleSignOut = () => navigate('/');
  return (
    <Dashboard
      onSignOut={handleSignOut}
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
  return (
    <UserProvider>
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignUpPage />} />

        {/* Protected Routes */}
        <Route
          path="/dashboard"
          element={
              <ProtectedRoute>
                <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/scan"
          element={
              <ProtectedRoute>
              <ReceiptScanningPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
              <ProtectedRoute>
              <ProfilePageComponent />
            </ProtectedRoute>
          }
        />
        <Route
          path="/library"
          element={
              <ProtectedRoute>
              <LibraryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/warranty"
          element={
              <ProtectedRoute>
              <WarrantyPageComponent />
            </ProtectedRoute>
          }
        />

        {/* Catch all route - redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
    </UserProvider>
  );
}

export default App;