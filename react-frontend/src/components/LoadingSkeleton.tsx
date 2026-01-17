import React from 'react';
import styles from './LoadingSkeleton.module.css';

// Product Card Skeleton
export const ProductCardSkeleton: React.FC = () => {
  return (
    <div className={styles.productCardSkeleton}>
      <div className={`${styles.productImageSkeleton} ${styles.skeleton}`} />
      <div className={styles.productContent}>
        <div className={`${styles.productName} ${styles.skeleton}`} />
        <div className={`${styles.productPrice} ${styles.skeleton}`} />
        <div className={`${styles.productRating} ${styles.skeleton}`} />
      </div>
    </div>
  );
};

// Category Header Skeleton
export const CategoryHeaderSkeleton: React.FC = () => {
  return (
    <div className={styles.categoryHeader}>
      <div className={`${styles.categoryImageSkeleton} ${styles.skeleton}`} />
      <div className={styles.categoryInfo}>
        <div className={`${styles.categoryTitle} ${styles.skeleton}`} />
        <div className={`${styles.categoryDescription} ${styles.skeleton}`} />
      </div>
    </div>
  );
};

// Product Grid Skeleton
export const ProductGridSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => {
  return (
    <div className={styles.productGrid}>
      {Array.from({ length: count }).map((_, index) => (
        <ProductCardSkeleton key={index} />
      ))}
    </div>
  );
};

// Category Section Skeleton (header + products)
export const CategorySectionSkeleton: React.FC = () => {
  return (
    <div className={styles.categorySection}>
      <CategoryHeaderSkeleton />
      <ProductGridSkeleton count={4} />
    </div>
  );
};

// Category Card Skeleton (for category grid)
export const CategoryCardSkeleton: React.FC = () => {
  return (
    <div className={styles.categoryCard}>
      <div className={`${styles.categoryCardImage} ${styles.skeleton}`} />
      <div className={styles.categoryCardContent}>
        <div className={`${styles.categoryCardTitle} ${styles.skeleton}`} />
        <div className={`${styles.categoryCardDescription} ${styles.skeleton}`} />
      </div>
    </div>
  );
};

// Categories Grid Skeleton
export const CategoriesGridSkeleton: React.FC<{ count?: number }> = ({ count = 6 }) => {
  return (
    <div className={styles.categoriesGrid}>
      {Array.from({ length: count }).map((_, index) => (
        <CategoryCardSkeleton key={index} />
      ))}
    </div>
  );
};

// Full Page Loading
export const FullPageLoading: React.FC = () => {
  return (
    <div className={styles.loadingContainer}>
      <CategoriesGridSkeleton count={6} />
      <CategorySectionSkeleton />
      <CategorySectionSkeleton />
    </div>
  );
};

// Error State Component
export const ErrorState: React.FC<{ error: string; onRetry: () => void }> = ({ error, onRetry }) => {
  return (
    <div className={styles.errorContainer}>
      <h2 className={styles.errorTitle}>Oops! Something went wrong</h2>
      <p className={styles.errorMessage}>{error}</p>
      <button className={styles.retryButton} onClick={onRetry}>
        Try Again
      </button>
    </div>
  );
};

// Empty State Component
export const EmptyState: React.FC<{ message: string }> = ({ message }) => {
  return (
    <div className={styles.emptyContainer}>
      <h2 className={styles.emptyTitle}>No items found</h2>
      <p className={styles.emptyMessage}>{message}</p>
    </div>
  );
};
