import React from 'react';
import Login from './Login';
import SignUp from './SignUp';

interface AuthLayoutProps {
  mode: 'login' | 'signup';
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ mode }) => {
  const handleBackToHome = () => {
    window.location.href = '/';
  };

  const handleShowLogin = () => {
    window.location.href = '/login';
  };

  const handleShowSignUp = () => {
    window.location.href = '/signup';
  };

  if (mode === 'login') {
    return (
      <Login 
        onBackToHome={handleBackToHome}
        onShowSignUp={handleShowSignUp}
      />
    );
  }

  return (
    <SignUp 
      onBackToHome={handleBackToHome}
      onShowLogin={handleShowLogin}
    />
  );
};

export default AuthLayout; 