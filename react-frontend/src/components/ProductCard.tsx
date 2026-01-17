import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Star, Heart, Truck, Check } from 'lucide-react';
import logo from '../assets/images/kks_new_logo_dark.png';
import styles from './ProductCard.module.css';
import type { Product } from '../types';
import { useWishlist } from '../contexts/WishlistContext';
import { useAuth } from '../contexts/AuthContext';
import { useSnackbar } from '../contexts/SnackbarContext';
import { AuthenticationError } from '../services/api.config';

interface ProductCardProps {
  product: Product;
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { isInWishlist, addToWishlist, removeFromWishlist } = useWishlist();
  const { isAuthenticated, showLoginModal } = useAuth();
  const { showSuccess, showError } = useSnackbar();
  const [togglingWishlist, setTogglingWishlist] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [imageSrc, setImageSrc] = useState<string>(() => {
    // Check if product.image is a valid URL or the imported logo
    const img = product.image;
    if (!img || img === '/logo.png' || img === '') {
      return logo;
    }
    // Check if it's a valid URL (starts with http:// or https://)
    if (img.startsWith('http://') || img.startsWith('https://')) {
      return img;
    }
    // If it's a relative path that might not exist, use logo
    return logo;
  });
  
  // Convert product.id (string) to number for wishlist operations
  const productId = parseInt(product.id, 10);
  const productInWishlist = isInWishlist(productId);

  // Reset image error when product changes
  React.useEffect(() => {
    setImageError(false);
    const img = product.image;
    if (!img || img === '/logo.png' || img === '') {
      setImageSrc(logo);
    } else if (img.startsWith('http://') || img.startsWith('https://')) {
      // Validate Supabase URL format
      if (img.includes('supabase.co/storage/v1/object/public/')) {
        setImageSrc(img);
        // Pre-validate the URL (this won't block rendering)
        const testImg = new Image();
        testImg.onerror = () => {
          console.warn(`[ProductCard] Pre-validation: Image URL may be invalid or inaccessible:`, img);
        };
        testImg.onload = () => {
          console.log(`[ProductCard] Pre-validation: Image URL is valid:`, img);
        };
        testImg.src = img;
      } else {
        setImageSrc(img);
      }
    } else {
      setImageSrc(logo);
    }
  }, [product.id, product.image]);

  // Handle image load error
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    if (!imageError) {
      const img = e.currentTarget;
      console.warn(`[ProductCard] Image failed to load for product ${product.id}:`, {
        attemptedUrl: product.image,
        currentSrc: img.currentSrc,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
        complete: img.complete,
      });
      
      // Try to diagnose the issue
      if (product.image && (product.image.startsWith('http://') || product.image.startsWith('https://'))) {
        // Test if the URL is accessible
        fetch(product.image, { method: 'HEAD', mode: 'no-cors' })
          .then(() => {
            console.log(`[ProductCard] URL is accessible (no-cors check):`, product.image);
          })
          .catch((err) => {
            console.error(`[ProductCard] URL accessibility check failed:`, err);
          });
      }
      
      setImageError(true);
      setImageSrc(logo);
    }
  };

  const handleWishlistToggle = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      showLoginModal();
      return;
    }

    try {
      setTogglingWishlist(true);
      
      if (productInWishlist) {
        await removeFromWishlist(productId);
        showSuccess('Removed from wishlist');
      } else {
        await addToWishlist(productId);
        showSuccess('Added to wishlist');
      }
    } catch (err: any) {
      console.error('[ProductCard] Error toggling wishlist:', err);
      if (err instanceof AuthenticationError || err.name === 'AuthenticationError') {
        showLoginModal();
      } else {
        showError('Failed to update wishlist. Please try again.');
      }
    } finally {
      setTogglingWishlist(false);
    }
  };

  return (
    <Link to={`/products/${product.category}/${product.id}`} className={styles.card}>
      {/* Image Section */}
      <div className={styles.imageSection}>
        {product.brand && (
          <span className={styles.brand}>{product.brand}</span>
        )}
        <img 
          src={imageSrc} 
          alt={product.name} 
          className={styles.productImage}
          onError={handleImageError}
          onLoad={() => {
            console.log(`[ProductCard] ✅ Image loaded successfully for product ${product.id}:`, imageSrc);
            if (imageError) {
              setImageError(false);
            }
          }}
          loading="lazy"
        />
        <button 
          className={styles.wishlistButton}
          onClick={handleWishlistToggle}
          disabled={togglingWishlist}
          aria-label={productInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
          title={productInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
        >
          <Heart 
            size={18} 
            fill={productInWishlist ? '#ef4444' : 'none'}
            color={productInWishlist ? '#ef4444' : 'currentColor'}
            style={{ 
              transition: 'all 0.2s ease',
              opacity: togglingWishlist ? 0.5 : 1 
            }}
          />
        </button>
        {product.isFeatured && (
          <span className={styles.featuredBadge}>Featured</span>
        )}
      </div>

      {/* Content Section */}
      <div className={styles.content}>
        {/* Title */}
        <h3 className={styles.title}>{product.name}</h3>

        {/* Rating */}
        <div className={styles.rating}>
          <div className={styles.stars}>
            {[...Array(5)].map((_, i) => (
              <Star 
                key={i} 
                size={12} 
                fill={i < Math.floor(product.rating) ? '#f59e0b' : 'none'}
                className={i < Math.floor(product.rating) ? styles.starFilled : styles.starEmpty}
              />
            ))}
          </div>
          <span className={styles.ratingValue}>"{product.rating}"</span>
          <span className={styles.reviewCount}>{product.reviewCount}</span>
        </div>

        {/* Features */}
        <div className={styles.features}>
          {product.features.slice(0, 4).map((feature, index) => (
            <span key={index} className={styles.featureTag}>
              <Check size={10} />
              {feature.label}
            </span>
          ))}
          {product.features.length > 4 && (
            <span className={styles.moreFeatures}>+{product.features.length - 4}</span>
          )}
        </div>

        {/* Price */}
        <div className={styles.priceSection}>
          <span className={styles.priceLabel}>price range</span>
          <div className={styles.prices}>
            <span className={styles.currentPrice}>
              {product.priceRange && product.priceRange.trim().length > 0
                ? `Rs ${product.priceRange}`
                : `Rs ${product.price.toLocaleString()}`}
            </span>
          </div>
          {product.variants && (
            <span className={styles.variants}>{product.variants} variants available</span>
          )}
        </div>

        {/* Delivery */}
        {product.deliveryInfo && (
          <div className={styles.delivery}>
            <Truck size={14} />
            <span>{product.deliveryInfo}</span>
          </div>
        )}
      </div>
    </Link>
  );
};

export default ProductCard;

