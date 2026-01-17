import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { usePremiumCollection, useStandardCollections } from '../hooks/useCollections';
import logo from '../assets/images/kks_new_logo_dark.png';
import styles from './HeroSection.module.css';

const HeroSection: React.FC = () => {
  // Fetch premium collection (ONE for main banner)
  const { data: premiumCollection, isLoading: premiumLoading } = usePremiumCollection();
  
  // Fetch standard collections (6 for side banners and bottom cards)
  const { data: standardCollections, isLoading: standardLoading } = useStandardCollections(6);
  
  const loading = premiumLoading || standardLoading;
  
  // Image error state
  const [imageErrors, setImageErrors] = useState<Record<number, boolean>>({});
  const [premiumImageError, setPremiumImageError] = useState(false);

  // Log collection data for debugging
  React.useEffect(() => {
    if (premiumCollection) {
      console.log('[HeroSection] ✅ Premium collection loaded:', premiumCollection.name);
    }
    if (standardCollections) {
      console.log('[HeroSection] ✅ Standard collections loaded:', {
        total: standardCollections.length,
        fromCache: !standardLoading && standardCollections,
      });
    }
  }, [premiumCollection, standardCollections, standardLoading]);

  // Get first 2 standard collections for side banners, remaining 4 for bottom cards
  const sideCollections = useMemo(() => standardCollections?.slice(0, 2) || [], [standardCollections]);
  const bottomCollections = useMemo(() => standardCollections?.slice(2, 6) || [], [standardCollections]);

  const formatPrice = (price: number) => {
    return `Rs ${price.toLocaleString()}`;
  };

  // Get collection image with Supabase bucket support (like ProductCard)
  const getCollectionImage = (collectionId: number, imageUrl: string | null) => {
    // If image loading failed, return logo
    if (imageErrors[collectionId]) {
      return logo;
    }
    
    // If no image URL, return logo
    if (!imageUrl || imageUrl === '/logo.png' || imageUrl === '') {
      return logo;
    }
    
    // If it's already a full URL, use it (Supabase storage URL)
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      // Validate Supabase URL format for collections bucket
      if (imageUrl.includes('supabase.co/storage/v1/object/public/collections/')) {
        return imageUrl;
      }
      // Other valid URLs
      return imageUrl;
    }
    
    // Otherwise return logo
    return logo;
  };

  const getPremiumImage = (imageUrl: string | null) => {
    // If image loading failed, return logo
    if (premiumImageError) {
      return logo;
    }
    
    // If no image URL, return logo
    if (!imageUrl || imageUrl === '/logo.png' || imageUrl === '') {
      return logo;
    }
    
    // If it's already a full URL, use it (Supabase storage URL)
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      // Validate Supabase URL format for collections bucket
      if (imageUrl.includes('supabase.co/storage/v1/object/public/collections/')) {
        return imageUrl;
      }
      // Other valid URLs
      return imageUrl;
    }
    
    // Otherwise return logo
    return logo;
  };

  const handleImageError = (collectionId: number) => {
    console.warn(`[HeroSection] Image failed to load for collection ${collectionId}`);
    setImageErrors(prev => ({ ...prev, [collectionId]: true }));
  };

  const handlePremiumImageError = () => {
    console.warn('[HeroSection] Premium collection image failed to load');
    setPremiumImageError(true);
  };

  return (
    <section id="collections-section" className={styles.heroSection}>
      <div className="container">
        <div className={styles.heroGrid}>
          {/* Main Banner - Premium Collection */}
          <div className={styles.mainBanner}>
            {loading || !premiumCollection ? (
              <div className={styles.bannerImage}>
                <img src={logo} alt="Premium Collection" className={styles.heroImage} />
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
            ) : (
              <Link to={`/collection/${premiumCollection.collection_id}`} className={styles.bannerImage}>
                <img 
                  src={getPremiumImage(premiumCollection.image_url)} 
                  alt={premiumCollection.name} 
                  className={styles.heroImage}
                  onError={handlePremiumImageError}
                  loading="lazy"
                />
                <div className={styles.bannerOverlay}>
                  <span className={styles.newArrival}>NEW ARRIVAL</span>
                  <h2 className={styles.bannerTitle}>{premiumCollection.name.split(' ')[0]}</h2>
                  <h3 className={styles.bannerSubtitle}>{premiumCollection.name.split(' ').slice(1).join(' ')}</h3>
                  <div className={styles.priceSection}>
                    <span className={styles.price}>{formatPrice(Number(premiumCollection.total_price))}</span>
                    <span className={styles.saleTag}>{premiumCollection.item_count} ITEMS INCLUDED</span>
                  </div>
                  <button className={styles.shopButton}>
                    Shop Now
                  </button>
                </div>
              </Link>
            )}
          </div>

          {/* Side Banners - Standard Collection Cards (Upper 2) */}
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
              sideCollections.map((collection) => (
                <Link 
                  key={collection.collection_id} 
                  to={`/collection/${collection.collection_id}`} 
                  className={styles.sideBanner}
                >
                  <img 
                    src={getCollectionImage(collection.collection_id, collection.image_url)} 
                    alt={collection.name} 
                    className={styles.sideImage}
                    onError={() => handleImageError(collection.collection_id)}
                    loading="lazy"
                  />
                  <span className={styles.sideLabel}>{collection.name}</span>
                  <div className={styles.sidePrice}>
                    {formatPrice(Number(collection.total_price))}
                  </div>
                  <div className={styles.itemCount}>
                    {collection.item_count} {collection.item_count === 1 ? 'Item' : 'Items'}
                  </div>
                </Link>
              ))
            )}
            {/* Show empty state if not enough collections */}
            {!loading && sideCollections.length < 2 && (
              Array.from({ length: 2 - sideCollections.length }).map((_, index) => (
                <div key={`empty-${index}`} className={styles.sideBanner}>
                  <div className={styles.sideImageSkeleton}></div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Standard Collection Cards - Lower 4 */}
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
          ) : bottomCollections.length > 0 ? (
            <>
              {bottomCollections.map((collection) => (
                <Link
                  key={collection.collection_id}
                  to={`/collection/${collection.collection_id}`}
                  className={styles.categoryCard}
                >
                  <div className={styles.cardImageWrapper}>
                    <img 
                      src={getCollectionImage(collection.collection_id, collection.image_url)} 
                      alt={collection.name} 
                      className={styles.cardImage}
                      onError={() => handleImageError(collection.collection_id)}
                      loading="lazy"
                    />
                  </div>
                  <div className={styles.cardContent}>
                    <h3 className={styles.cardTitle}>{collection.name}</h3>
                    <p className={styles.cardDescription}>
                      {collection.item_count} {collection.item_count === 1 ? 'Item' : 'Items'}
                    </p>
                    <div className={styles.cardPrice}>
                      {formatPrice(Number(collection.total_price))}
                    </div>
                  </div>
                </Link>
              ))}
              {/* Show empty placeholders if not enough collections */}
              {bottomCollections.length < 4 && Array.from({ length: 4 - bottomCollections.length }).map((_, index) => (
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

