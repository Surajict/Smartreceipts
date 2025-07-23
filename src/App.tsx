import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { UserProvider } from './contexts/UserContext';
import { SubscriptionProvider } from './contexts/SubscriptionContext';
import Homepage from './components/Homepage';
import AuthLayout from './components/AuthLayout';
import Dashboard from './components/Dashboard';
import MyLibrary from './components/MyLibrary';
import WarrantyPage from './components/WarrantyPage';
import ProfilePage from './components/ProfilePage';
import SubscriptionManagement from './components/SubscriptionManagement';
import AdminPortal from './components/AdminPortal';
import ReceiptScanning from './components/ReceiptScanning';
import useAuthState from './hooks/useAuthState';
import './index.css';

const AppContent: React.FC = () => {
  const { user, loading } = useAuthState();

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
    <Routes>
      {/* Homepage Route */}
      <Route path="/" element={<Homepage />} />
      
      {/* Public Routes */}
      <Route path="/login" element={
        user ? <Navigate to="/dashboard" replace /> : <AuthLayout mode="login" />
      } />
      <Route path="/signup" element={
        user ? <Navigate to="/dashboard" replace /> : <AuthLayout mode="signup" />
      } />
      
      {/* Admin Portal Route (No authentication check needed - handles internally) */}
      <Route path="/admin" element={<AdminPortal />} />
      
      {/* Protected Routes */}
      <Route path="/dashboard" element={
        user ? (
          <Dashboard
            onSignOut={() => window.location.href = '/login'}
            onShowReceiptScanning={() => window.location.href = '/scan'}
            onShowProfile={() => window.location.href = '/profile'}
            onShowLibrary={() => window.location.href = '/library'}
            onShowWarranty={() => window.location.href = '/warranty'}
          />
        ) : (
          <Navigate to="/login" replace />
        )
      } />
      
      <Route path="/library" element={
        user ? (
          <MyLibrary
            onBackToDashboard={() => window.location.href = '/dashboard'}
            onShowReceiptScanning={() => window.location.href = '/scan'}
          />
        ) : (
          <Navigate to="/login" replace />
        )
      } />
      
      <Route path="/warranty" element={
        user ? (
          <WarrantyPage
            onBackToDashboard={() => window.location.href = '/dashboard'}
          />
        ) : (
          <Navigate to="/login" replace />
        )
      } />
      
      <Route path="/profile" element={
        user ? (
          <ProfilePage
            onBackToDashboard={() => window.location.href = '/dashboard'}
          />
        ) : (
          <Navigate to="/login" replace />
        )
      } />
      
      <Route path="/subscription" element={
        user ? (
          <SubscriptionManagement
            onBackToDashboard={() => window.location.href = '/dashboard'}
          />
        ) : (
          <Navigate to="/login" replace />
        )
      } />
      
      <Route path="/scan" element={
        user ? (
          <ReceiptScanning
            onBackToDashboard={() => window.location.href = '/dashboard'}
          />
        ) : (
          <Navigate to="/login" replace />
        )
      } />
      
      {/* Catch all route */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

function App() {
  return (
    <Router>
      <UserProvider>
        <SubscriptionProvider>
          <AppContent />
        </SubscriptionProvider>
      </UserProvider>
    </Router>
  );
}

export default App;