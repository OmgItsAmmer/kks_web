import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { authService } from '../services/auth.service';
import type { User } from '../types/auth';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (idToken: string) => Promise<void>;
  logout: () => Promise<void>;
  showLoginModal: () => void;
  hideLoginModal: () => void;
  isLoginModalOpen: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);

  // Initialize auth state from token
  useEffect(() => {
    const initAuth = async () => {
      const token = authService.getToken();
      
      if (token && !authService.isTokenExpired(token)) {
        try {
          const currentUser = await authService.getCurrentUser();
          setUser(currentUser);
          setupSessionTimeout(token);
        } catch (error) {
          console.error('Failed to get user info:', error);
          authService.removeToken();
        }
      }
      
      setIsLoading(false);
    };

    initAuth();
  }, []);

  // Setup session timeout to auto-logout
  const setupSessionTimeout = (token: string) => {
    // Clear any existing timeout
    if (sessionTimeout) {
      clearTimeout(sessionTimeout);
    }

    const expiryTime = authService.getTokenExpiryTime(token);
    if (expiryTime) {
      const timeUntilExpiry = expiryTime - Date.now();
      
      if (timeUntilExpiry > 0) {
        const timeout = setTimeout(() => {
          handleSessionExpired();
        }, timeUntilExpiry);
        
        setSessionTimeout(timeout);
      } else {
        handleSessionExpired();
      }
    }
  };

  const handleSessionExpired = () => {
    authService.removeToken();
    setUser(null);
    // Optionally show a message to user that session expired
    console.log('Session expired. Please login again.');
  };

  const login = async (idToken: string) => {
    try {
      const response = await authService.authenticateWithGoogle(idToken);
      authService.setToken(response.token);
      setUser(response.user);
      setupSessionTimeout(response.token);
      setIsLoginModalOpen(false);
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout request failed:', error);
    } finally {
      authService.removeToken();
      setUser(null);
      if (sessionTimeout) {
        clearTimeout(sessionTimeout);
        setSessionTimeout(null);
      }
    }
  };

  const showLoginModal = () => {
    setIsLoginModalOpen(true);
  };

  const hideLoginModal = () => {
    setIsLoginModalOpen(false);
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    showLoginModal,
    hideLoginModal,
    isLoginModalOpen,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
