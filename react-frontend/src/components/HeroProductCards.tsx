import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Star, Heart } from 'lucide-react';
import type { Product } from '../types';
import { useWishlist } from '../contexts/WishlistContext';
import { useAuth } from '../contexts/AuthContext';
import { AuthenticationError } from '../services/api.config';
import styles from './HeroProductCards.module.css';

interface HeroProductCardsProps {
  products: Product[];
}

const HeroProductCard: React.FC<{ product: Product }> = ({ product }) => {
  const { isInWishlist, addToWishlist, removeFromWishlist } = useWishlist();
  const { isAuthenticated, showLoginModal } = useAuth();
  const [togglingWishlist, setTogglingWishlist] = useState(false);
  
  // Convert product.id (string) to number for wishlist operations
  const productId = parseInt(product.id, 10);
  const productInWishlist = isInWishlist(productId);

  const discountPercent = product.originalPrice 
    ? Math.round((1 - product.price / product.originalPrice) * 100) 
    : 0;

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
      } else {
        await addToWishlist(productId);
      }
    } catch (err: any) {
      console.error('[HeroProductCard] Error toggling wishlist:', err);
      if (err instanceof AuthenticationError || err.name === 'AuthenticationError') {
        showLoginModal();
      }
      // Optionally show a toast/notification here
    } finally {
      setTogglingWishlist(false);
    }
  };

  return (
    <Link to={`/product/${product.id}`} className={styles.card}>
      {/* Image Section */}
      <div className={styles.imageSection}>
        {product.brand && (
          <span className={styles.brand}>{product.brand}</span>
        )}
        <img 
          src={product.image || '/logo.png'} 
          alt={product.name} 
          className={styles.productImage} 
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
        {discountPercent > 0 && (
          <span className={styles.discountBadge}>-{discountPercent}%</span>
        )}
      </div>

      {/* Content Section */}
      <div className={styles.content}>
        {/* Title */}
        <h3 className={styles.title}>{product.name}</h3>

        {/* Rating */}
        {product.rating > 0 && (
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
            <span className={styles.ratingValue}>{product.rating.toFixed(1)}</span>
            <span className={styles.reviewCount}>{product.reviewCount}</span>
          </div>
        )}

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
        </div>
      </div>
    </Link>
  );
};

const HeroProductCards: React.FC<HeroProductCardsProps> = ({ products }) => {
  // Take the last 4 products for the lower cards (products 3-6)
  const lowerProducts = products.slice(2, 6);

  return (
    <>
      {lowerProducts.map((product) => (
        <HeroProductCard key={product.id} product={product} />
      ))}
    </>
  );
};

export default HeroProductCards;
