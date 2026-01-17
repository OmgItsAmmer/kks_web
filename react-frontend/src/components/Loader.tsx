import React from 'react';
import styles from './Loader.module.css';

export type LoaderVariant = 'fullpage' | 'overlay' | 'inline';

interface LoaderProps {
  message?: string;
  variant?: LoaderVariant;
  size?: 'small' | 'medium' | 'large';
}

const Loader: React.FC<LoaderProps> = ({ 
  message, 
  variant = 'fullpage',
  size = 'medium'
}) => {
  const spinnerSize = {
    small: 32,
    medium: 48,
    large: 64,
  }[size];

  const spinnerStyle = {
    width: `${spinnerSize}px`,
    height: `${spinnerSize}px`,
  };

  const content = (
    <>
      <div 
        className={styles.spinner}
        style={spinnerStyle}
      />
      {message && (
        <p className={styles.message}>{message}</p>
      )}
    </>
  );

  if (variant === 'overlay') {
    return (
      <div className={styles.overlay}>
        <div className={styles.overlayContent}>
          {content}
        </div>
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <div className={styles.inline}>
        {content}
      </div>
    );
  }

  // Full page variant (default)
  return (
    <div className={styles.fullpage}>
      {content}
    </div>
  );
};

export default Loader;
