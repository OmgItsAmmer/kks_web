import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { usePremiumCollection, useFeaturedCollections } from '../hooks/useCollections';
import { ChevronDown, ChevronUp } from 'lucide-react';
import logo from '../assets/images/kks_new_logo_dark.png';
import styles from './HeroSection.module.css';

const HeroSection: React.FC = () => {
  // Track viewport width for responsive behavior
  const [viewportWidth, setViewportWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1024
  );

  React.useEffect(() => {
    const handleResize = () => {
      setViewportWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isSmallScreen = viewportWidth < 1024; // where side banners are hidden
  const isExpandEnabled = viewportWidth < 768; // where "show more" button is shown

  // Fetch premium collection (ONE for main banner)
  const { data: premiumCollection, isLoading: premiumLoading } = usePremiumCollection();
  
  // Fetch featured collections (includes premium and standard) for bottom cards
  const { data: featuredCollections, isLoading: featuredLoading } = useFeaturedCollections(10);
  
  const loading = premiumLoading || featuredLoading;
  
  // Image error state
  const [imageErrors, setImageErrors] = useState<Record<number, boolean>>({});
  const [premiumImageError, setPremiumImageError] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Log collection data for debugging
  React.useEffect(() => {
    if (premiumCollection) {
      console.log('[HeroSection] ✅ Premium collection loaded from BACKEND:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📦 Raw Backend Response:', JSON.stringify(premiumCollection, null, 2));
      console.log('🔗 IMAGE_URL from Backend:', premiumCollection.image_url);
      console.log('   Type:', typeof premiumCollection.image_url);
      console.log('   Length:', premiumCollection.image_url?.length || 0);
      console.log('   Is Full URL?', premiumCollection.image_url?.startsWith('http'));
      console.log('   Is Supabase URL?', premiumCollection.image_url?.includes('supabase.co'));
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('Collection Details:', {
        name: premiumCollection.name,
        collection_id: premiumCollection.collection_id,
        image_url: premiumCollection.image_url,
        is_premium: premiumCollection.is_premium,
        total_price: premiumCollection.total_price,
        item_count: premiumCollection.item_count,
      });
    } else {
      console.warn('[HeroSection] ⚠️ No premium collection found');
    }
    if (featuredCollections && featuredCollections.length > 0) {
      console.log('[HeroSection] ✅ Featured collections loaded from BACKEND:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`📦 Total Collections: ${featuredCollections.length}`);
      console.log('📋 Raw Backend Response:', JSON.stringify(featuredCollections, null, 2));
      console.log('🔗 IMAGE_URLs from Backend:');
      featuredCollections.forEach((c, index) => {
        console.log(`   Collection ${index + 1} (ID: ${c.collection_id}):`, {
          name: c.name,
          'IMAGE_URL': c.image_url,
          'Type': typeof c.image_url,
          'Length': c.image_url?.length || 0,
          'Is Full URL?': c.image_url?.startsWith('http'),
          'Is Supabase URL?': c.image_url?.includes('supabase.co'),
        });
      });
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    }
  }, [premiumCollection, featuredCollections, featuredLoading]);

  // Filter out premium collection from featured collections (already shown in main banner)
  // Get first 2 for side banners, remaining for bottom cards
  const collectionsForDisplay = useMemo(() => {
    if (!featuredCollections) return [];
    return featuredCollections.filter(c => 
      !premiumCollection || c.collection_id !== premiumCollection.collection_id
    );
  }, [featuredCollections, premiumCollection]);

  const sideCollections = useMemo(() => collectionsForDisplay.slice(0, 2), [collectionsForDisplay]);

  // Bottom collections:
  // - On small screens (<1024px), include ALL collections (including the two "side" ones)
  //   because the side banners are hidden via CSS.
  // - On large screens (>=1024px), exclude the first two which are shown as side banners.
  const allBottomCollections = useMemo(
    () => (isSmallScreen ? collectionsForDisplay : collectionsForDisplay.slice(2)),
    [collectionsForDisplay, isSmallScreen]
  );
  
  // On mobile (<768px) show first 4, and reveal all in the "Show more" expansion.
  // On larger screens, always show all bottom collections (no expansion behavior).
  const visibleBottomCollections = useMemo(() => {
    if (!isExpandEnabled) {
      return allBottomCollections;
    }
    if (isExpanded) {
      return allBottomCollections;
    }
    return allBottomCollections.slice(0, 4);
  }, [allBottomCollections, isExpanded, isExpandEnabled]);

  const formatPrice = (price: number) => {
    return `Rs ${price.toLocaleString()}`;
  };

  // Get collection image with Supabase bucket support (like ProductCard)
  const getCollectionImage = (collectionId: number, imageUrl: string | null) => {
    console.log(`[HeroSection] getCollectionImage called for collection ${collectionId}:`, {
      imageUrl,
      hasImageError: imageErrors[collectionId],
    });

    // If image loading failed, return logo
    if (imageErrors[collectionId]) {
      console.warn(`[HeroSection] Collection ${collectionId} has image error, using logo`);
      return logo;
    }
    
    // If no image URL, return logo
    if (!imageUrl || imageUrl === '/logo.png' || imageUrl === '') {
      console.warn(`[HeroSection] Collection ${collectionId} has no/invalid image URL:`, imageUrl);
      return logo;
    }
    
    // If it's already a full URL, use it (Supabase storage URL)
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      // Chec if it's a Supabase storage URL (like ProductCard does)
      if (imageUrl.includes('supabase.co/storage/v1/object/public/')) {
        console.log(`[HeroSection] ✅ Collection ${collectionId} using Supabase URL:`, imageUrl);
        return imageUrl;
      }
      // Other valid URLs
      console.log(`[HeroSection] ✅ Collection ${collectionId} using external URL:`, imageUrl);
      return imageUrl;
    }
    
    // Otherwise return logo
    console.warn(`[HeroSection] Collection ${collectionId} image URL is not a full URL, using logo:`, imageUrl);
    return logo;
  };

  const getPremiumImage = (imageUrl: string | null) => {
    console.log(`[HeroSection] getPremiumImage called:`, {
      imageUrl,
      hasImageError: premiumImageError,
    });

    // If image loading failed, return logo
    if (premiumImageError) {
      console.warn(`[HeroSection] Premium collection has image error, using logo`);
      return logo;
    }
    
    // If no image URL, return logo
    if (!imageUrl || imageUrl === '/logo.png' || imageUrl === '') {
      console.warn(`[HeroSection] Premium collection has no/invalid image URL:`, imageUrl);
      return logo;
    }
    
    // If it's already a full URL, use it (Supabase storage URL)
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      // Check if it's a Supabase storage URL (like ProductCard does)
      if (imageUrl.includes('supabase.co/storage/v1/object/public/')) {
        console.log(`[HeroSection] ✅ Premium collection using Supabase URL:`, imageUrl);
        return imageUrl;
      }
      // Other valid URLs
      console.log(`[HeroSection] ✅ Premium collection using external URL:`, imageUrl);
      return imageUrl;
    }
    
    // Otherwise return logo
    console.warn(`[HeroSection] Premium collection image URL is not a full URL, using logo:`, imageUrl);
    return logo;
  };

  const handleImageError = (collectionId: number) => {
    const collection = collectionsForDisplay.find(c => c.collection_id === collectionId);
    console.error(`[HeroSection] ❌ Image failed to load for collection ${collectionId}:`, {
      collection_name: collection?.name,
      attempted_url: collection?.image_url,
      current_src: (document.querySelector(`img[alt="${collection?.name}"]`) as HTMLImageElement)?.src,
    });
    setImageErrors(prev => ({ ...prev, [collectionId]: true }));
  };

  const handlePremiumImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const img = e.currentTarget;
    console.error('[HeroSection] ❌ Premium collection image failed to load:', {
      attempted_url: premiumCollection?.image_url,
      current_src: img.currentSrc || img.src,
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
      complete: img.complete,
    });
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
                  onLoad={() => {
                    const finalUrl = getPremiumImage(premiumCollection.image_url);
                    console.log(`[HeroSection] ✅ Premium image loaded successfully:`, finalUrl);
                  }}
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
                  {collection.is_premium && (
                    <span className={styles.sidePremiumBadge}>Premium</span>
                  )}
                  <img 
                    src={getCollectionImage(collection.collection_id, collection.image_url)} 
                    alt={collection.name} 
                    className={styles.sideImage}
                    onError={() => handleImageError(collection.collection_id)}
                    onLoad={() => {
                      const finalUrl = getCollectionImage(collection.collection_id, collection.image_url);
                      console.log(`[HeroSection] ✅ Side collection ${collection.collection_id} image loaded:`, finalUrl);
                    }}
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

        {/* Collection Cards - Bottom */}
        <div className={styles.collectionsSection}>
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
            ) : visibleBottomCollections.length > 0 ? (
              <>
                {visibleBottomCollections.map((collection) => (
                  <Link
                    key={collection.collection_id}
                    to={`/collection/${collection.collection_id}`}
                    className={styles.categoryCard}
                  >
                    <div className={styles.cardImageWrapper}>
                      {collection.is_premium && (
                        <span className={styles.premiumBadge}>Premium</span>
                      )}
                      <img 
                        src={getCollectionImage(collection.collection_id, collection.image_url)} 
                        alt={collection.name} 
                        className={styles.cardImage}
                        onError={() => handleImageError(collection.collection_id)}
                        onLoad={() => {
                          const finalUrl = getCollectionImage(collection.collection_id, collection.image_url);
                          console.log(`[HeroSection] ✅ Bottom collection ${collection.collection_id} image loaded:`, finalUrl);
                        }}
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
                {visibleBottomCollections.length < 4 && !isExpanded && Array.from({ length: 4 - visibleBottomCollections.length }).map((_, index) => (
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
          
          {/* Expand/Collapse Button for Mobile */}
          {!loading && allBottomCollections.length > 4 && (
            <button
              className={styles.expandButton}
              onClick={() => setIsExpanded(!isExpanded)}
              aria-label={isExpanded ? 'Show less collections' : 'Show all collections'}
            >
              {isExpanded ? (
                <>
                  Show Less <ChevronUp size={16} />
                </>
              ) : (
                <>
                  Show All ({allBottomCollections.length}) <ChevronDown size={16} />
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </section>
  );
};

export default HeroSection;

