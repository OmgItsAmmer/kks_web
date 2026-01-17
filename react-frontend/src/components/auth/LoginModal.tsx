import React, { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import Loader from '../Loader';
import styles from './LoginModal.module.css';

interface CredentialResponse {
  credential?: string;
  select_by?: string;
}

const LoginModal: React.FC = () => {
  const { isLoginModalOpen, hideLoginModal, login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isLoginModalOpen) return null;

  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    try {
      setIsLoading(true);
      setError(null);

      if (!credentialResponse.credential) {
        throw new Error('No credential received from Google');
      }

      await login(credentialResponse.credential);
    } catch (err) {
      console.error('Login error:', err);
      setError(err instanceof Error ? err.message : 'Failed to login. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError('Google sign-in failed. Please try again.');
  };

  const handleClose = () => {
    if (!isLoading) {
      setError(null);
      hideLoginModal();
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={handleBackdropClick}>
      <div className={styles.modalContent}>
        <button
          className={styles.closeButton}
          onClick={handleClose}
          disabled={isLoading}
          aria-label="Close"
        >
          <X size={24} />
        </button>

        <div className={styles.modalHeader}>
          <h2>Welcome to KKS Online</h2>
          <p>Sign in to access your cart, wishlist, and orders</p>
        </div>

        <div className={styles.modalBody}>
          {error && (
            <div className={styles.errorMessage}>
              {error}
            </div>
          )}

          <div className={styles.googleButtonContainer}>
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              useOneTap={false}
              theme="outline"
              size="large"
              text="signin_with"
              width="100%"
            />
          </div>

          {isLoading && (
            <Loader message="Signing you in..." variant="overlay" />
          )}
        </div>

        <div className={styles.modalFooter}>
          <p className={styles.disclaimer}>
            By signing in, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginModal;
