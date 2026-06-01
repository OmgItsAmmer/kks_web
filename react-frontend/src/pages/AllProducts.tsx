import React, { useMemo, useEffect, useRef, useCallback } from 'react';
import { useInfiniteAllProducts } from '../hooks/useProducts';
import ProductCard from '../components/ProductCard';
import { ProductGridSkeleton } from '../components/LoadingSkeleton';
import styles from './AllProducts.module.css';

const PAGE_SIZE = 20;

const AllProducts: React.FC = () => {
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
  } = useInfiniteAllProducts(PAGE_SIZE);

  const products = useMemo(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap((page) => page.products);
  }, [data]);

  const totalCount = data?.pages[0]?.pagination?.total ?? products.length;

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  useEffect(() => {
    const sentinel = loadMoreRef.current;
    if (!sentinel || !hasNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          handleLoadMore();
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [handleLoadMore, hasNextPage]);

  const errorMessage = useMemo(() => {
    if (!isError) return null;
    const err = error as any;
    if (err?.message?.includes('Failed to fetch') || err?.message?.includes('NetworkError')) {
      return 'Cannot connect to server. Please check if the backend is running.';
    }
    return err?.message || 'Failed to load products. Please try again later.';
  }, [isError, error]);

  return (
    <div className={styles.page}>
      <div className="container">
        <header className={styles.header}>
          <h1 className={styles.title}>All Products</h1>
          <p className={styles.subtitle}>
            Browse our full store catalog
            {!isLoading && totalCount > 0 && (
              <span className={styles.count}> — {totalCount} items</span>
            )}
          </p>
        </header>

        {isLoading && <ProductGridSkeleton count={8} />}

        {errorMessage && !isLoading && (
          <div className={styles.errorContainer}>
            <p>{errorMessage}</p>
          </div>
        )}

        {!isLoading && !errorMessage && (
          <>
            {products.length > 0 ? (
              <>
                <div className={styles.productsGrid}>
                  {products.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>

                <div ref={loadMoreRef} className={styles.loadSentinel} aria-hidden="true" />

                {isFetchingNextPage && (
                  <div className={styles.loadingMore}>
                    <ProductGridSkeleton count={4} />
                  </div>
                )}

                {!hasNextPage && products.length > 0 && (
                  <p className={styles.endMessage}>You&apos;ve seen all products in our store.</p>
                )}
              </>
            ) : (
              <p className={styles.emptyMessage}>No products available at the moment.</p>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AllProducts;
