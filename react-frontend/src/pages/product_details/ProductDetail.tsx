import React, { useState, useEffect, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { 
  Star, Heart, ChevronLeft, ChevronRight, ChevronDown,
  Truck, BadgeCheck,
  Check, Leaf, Package, MessageCircle,
  Minus, Plus, ShoppingCart, X
} from 'lucide-react';
import styles from './ProductDetail.module.css';
import logo from '../../assets/images/kks_new_logo_dark.png';
import { type BackendProductVariant } from '../../services/product.service';
import { reviewService } from '../../services/review.service';
import { cartService } from '../../services/cart.service';
import { AuthenticationError } from '../../services/api.config';
import { useAuth } from '../../contexts/AuthContext';
import { useWishlist } from '../../contexts/WishlistContext';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { useProductDetails, useProductImages, useProductVariants, useProductReviews, useRelatedProducts } from '../../hooks/useProducts';
import Loader from '../../components/Loader';

const ProductDetail: React.FC = () => {
  const { id, productId: routeProductId } = useParams<{ id?: string; productId?: string }>();
  const productId = id ? parseInt(id, 10) : routeProductId ? parseInt(routeProductId, 10) : 0;
  const { isAuthenticated, showLoginModal } = useAuth();
  const { isInWishlist, addToWishlist, removeFromWishlist } = useWishlist();
  const { showSuccess, showError, showWarning } = useSnackbar();
  const queryClient = useQueryClient();

  // Use React Query hooks with caching
  const { 
    data: product, 
    isLoading: productLoading, 
    isError: productError,
    error: productErrorDetails 
  } = useProductDetails(productId > 0 ? productId : null);
  
  const { 
    data: imagesData, 
    isLoading: imagesLoading 
  } = useProductImages(productId > 0 ? productId : null);
  
  const { 
    data: variantsData, 
    isLoading: variantsLoading 
  } = useProductVariants(productId > 0 ? productId : null);
  
  const { 
    data: reviewsData, 
    isLoading: reviewsLoading 
  } = useProductReviews(productId > 0 ? productId : null);
  
  const { 
    data: relatedProductsData, 
    isLoading: relatedLoading 
  } = useRelatedProducts(productId > 0 ? productId : null);

  // Memoize derived data
  const images = useMemo(() => {
    if (!imagesData || imagesData.length === 0) return [logo];
    return imagesData;
  }, [imagesData]);

  const variants = useMemo(() => variantsData || [], [variantsData]);
  const reviews = useMemo(() => reviewsData?.reviews || [], [reviewsData]);
  const relatedProducts = useMemo(() => relatedProductsData || [], [relatedProductsData]);
  
  // Get rating and review count from reviews data or product data
  const productRating = useMemo(() => {
    return reviewsData?.averageRating || product?.rating || 0;
  }, [reviewsData, product]);
  
  const productReviewCount = useMemo(() => {
    return reviewsData?.totalReviews || product?.reviewCount || 0;
  }, [reviewsData, product]);

  const loading = productLoading || imagesLoading || variantsLoading || reviewsLoading || relatedLoading;
  const error = productError ? (productErrorDetails as Error)?.message || 'Failed to load product' : null;

  // UI State
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState<BackendProductVariant | null>(null);
  const [variantsDropdownOpen, setVariantsDropdownOpen] = useState(false);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);
  const [togglingWishlist, setTogglingWishlist] = useState(false);

  // Scroll to top when product changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [productId]);

  // Set default variant when variants are loaded
  useEffect(() => {
    if (variants.length > 0 && !selectedVariant) {
      setSelectedVariant(variants[0]);
    }
  }, [variants, selectedVariant]);

  // Auto-play carousel
  useEffect(() => {
    if (images.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % images.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [images.length]);

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleAddToCart = async () => {
    if (!selectedVariant) {
      showWarning('Please select a variant');
      return;
    }

    try {
      setAddingToCart(true);
      await cartService.addToCart({
        variantId: selectedVariant.variant_id,
        quantity: quantity,
      });
      showSuccess(`Added ${quantity} item(s) to cart successfully!`);
    } catch (err: any) {
      console.error('[ProductDetail] Error adding to cart:', err);
      // If user is not authenticated, show login modal
      if (err instanceof AuthenticationError || err.name === 'AuthenticationError' || err.message.includes('401') || err.message.includes('Unauthorized') || err.message.includes('Authentication required')) {
        showLoginModal();
      } else {
        showError(err.message || 'Failed to add to cart. Please try again.');
      }
    } finally {
      setAddingToCart(false);
    }
  };

  const handleWishlistToggle = async () => {
    if (!isAuthenticated) {
      showLoginModal();
      return;
    }

    try {
      setTogglingWishlist(true);
      
      if (isInWishlist(productId)) {
        await removeFromWishlist(productId);
        showSuccess('Removed from wishlist');
      } else {
        await addToWishlist(productId);
        showSuccess('Added to wishlist');
      }
    } catch (err: any) {
      console.error('[ProductDetail] Error toggling wishlist:', err);
      if (err instanceof AuthenticationError || err.name === 'AuthenticationError') {
        showLoginModal();
      } else {
        showError('Failed to update wishlist. Please try again.');
      }
    } finally {
      setTogglingWishlist(false);
    }
  };

  const handleReviewSubmit = async () => {
    if (reviewRating === 0) {
      showWarning('Please select a rating');
      return;
    }
    if (!reviewComment.trim()) {
      showWarning('Please write a comment');
      return;
    }

    try {
      setSubmittingReview(true);
      await reviewService.submitReview(productId, reviewRating, reviewComment);
      showSuccess('Thank you for your review!');
      setReviewDialogOpen(false);
      setReviewRating(0);
      setReviewComment('');
      
      // Invalidate and refetch reviews to show the new review
      queryClient.invalidateQueries({ queryKey: ['productReviews', productId] });
    } catch (err: any) {
      console.error('[ProductDetail] Error submitting review:', err);
      // If user is not authenticated, show login modal
      if (err instanceof AuthenticationError || err.name === 'AuthenticationError' || err.message?.includes('401') || err.message?.includes('Unauthorized') || err.message?.includes('Authentication required')) {
        showLoginModal();
      } else {
        showError(err.message || 'Failed to submit review. Please try again.');
      }
    } finally {
      setSubmittingReview(false);
    }
  };

  const renderStars = (rating: number, size: number = 16) => {
    return [...Array(5)].map((_, i) => (
      <Star 
        key={i} 
        size={size} 
        fill={i < Math.floor(rating) ? '#f59e0b' : (i < rating ? '#f59e0b' : 'none')}
        className={i < rating ? styles.starFilled : styles.starEmpty}
      />
    ));
  };

  const formatPrice = (price: number | string): string => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    return `Rs ${numPrice.toLocaleString('en-PK', { maximumFractionDigits: 0 })}`;
  };

  if (loading) {
    return <Loader message="Loading product..." variant="fullpage" />;
  }

  if (error || !product) {
    return (
      <div className={styles.productPage}>
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <p>Error: {error || 'Product not found'}</p>
          <Link to="/" style={{ color: '#1e40af', textDecoration: 'underline' }}>
            Go back to home
          </Link>
        </div>
      </div>
    );
  }

  // Calculate current price based on selected variant or product price
  const currentPrice = selectedVariant 
    ? parseFloat(selectedVariant.sell_price.toString())
    : parseFloat(product.sale_price);
  const originalPrice = selectedVariant 
    ? parseFloat(selectedVariant.buy_price.toString())
    : parseFloat(product.base_price);
  const hasDiscount = originalPrice > currentPrice;

  return (
    <div className={styles.productPage}>
      {/* Main Product Section */}
      <div className={styles.productMain}>
        {/* Left Column - Images & Info */}
        <div className={styles.leftColumn}>
          {/* Image Gallery */}
          <div className={styles.imageGallery}>
            <div className={styles.mainImageContainer}>
              <button type="button" className={styles.galleryButton} aria-label="View gallery">
                <img src={images[currentImageIndex]} alt={product.name} className={styles.mainImage} />
                {images.length > 1 && (
                  <>
                    <button type="button" className={styles.navButton} onClick={prevImage} aria-label="Previous image">
                      <ChevronLeft size={20} />
                    </button>
                    <button type="button" className={`${styles.navButton} ${styles.navRight}`} onClick={nextImage} aria-label="Next image">
                      <ChevronRight size={20} />
                    </button>
                    <span className={styles.imageCounter}>{currentImageIndex + 1} / {images.length}</span>
                  </>
                )}
              </button>
            </div>
            
            {/* Thumbnail Strip */}
            {images.length > 1 && (
              <div className={styles.thumbnailStrip}>
                <button type="button" className={styles.thumbnailNav} onClick={prevImage}>
                  <ChevronLeft size={16} />
                </button>
                <div className={styles.thumbnails}>
                  {images.map((img, index) => (
                    <button 
                      key={index}
                      type="button"
                      className={`${styles.thumbnail} ${index === currentImageIndex ? styles.thumbnailActive : ''}`}
                      onClick={() => setCurrentImageIndex(index)}
                    >
                      <img src={img} alt={`${product.name} ${index + 1}`} />
                    </button>
                  ))}
                </div>
                <button type="button" className={styles.thumbnailNav} onClick={nextImage}>
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>

          {/* Accordion Sections */}
          <div className={styles.accordionSection}>
          </div>
        </div>

        {/* Right Column - Product Info & Purchase */}
        <div className={styles.rightColumn}>
          <div className={styles.productInfoCard}>
            <div className={styles.productTitleRow}>
              <h1 className={styles.productTitle}>{product.name}</h1>
              <button
                type="button"
                onClick={handleWishlistToggle}
                disabled={togglingWishlist}
                className={styles.wishlistToggle}
                aria-label={isInWishlist(productId) ? 'Remove from wishlist' : 'Add to wishlist'}
                title={isInWishlist(productId) ? 'Remove from wishlist' : 'Add to wishlist'}
              >
                <Heart 
                  size={24} 
                  fill={isInWishlist(productId) ? '#ef4444' : 'none'}
                  color={isInWishlist(productId) ? '#ef4444' : '#374151'}
                  style={{ 
                    transition: 'all 0.2s ease',
                    opacity: togglingWishlist ? 0.5 : 1 
                  }}
                />
              </button>
            </div>
            
            {/* Price Section */}
            <div className={styles.priceSection}>
              <div className={styles.priceRow}>
                <span className={styles.priceLabel}>Price</span>
                <div className={styles.prices}>
                  {hasDiscount && (
                    <span className={styles.originalPrice}>Was {formatPrice(originalPrice)}</span>
                  )}
                  <span className={styles.currentPrice}>{formatPrice(currentPrice)}</span>
                </div>
              </div>
              <div className={styles.viewDetails}>
                <span>Description</span>
                <span className={styles.colorOptions}>{product.description || 'High quality product from our store'}</span>
              </div>
            </div>

            {/* Product Features/Tags */}
            {product.tag && (
              <div className={styles.productFeatures}>
                <h3>Tags</h3>
                <div className={styles.featureTags}>
                  <span className={styles.featureTag}>
                    <Leaf size={12} />
                    {product.tag}
                  </span>
                  {product.ispopular && (
                    <span className={styles.featureTag}>
                      <Star size={12} />
                      Popular
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Variants Dropdown */}
            {variants.length > 0 && (
              <div className={styles.dropdown}>
                <button 
                  type="button"
                  className={styles.dropdownButton}
                  onClick={() => setVariantsDropdownOpen(!variantsDropdownOpen)}
                >
                  <div className={styles.dropdownLabel}>
                    <Package size={18} />
                    <span>{selectedVariant?.variant_name || 'Select Variant'}</span>
                  </div>
                  <ChevronDown size={18} className={variantsDropdownOpen ? styles.rotated : ''} />
                </button>
                {variantsDropdownOpen && (
                  <div className={styles.dropdownContent}>
                    {variants.map((variant) => (
                      <button 
                        key={variant.variant_id}
                        type="button"
                        className={`${styles.dropdownOption} ${selectedVariant?.variant_id === variant.variant_id ? styles.selected : ''}`}
                        onClick={() => {
                          setSelectedVariant(variant);
                          setVariantsDropdownOpen(false);
                        }}
                      >
                        {variant.variant_name} - {formatPrice(variant.sell_price)}
                        {selectedVariant?.variant_id === variant.variant_id && <Check size={16} />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Add to Cart Section */}
            <div className={styles.addToCart}>
              <button 
                type="button" 
                className={styles.addToCartButton}
                onClick={handleAddToCart}
                disabled={addingToCart || !selectedVariant}
              >
                <ShoppingCart size={20} />
                <span>{addingToCart ? 'Adding...' : 'Add to Basket'}</span>
              </button>
              <div className={styles.quantitySelector}>
                <button 
                  type="button"
                  className={styles.quantityButton}
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                >
                  <Minus size={16} />
                </button>
                <span className={styles.quantity}>{quantity}</span>
                <button 
                  type="button"
                  className={styles.quantityButton}
                  onClick={() => setQuantity(quantity + 1)}
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Customer Reviews Section */}
      <section className={styles.reviewsSection}>
        <div className={styles.reviewsHeader}>
          <h2>Customer Reviews</h2>
          <div className={styles.reviewsSummary}>
            <div className={styles.reviewsRating}>
              <div className={styles.stars}>{renderStars(productRating, 18)}</div>
              <span className={styles.ratingValue}>"{productRating.toFixed(1)}"</span>
            </div>
            <span className={styles.separator}>•</span>
            <span>Based on {productReviewCount} reviews</span>
          </div>
          <p className={styles.reviewsSubtitle}>
            Real customers share their experience with {product.name}
          </p>
        </div>
        
        <div className={styles.reviewsGrid}>
          {reviews.length === 0 ? (
            <p style={{ textAlign: 'center', padding: '2rem', gridColumn: '1 / -1' }}>
              No reviews yet. Be the first to review this product!
            </p>
          ) : (
            reviews.map((review) => (
              <div key={review.review_id} className={styles.reviewCard}>
                <div className={styles.reviewHeader}>
                  <div className={styles.reviewerInitials}>
                    {review.customerName?.split(' ').map(n => n[0]).join('').toUpperCase() || 'A'}
                  </div>
                  <div className={styles.reviewerInfo}>
                    <h4>{review.customerName || 'Anonymous'}</h4>
                    <div className={styles.stars}>{renderStars(Number(review.rating), 12)}</div>
                  </div>
                  <div className={styles.verifiedBadge}>
                    <BadgeCheck size={14} />
                    <span>Verified</span>
                  </div>
                </div>
                <p className={styles.reviewText}>{review.review}</p>
                <div className={styles.reviewFooter}>
                  <span className={styles.reviewDate}>
                    {new Date(review.sent_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        <button 
          type="button"
          className={styles.writeReviewButton}
          onClick={() => setReviewDialogOpen(true)}
        >
          <MessageCircle size={18} />
          Write a Review
        </button>
      </section>

      {/* Review Dialog */}
      {reviewDialogOpen && (
        <div className={styles.dialogOverlay} onClick={() => setReviewDialogOpen(false)}>
          <div className={styles.dialogContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.dialogHeader}>
              <h3>Write a Review</h3>
              <button 
                type="button"
                className={styles.dialogClose}
                onClick={() => setReviewDialogOpen(false)}
              >
                <X size={20} />
              </button>
            </div>
            
            <div className={styles.dialogBody}>
              <div className={styles.ratingSection}>
                <label>Rating (1-5)</label>
                <div className={styles.ratingButtons}>
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button
                      key={rating}
                      type="button"
                      className={`${styles.ratingButton} ${reviewRating === rating ? styles.ratingButtonActive : ''}`}
                      onClick={() => setReviewRating(rating)}
                    >
                      {rating}
                    </button>
                  ))}
                </div>
                <div className={styles.ratingStars}>
                  {reviewRating > 0 && renderStars(reviewRating, 24)}
                </div>
              </div>

              <div className={styles.commentSection}>
                <label htmlFor="reviewComment">Your Review</label>
                <textarea
                  id="reviewComment"
                  className={styles.commentTextarea}
                  placeholder="Share your experience with this product..."
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  rows={6}
                />
              </div>
            </div>

            <div className={styles.dialogFooter}>
              <button 
                type="button"
                className={styles.cancelButton}
                onClick={() => setReviewDialogOpen(false)}
              >
                Cancel
              </button>
              <button 
                type="button"
                className={styles.submitButton}
                onClick={handleReviewSubmit}
                disabled={submittingReview}
              >
                {submittingReview ? 'Submitting...' : 'Submit Review'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <section className={styles.relatedSection}>
          <h2>Related Products</h2>
          <div className={styles.relatedGrid}>
            {relatedProducts.map((item) => {
              const itemPrice = parseFloat(item.sale_price);
              const itemOriginalPrice = parseFloat(item.base_price);
              const hasItemDiscount = itemOriginalPrice > itemPrice;

              return (
                <Link 
                  key={item.product_id} 
                  to={`/product/${item.product_id}`}
                  className={styles.relatedCard}
                >
                  <div className={styles.relatedImageWrapper}>
                    {product.brand?.brand_name && (
                      <span className={styles.brandLabel}>{product.brand.brand_name}</span>
                    )}
                    <img 
                      src={item.mainImage || logo} 
                      alt={item.name} 
                      className={styles.relatedImage} 
                    />
                    <button 
                      type="button" 
                      className={styles.wishlistBtn}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleWishlistToggle();
                      }}
                      disabled={togglingWishlist}
                      aria-label={isInWishlist(item.product_id) ? 'Remove from wishlist' : 'Add to wishlist'}
                    >
                      <Heart 
                        size={16} 
                        fill={isInWishlist(item.product_id) ? '#ef4444' : 'none'}
                        color={isInWishlist(item.product_id) ? '#ef4444' : '#374151'}
                      />
                    </button>
                    {item.ispopular && (
                      <div className={styles.badges}>
                        <span className={styles.newBadge}>Popular</span>
                      </div>
                    )}
                  </div>
                  <div className={styles.relatedContent}>
                    <h3>{item.name}</h3>
                    <div className={styles.relatedPricing}>
                      <span className={styles.fromLabel}>from</span>
                      <div className={styles.relatedPrices}>
                        <span className={styles.relatedPrice}>{formatPrice(itemPrice)}</span>
                        {hasItemDiscount && (
                          <span className={styles.relatedOriginal}>{formatPrice(itemOriginalPrice)}</span>
                        )}
                      </div>
                    </div>
                    <div className={styles.freeDelivery}>
                      <Truck size={14} />
                      Free delivery
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
};

export default ProductDetail;
