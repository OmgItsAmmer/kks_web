import React, { useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * ProtectedRoute component that shows login modal if user is not authenticated
 * This doesn't prevent navigation but prompts for login when accessing protected content
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading, showLoginModal } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // Show login modal when accessing protected content without authentication
      showLoginModal();
    }
  }, [isAuthenticated, isLoading, showLoginModal]);

  // Always render children - the modal will handle login requirement
  return <>{children}</>;
};

export default ProtectedRoute;
