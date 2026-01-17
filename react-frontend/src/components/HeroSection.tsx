import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { usePopularProducts } from '../hooks/useProducts';
import type { Product } from '../types';
import HeroProductCards from './HeroProductCards';
import styles from './HeroSection.module.css';

const HeroSection: React.FC = () => {
  // Use React Query hook with caching - data will be cached and reused when navigating back
  const { data, isLoading } = usePopularProducts(1, 7);
  
  const products = useMemo(() => data?.products || [], [data?.products]);
  const loading = isLoading;

  // Log product data for debugging
  React.useEffect(() => {
    if (data?.products) {
      const productsWithImages = data.products.filter(p => p.image && p.image !== '/logo.png');
      const productsWithoutImages = data.products.filter(p => !p.image || p.image === '/logo.png');
      console.log('[HeroSection] ✅ Products loaded (cached):', {
        total: data.products.length,
        withImages: productsWithImages.length,
        withoutImages: productsWithoutImages.length,
        withoutImageIds: productsWithoutImages.map(p => p.id),
        fromCache: !isLoading && data,
      });
    }
  }, [data, isLoading]);

  // Get first 2 products for side banners
  const sideProducts = products.slice(0, 2);

  const formatPriceRange = (product: Product) => {
    if (product.priceRange && product.priceRange.trim().length > 0) {
      return `Rs ${product.priceRange}`;
    }
    return `Rs ${product.price.toLocaleString()}`;
  };

  return (
    <section className={styles.heroSection}>
      <div className="container">
        <div className={styles.heroGrid}>
          {/* Main Banner - Keep as is */}
          <div className={styles.mainBanner}>
            <div className={styles.bannerImage}>
              <img src="/logo.png" alt="Premium Collection" className={styles.heroImage} />
              <div className={styles.bannerOverlay}>
                <span className={styles.newArrival}>NEW ARRIVAL</span>
                <h2 className={styles.bannerTitle}>PREMIUM</h2>
                <h3 className={styles.bannerSubtitle}>COLLECTION</h3>
                <div className={styles.priceSection}>
                  <span className={styles.price}>Rs 49,999</span>
                  <span className={styles.saleTag}>SALE UP TO 40% OFF</span>
                </div>
                <button className={styles.shopButton}>
                  Shop Now
                </button>
              </div>
            </div>
          </div>

          {/* Side Banners - Product Cards (Upper 2) - Keep inline */}
          <div className={styles.sideBanners}>
            {loading ? (
              <>
                <div className={styles.sideBanner}>
                  <div className={styles.sideImageSkeleton}></div>
                </div>
                <div className={styles.sideBanner}>
                  <div className={styles.sideImageSkeleton}></div>
                </div>
              </>
            ) : (
              sideProducts.map((product) => (
                <Link 
                  key={product.id} 
                  to={`/product/${product.id}`} 
                  className={styles.sideBanner}
                >
                  <img 
                    src={product.image || '/logo.png'} 
                    alt={product.name} 
                    className={styles.sideImage} 
                  />
                  <span className={styles.sideLabel}>{product.name}</span>
                  <div className={styles.sidePrice}>
                    {formatPriceRange(product)}
                  </div>
                </Link>
              ))
            )}
            {/* Show empty state if not enough products */}
            {!loading && sideProducts.length < 2 && (
              Array.from({ length: 2 - sideProducts.length }).map((_, index) => (
                <div key={`empty-${index}`} className={styles.sideBanner}>
                  <div className={styles.sideImageSkeleton}></div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Product Cards - Lower 4 (Modular) */}
        <div className={styles.categoryCards}>
          {loading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <div key={`skeleton-${index}`} className={styles.categoryCard}>
                <div className={styles.cardImageWrapper}>
                  <div className={styles.cardImageSkeleton}></div>
                </div>
                <div className={styles.cardContent}>
                  <div className={styles.cardTitleSkeleton}></div>
                  <div className={styles.cardPriceSkeleton}></div>
                </div>
              </div>
            ))
          ) : products.length >= 4 ? (
            <HeroProductCards products={products} />
          ) : products.length > 2 ? (
            <>
              <HeroProductCards products={products} />
              {/* Show empty placeholders if not enough products */}
              {Array.from({ length: 4 - (products.length - 2) }).map((_, index) => (
                <div key={`empty-${index}`} className={styles.categoryCard}>
                  <div className={styles.cardImageWrapper}>
                    <div className={styles.cardImageSkeleton}></div>
                  </div>
                  <div className={styles.cardContent}>
                    <div className={styles.cardTitleSkeleton}></div>
                    <div className={styles.cardPriceSkeleton}></div>
                  </div>
                </div>
              ))}
            </>
          ) : (
            Array.from({ length: 4 }).map((_, index) => (
              <div key={`empty-${index}`} className={styles.categoryCard}>
                <div className={styles.cardImageWrapper}>
                  <div className={styles.cardImageSkeleton}></div>
                </div>
                <div className={styles.cardContent}>
                  <div className={styles.cardTitleSkeleton}></div>
                  <div className={styles.cardPriceSkeleton}></div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
};

export default HeroSection;

