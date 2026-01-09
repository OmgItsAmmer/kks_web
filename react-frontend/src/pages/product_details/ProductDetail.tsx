import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Star, Heart, ChevronLeft, ChevronRight, ChevronDown, ChevronUp,
  Truck, Sparkles, BadgeCheck,
  ThumbsUp, Check, Leaf, Package, MessageCircle, Info,
  Minus, Plus, ShoppingCart, X
} from 'lucide-react';
import styles from './ProductDetail.module.css';
import logo from '../../assets/images/kks_new_logo_dark.png';

// Mock product data - in real app, this would come from API
const mockProduct = {
  id: 'bc78393a-aa01-4215-986d-0cc75522ad28',
  name: 'Premium Comfort Memory Foam Mattress – Luxury Sleep Experience',
  brand: 'KKS Online',
  price: 110.50,
  originalPrice: 199.00,
  rating: 4.5,
  reviewCount: 50,
  images: [
    logo,
    logo,
    logo,
    logo,
    logo,
    logo,
  ],
  dimensions: '190cm × 90cm × 15cm',
  features: [
    { label: 'Blue Foam', icon: 'foam' },
    { label: 'Hypoallergenic', icon: 'hypo' },
  ],
  firmness: 3, // 1-10 scale
  support: 'Medium',
  pressureRelief: 'Medium',
  airCirculation: 'Better',
  durability: 'Better',
  description: 'High density blue foam mattress. A Fantastic all foam, budget mattress in soft comfort. A silent mattress, with no springs, for a peaceful, undisturbed night sleep. Manufactured using blue reflex foam. A thick layer of high density foam is used to act as the support mechanism in this mattress. Unlike memory foam, reflex foam bounces back quickly to ensure your weight is distributed evenly.',
  category: 'mattresses',
};

const mockReviews = [
  { id: 1, name: 'Sarah M.', initials: 'SM', rating: 5, title: "Best mattress I've ever slept on!", text: "After struggling with back pain for years, this mattress has been a game-changer. The support is incredible and I wake up feeling refreshed every morning.", date: '2 weeks ago', helpful: 24 },
  { id: 2, name: 'James R.', initials: 'JR', rating: 5, title: 'Excellent quality and comfort', text: "Outstanding mattress! The memory foam provides perfect pressure relief while the pocket springs give excellent support. My partner and I both sleep much better now.", date: '1 month ago', helpful: 18 },
  { id: 3, name: 'Emma L.', initials: 'EL', rating: 4, title: 'Great value for money', text: "Really impressed with the quality for the price. The mattress is comfortable and supportive. The cooling technology works well - no more waking up hot!", date: '3 weeks ago', helpful: 15 },
  { id: 4, name: 'Michael T.', initials: 'MT', rating: 5, title: 'Perfect for side sleepers', text: "As a side sleeper, I've always struggled with shoulder pain. This mattress provides the perfect balance of softness and support.", date: '1 week ago', helpful: 22 },
  { id: 5, name: 'Lisa K.', initials: 'LK', rating: 5, title: 'Amazing customer service', text: "Not only is the mattress fantastic, but the customer service was outstanding. They helped me choose the right firmness level.", date: '2 months ago', helpful: 19 },
  { id: 6, name: 'David P.', initials: 'DP', rating: 4, title: 'Good mattress, great price', text: "Solid mattress that provides good support. The edge support is particularly impressive. Takes a few nights to get used to.", date: '1 month ago', helpful: 12 },
];

const relatedProducts = [
  { id: '7e5b63c6-db31-43ff-a94b-400c5b061f57', name: 'Dream Sleep Memory Foam Mattress', price: 97.50, originalPrice: 189.99, rating: 4.7, reviewCount: '1k+', features: ['Memory Foam', 'Reflex Foam', 'Orthopedic Support'], variants: 4, category: 'mattresses' },
  { id: '34d56abc-0d5c-4af2-9e84-d169edd4e783', name: 'ComfortEase 16cm Coil Spring Mattress', price: 91.00, originalPrice: 255.88, rating: 4.5, reviewCount: '1k+', features: ['Coil Spring', 'Medium Firm', 'Back Support'], variants: 28, category: 'mattresses' },
  { id: 'fa3d32cf-c9b8-480f-89ff-389bb8d1d6be', name: 'EcoDream 4000 Memory & 7-Zone Foam Mattress', price: 261.26, originalPrice: 844.85, rating: 4.5, reviewCount: '1k+', features: ['Firm', 'Memory Foam', 'Hypoallergenic'], variants: 10, category: 'mattresses' },
  { id: '6d8fbe20-d5b2-41d0-98e2-259deb4d7f3f', name: 'VitalSleep 3000 Pocket Memory Mattress', price: 208.00, originalPrice: 697.06, rating: 4.7, reviewCount: '1k+', features: ['Pocket Springs', 'Memory Foam', 'Spine Alignment'], variants: 6, category: 'mattresses' },
  { id: 'a1c757b9-79d0-42a2-b40d-578d3ab889d4', name: 'Restoria 18cm Foam & Open Coil Mattress', price: 78.00, originalPrice: 267.65, rating: 4.7, reviewCount: '1k+', features: ['Recon Foam', 'Medium Firm', 'Coil Spring'], variants: 4, category: 'mattresses' },
  { id: '47a58044-7b2e-4eff-88f6-e834a7e24329', name: 'Happy Kids Foam Mattress', price: 104.00, originalPrice: 196.15, rating: 4.5, reviewCount: '1k+', features: ['Pocket Springs', 'Anti-Dust Mite'], variants: 3, category: 'mattresses' },
];

const variants = [
  { id: 1, name: 'Standard - Single', size: '3FT', priceModifier: 0 },
  { id: 2, name: 'Standard - Double', size: '4FT', priceModifier: 15000 },
  { id: 3, name: 'Standard - King', size: '5FT', priceModifier: 25000 },
  { id: 4, name: 'Premium Cover - Single', size: '3FT', priceModifier: 8000 },
  { id: 5, name: 'Premium Cover - Double', size: '4FT', priceModifier: 23000 },
  { id: 6, name: 'Premium Cover - King', size: '5FT', priceModifier: 33000 },
  { id: 7, name: 'Deluxe Package - Single', size: '3FT', priceModifier: 12000 },
  { id: 8, name: 'Deluxe Package - Double', size: '4FT', priceModifier: 27000 },
  { id: 9, name: 'Deluxe Package - King', size: '5FT', priceModifier: 37000 },
];

const ProductDetail: React.FC = () => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState('3FT');
  const [selectedVariant, setSelectedVariant] = useState(variants[0]);
  const [variantsDropdownOpen, setVariantsDropdownOpen] = useState(false);
  const [expandedAccordion, setExpandedAccordion] = useState<string | null>('description');
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');

  const product = mockProduct; // In real app, fetch based on productId
  
  // Calculate price with variant modifier
  const basePrice = product.price * 300; // Convert £ to Rs (approximate rate)
  const baseOriginalPrice = product.originalPrice * 300;
  const currentPrice = basePrice + selectedVariant.priceModifier;
  const currentOriginalPrice = baseOriginalPrice + selectedVariant.priceModifier;
  const savings = currentOriginalPrice - currentPrice;

  // Auto-play carousel
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % product.images.length);
    }, 4000); // Change image every 4 seconds

    return () => clearInterval(interval);
  }, [product.images.length]);

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % product.images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + product.images.length) % product.images.length);
  };

  const toggleAccordion = (section: string) => {
    setExpandedAccordion(expandedAccordion === section ? null : section);
  };

  const handleReviewSubmit = () => {
    if (reviewRating === 0) {
      alert('Please select a rating');
      return;
    }
    if (!reviewComment.trim()) {
      alert('Please write a comment');
      return;
    }
    // In real app, submit to API
    console.log('Review submitted:', { rating: reviewRating, comment: reviewComment });
    alert('Thank you for your review!');
    setReviewDialogOpen(false);
    setReviewRating(0);
    setReviewComment('');
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
                <img src={product.images[currentImageIndex]} alt={product.name} className={styles.mainImage} />
                <button type="button" className={styles.navButton} onClick={prevImage} aria-label="Previous image">
                  <ChevronLeft size={20} />
                </button>
                <button type="button" className={`${styles.navButton} ${styles.navRight}`} onClick={nextImage} aria-label="Next image">
                  <ChevronRight size={20} />
                </button>
                <span className={styles.imageCounter}>{currentImageIndex + 1} / {product.images.length}</span>
              </button>
            </div>
            
            {/* Thumbnail Strip */}
            <div className={styles.thumbnailStrip}>
              <button type="button" className={styles.thumbnailNav} onClick={prevImage}>
                <ChevronLeft size={16} />
              </button>
              <div className={styles.thumbnails}>
                {product.images.map((img, index) => (
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
          </div>

          

          

        

   

        
          {/* Accordion Sections */}
          <div className={styles.accordionSection}>
   


    
          </div>
        </div>

        {/* Right Column - Product Info & Purchase */}
        <div className={styles.rightColumn}>
          <div className={styles.productInfoCard}>
            <h1 className={styles.productTitle}>{product.name}</h1>
            
           

            {/* Price Section */}
            <div className={styles.priceSection}>
              <div className={styles.priceRow}>
                <span className={styles.priceLabel}>Price</span>
                <div className={styles.prices}>
                  <span className={styles.originalPrice}>Was Rs {currentOriginalPrice.toFixed(0)}</span>
                  <span className={styles.currentPrice}>Rs {currentPrice.toFixed(0)}</span>
                </div>
              </div>
              <div className={styles.viewDetails}>
                <span>Description</span>
                <span className={styles.colorOptions}>This is actual description</span>
              
              </div>
            </div>

            {/* Product Features */}
            <div className={styles.productFeatures}>
              <h3>Tags</h3>
              <div className={styles.featureTags}>
                {product.features.map((feature, index) => (
                  <span key={index} className={styles.featureTag}>
                    <Leaf size={12} />
                    {feature.label}
                  </span>
                ))}
              </div>
            </div>

         

            {/* Variants Dropdown */}
            <div className={styles.dropdown}>
              <button 
                type="button"
                className={styles.dropdownButton}
                onClick={() => setVariantsDropdownOpen(!variantsDropdownOpen)}
              >
                <div className={styles.dropdownLabel}>
                  <Package size={18} />
                  <span>{selectedVariant.name}</span>
                </div>
                <ChevronDown size={18} className={variantsDropdownOpen ? styles.rotated : ''} />
              </button>
              {variantsDropdownOpen && (
                <div className={styles.dropdownContent}>
                  {variants.map((variant) => (
                    <button 
                      key={variant.id}
                      type="button"
                      className={`${styles.dropdownOption} ${selectedVariant.id === variant.id ? styles.selected : ''}`}
                      onClick={() => {
                        setSelectedVariant(variant);
                        setSelectedSize(variant.size);
                        setVariantsDropdownOpen(false);
                      }}
                    >
                      {variant.name} - Rs {(basePrice + variant.priceModifier).toFixed(0)}
                      {selectedVariant.id === variant.id && <Check size={16} />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Add to Cart Section */}
            <div className={styles.addToCart}>
              <button type="button" className={styles.addToCartButton}>
                <ShoppingCart size={20} />
                <span>Add to Basket</span>
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
              <div className={styles.stars}>{renderStars(product.rating, 18)}</div>
              <span className={styles.ratingValue}>"{product.rating}"</span>
            </div>
            <span className={styles.separator}>•</span>
            <span>Based on {product.reviewCount} reviews</span>
          </div>
          <p className={styles.reviewsSubtitle}>
            Real customers share their experience with the {product.name}
          </p>
        </div>
        
        <div className={styles.reviewsGrid}>
          {mockReviews.map((review) => (
            <div key={review.id} className={styles.reviewCard}>
              <div className={styles.reviewHeader}>
                <div className={styles.reviewerInitials}>{review.initials}</div>
                <div className={styles.reviewerInfo}>
                  <h4>{review.name}</h4>
                  <div className={styles.stars}>{renderStars(review.rating, 12)}</div>
                </div>
                <div className={styles.verifiedBadge}>
                  <BadgeCheck size={14} />
                  <span>Verified</span>
                </div>
              </div>
              <h5 className={styles.reviewTitle}>{review.title}</h5>
              <p className={styles.reviewText}>{review.text}</p>
              <div className={styles.reviewFooter}>
                <span className={styles.reviewDate}>{review.date}</span>
                <button type="button" className={styles.helpfulButton}>
                  <ThumbsUp size={14} />
                  {review.helpful}
                </button>
              </div>
            </div>
          ))}
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
              >
                Submit Review
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Related Products */}
      <section className={styles.relatedSection}>
        <h2>Customers also viewed</h2>
        <div className={styles.relatedGrid}>
          {relatedProducts.map((item) => (
            <Link 
              key={item.id} 
              to={`/products/${item.category}/${item.id}`}
              className={styles.relatedCard}
            >
              <div className={styles.relatedImageWrapper}>
                <span className={styles.brandLabel}>{product.brand}</span>
                <img src={logo} alt={item.name} className={styles.relatedImage} />
                <button type="button" className={styles.wishlistBtn}>
                  <Heart size={16} />
                </button>
                <div className={styles.badges}>
                  <span className={styles.saleBadge}>Sale</span>
                  <span className={styles.newBadge}>New In</span>
                </div>
              </div>
              <div className={styles.relatedContent}>
                <h3>{item.name}</h3>
                <div className={styles.relatedRating}>
                  <div className={styles.stars}>{renderStars(item.rating, 12)}</div>
                  <span>"{item.rating}"</span>
                  <span className={styles.reviewCount}>Based on {item.reviewCount} reviews</span>
                </div>
                <div className={styles.relatedFeatures}>
                  {item.features.slice(0, 3).map((f, i) => (
                    <span key={i} className={styles.relatedFeature}>
                      <Check size={10} />
                      {f}
                    </span>
                  ))}
                </div>
                <div className={styles.relatedPricing}>
                  <span className={styles.fromLabel}>from</span>
                  <div className={styles.relatedPrices}>
                    <span className={styles.relatedPrice}>Rs {(item.price * 300).toFixed(0)}</span>
                    <span className={styles.relatedOriginal}>Rs {(item.originalPrice * 300).toFixed(0)}</span>
                  </div>
                  <span className={styles.variantsLabel}>{item.variants} variants available</span>
                </div>
                <div className={styles.freeDelivery}>
                  <Truck size={14} />
                  Free delivery
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
};

export default ProductDetail;

