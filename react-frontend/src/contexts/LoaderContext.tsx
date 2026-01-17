import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import Loader, { type LoaderVariant } from '../components/Loader';

interface LoaderContextType {
  isLoading: boolean;
  showLoader: (message?: string, variant?: LoaderVariant) => void;
  hideLoader: () => void;
  loadingMessage: string | undefined;
  loadingVariant: LoaderVariant;
}

const LoaderContext = createContext<LoaderContextType | undefined>(undefined);

export const useLoader = () => {
  const context = useContext(LoaderContext);
  if (!context) {
    throw new Error('useLoader must be used within a LoaderProvider');
  }
  return context;
};

interface LoaderProviderProps {
  children: ReactNode;
}

export const LoaderProvider: React.FC<LoaderProviderProps> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState<string | undefined>(undefined);
  const [loadingVariant, setLoadingVariant] = useState<LoaderVariant>('fullpage');

  const showLoader = useCallback((message?: string, variant: LoaderVariant = 'fullpage') => {
    setLoadingMessage(message);
    setLoadingVariant(variant);
    setIsLoading(true);
  }, []);

  const hideLoader = useCallback(() => {
    setIsLoading(false);
    setLoadingMessage(undefined);
  }, []);

  const value: LoaderContextType = {
    isLoading,
    showLoader,
    hideLoader,
    loadingMessage,
    loadingVariant,
  };

  return (
    <LoaderContext.Provider value={value}>
      {children}
      {isLoading && (
        <Loader 
          message={loadingMessage} 
          variant={loadingVariant}
        />
      )}
    </LoaderContext.Provider>
  );
};
