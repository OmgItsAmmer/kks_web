import { useAuth } from '../contexts/AuthContext';

/**
 * Hook to protect actions that require authentication
 * Returns a function that checks if user is authenticated before executing the action
 * If not authenticated, it shows the login modal
 */
export const useProtectedAction = () => {
  const { isAuthenticated, showLoginModal } = useAuth();

  const executeProtectedAction = async <T,>(
    action: () => Promise<T>
  ): Promise<T | undefined> => {
    if (!isAuthenticated) {
      showLoginModal();
      return Promise.resolve(undefined);
    }
    try {
      return await action();
    } catch (error) {
      // Re-throw error so it can be caught by the calling code
      throw error;
    }
  };

  return { executeProtectedAction, isAuthenticated };
};
