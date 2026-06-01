import React, { useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ProductCard from './ProductCard';
import { useCategories } from '../hooks/useCategories';
import {
  useInfiniteProductsByCategory,
  usePopularProducts,
} from '../hooks/useProducts';
import { ProductGridSkeleton } from './LoadingSkeleton';
import styles from './FeaturedProducts.module.css';

interface FeaturedProductsProps {
  title?: string;
  subtitle?: string;
  showTabs?: boolean;
  initialCategory?: number | 'all';
}

const POPULAR_PREVIEW_COUNT = 6;

const FeaturedProducts: React.FC<FeaturedProductsProps> = ({
  title = 'Handpicked Favourites',
  subtitle = 'Discover our most-loved collections',
  showTabs = true,
  initialCategory = 'all' as const,
}) => {
  const [activeCategory, setActiveCategory] = React.useState<number | 'all'>(initialCategory);

  useEffect(() => {
    setActiveCategory(initialCategory);
  }, [initialCategory]);

  const { data: categoriesData, isLoading: categoriesLoading } = useCategories();
  const categories = useMemo(() => categoriesData || [], [categoriesData]);

  const isAllTab = activeCategory === 'all';

  const {
    data: popularData,
    isLoading: popularLoading,
    isError: popularError,
    error: popularErrorObj,
  } = usePopularProducts(1, POPULAR_PREVIEW_COUNT);

  const {
    data: infiniteData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: categoryProductsLoading,
    isError: categoryProductsError,
    error: categoryErrorObj,
  } = useInfiniteProductsByCategory(activeCategory, 12, !isAllTab);

  const categoryProducts = useMemo(() => {
    if (!infiniteData?.pages) return [];
    return infiniteData.pages.flatMap((page) => page.products);
  }, [infiniteData]);

  const allTabProducts = useMemo(
    () => popularData?.products.slice(0, POPULAR_PREVIEW_COUNT) ?? [],
    [popularData]
  );

  const products = isAllTab ? allTabProducts : categoryProducts;

  const productsLoading = isAllTab ? popularLoading : categoryProductsLoading;
  const productsError = isAllTab ? popularError : categoryProductsError;
  const error = isAllTab ? popularErrorObj : categoryErrorObj;

  const hasMore = !isAllTab && (hasNextPage ?? false);
  const loading =
    (categoriesLoading && categories.length === 0) ||
    (productsLoading && products.length === 0);

  const loadMore = () => {
    if (hasMore && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

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
        <div className={styles.header}>
          <div className={styles.headerText}>
            <h2 className={styles.title}>{title}</h2>
            <p className={styles.subtitle}>{subtitle}</p>
          </div>

          {showTabs && (
            <div className={styles.tabs} data-lenis-prevent>
              <button
                className={`${styles.tab} ${activeCategory === 'all' ? styles.tabActive : ''}`}
                onClick={() => setActiveCategory('all')}
              >
                All
              </button>

              {categories.map((category) => (
                <button
                  key={category.category_id}
                  className={`${styles.tab} ${activeCategory === category.category_id ? styles.tabActive : ''}`}
                  onClick={() => setActiveCategory(category.category_id)}
                >
                  {category.category_name}
                </button>
              ))}
            </div>
          )}
        </div>

        {loading && <ProductGridSkeleton count={8} />}

        {errorMessage && !loading && (
          <div className={styles.errorContainer}>
            <p style={{ color: 'red', fontWeight: 'bold' }}>❌ {errorMessage}</p>
            <p style={{ fontSize: '0.9em', marginTop: '8px', color: '#666' }}>
              Check the browser console (F12) for detailed error logs.
            </p>
          </div>
        )}

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

            {isAllTab && products.length > 0 && (
              <div className={styles.showMoreWrapper}>
                <Link to="/products" className={styles.showMoreBtn}>
                  Show More
                </Link>
              </div>
            )}

            {hasMore && products.length > 0 && (
              <div className={styles.loadMoreWrapper}>
                <button
                  onClick={loadMore}
                  disabled={isFetchingNextPage}
                  className={styles.loadMoreBtn}
                >
                  {isFetchingNextPage ? 'Loading...' : 'Load More Products'}
                </button>
              </div>
            )}

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
