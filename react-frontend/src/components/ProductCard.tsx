import React from 'react';
import { Link } from 'react-router-dom';
import { Star, Heart, Truck, Check } from 'lucide-react';
import logo from '../assets/images/kks_new_logo_dark.png';
import styles from './ProductCard.module.css';
import type { Product } from '../types';

interface ProductCardProps {
  product: Product;
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const discountPercent = product.originalPrice 
    ? Math.round((1 - product.price / product.originalPrice) * 100) 
    : 0;

  return (
    <Link to={`/products/${product.category}/${product.id}`} className={styles.card}>
      {/* Image Section */}
      <div className={styles.imageSection}>
        {product.brand && (
          <span className={styles.brand}>{product.brand}</span>
        )}
        <img 
          src={logo} 
          alt={product.name} 
          className={styles.productImage} 
        />
        <button className={styles.wishlistButton} aria-label="Add to wishlist">
          <Heart size={18} />
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
          <span className={styles.priceLabel}>from</span>
          <div className={styles.prices}>
            <span className={styles.currentPrice}>£{product.price.toFixed(2)}</span>
            {product.originalPrice && (
              <span className={styles.originalPrice}>£{product.originalPrice.toFixed(2)}</span>
            )}
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

