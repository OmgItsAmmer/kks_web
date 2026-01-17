import React, { useState, useMemo, useEffect } from 'react';
import ProductCard from './ProductCard';
import { useCategories } from '../hooks/useCategories';
import { useInfiniteProductsByCategory } from '../hooks/useProducts';
import { ProductGridSkeleton } from './LoadingSkeleton';
import styles from './FeaturedProducts.module.css';

interface FeaturedProductsProps {
  title?: string;
  subtitle?: string;
  showTabs?: boolean;
  initialCategory?: number | 'all';
}

const FeaturedProducts: React.FC<FeaturedProductsProps> = ({
  title = 'Handpicked Favourites',
  subtitle = 'Discover our most-loved collections',
  showTabs = true,
  initialCategory = 'all' as const,
}) => {
  const [activeCategory, setActiveCategory] = useState<number | 'all'>(initialCategory);
  const [isCategoryChanging, setIsCategoryChanging] = useState(false);
  
  // Update active category when initialCategory prop changes (from URL params)
  useEffect(() => {
    setActiveCategory(initialCategory);
  }, [initialCategory]);
  
  // Use React Query hooks with caching
  const { data: categoriesData, isLoading: categoriesLoading } = useCategories();
  const categories = useMemo(() => categoriesData || [], [categoriesData]);
  
  // Use infinite query for better pagination support
  const {
    data: infiniteData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: productsLoading,
    isError: productsError,
    error,
  } = useInfiniteProductsByCategory(activeCategory, 12);
  
  // Flatten all pages into a single products array
  const products = useMemo(() => {
    if (!infiniteData?.pages) return [];
    return infiniteData.pages.flatMap(page => page.products);
  }, [infiniteData]);
  
  // Reset category changing state when products are loaded
  useEffect(() => {
    if (!productsLoading && !categoriesLoading) {
      setIsCategoryChanging(false);
    }
  }, [productsLoading, categoriesLoading]);
  
  const hasMore = hasNextPage ?? false;
  const loading = (categoriesLoading && productsLoading) || isCategoryChanging;

  // Log product data for debugging
  React.useEffect(() => {
    if (products.length > 0) {
      const productsWithImages = products.filter(p => p.image && p.image !== '/logo.png');
      const productsWithoutImages = products.filter(p => !p.image || p.image === '/logo.png');
      console.log('[FeaturedProducts] ✅ Products loaded (cached):', {
        category: activeCategory,
        total: products.length,
        withImages: productsWithImages.length,
        withoutImages: productsWithoutImages.length,
        fromCache: !productsLoading && products.length > 0,
      });
    }
  }, [products, activeCategory, productsLoading]);

  // Load more products handler
  const loadMore = () => {
    if (hasMore && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  // Format error message
  const errorMessage = useMemo(() => {
    if (!productsError) return null;
    const err = error as any;
    if (err?.message?.includes('Failed to fetch') || err?.message?.includes('NetworkError')) {
      return 'Cannot connect to server. Please check if the backend is running.';
    }
    return err?.message || 'Failed to load products. Please try again later.';
  }, [productsError, error]);

  return (
    <section id="featured-products" className={styles.section}>
      <div className="container">
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerText}>
            <h2 className={styles.title}>{title}</h2>
            <p className={styles.subtitle}>{subtitle}</p>
          </div>

          {/* Category Tabs */}
          {showTabs && (
            <div className={styles.tabs}>
              {/* All tab */}
              <button
                className={`${styles.tab} ${activeCategory === 'all' ? styles.tabActive : ''}`}
                onClick={() => {
                  setIsCategoryChanging(true);
                  setActiveCategory('all');
                }}
              >
                All
              </button>
              
              {/* Dynamic category tabs */}
              {categories.map((category) => (
                <button
                  key={category.category_id}
                  className={`${styles.tab} ${activeCategory === category.category_id ? styles.tabActive : ''}`}
                  onClick={() => {
                    setIsCategoryChanging(true);
                    setActiveCategory(category.category_id);
                  }}
                >
                  {category.category_name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Initial Loading State */}
        {loading && (
          <ProductGridSkeleton count={8} />
        )}

        {/* Error State */}
        {errorMessage && !loading && (
          <div className={styles.errorContainer}>
            <p style={{ color: 'red', fontWeight: 'bold' }}>❌ {errorMessage}</p>
            <p style={{ fontSize: '0.9em', marginTop: '8px', color: '#666' }}>
              Check the browser console (F12) for detailed error logs.
            </p>
          </div>
        )}

        {/* Products Grid */}
        {!loading && !errorMessage && (
          <>
            <div className={styles.productsGrid}>
              {products.length > 0 ? (
                products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))
              ) : (
                !productsLoading && <p>No products available in this category.</p>
              )}
            </div>

            {/* Load More Button */}
            {hasMore && products.length > 0 && (
              <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                <button
                  onClick={loadMore}
                  disabled={isFetchingNextPage}
                  style={{
                    padding: '0.75rem 2rem',
                    background: isFetchingNextPage ? '#ccc' : '#2d5a3d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    fontWeight: '500',
                    cursor: isFetchingNextPage ? 'not-allowed' : 'pointer',
                    transition: 'background 0.2s',
                  }}
                >
                  {isFetchingNextPage ? 'Loading...' : 'Load More Products'}
                </button>
              </div>
            )}

            {/* Loading more products */}
            {isFetchingNextPage && products.length > 0 && (
              <div style={{ marginTop: '2rem' }}>
                <ProductGridSkeleton count={4} />
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
};

export default FeaturedProducts;


