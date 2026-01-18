import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, ArrowLeft, RotateCcw, Truck, ShieldCheck, Clock, X, ShoppingCart } from 'lucide-react';
import { useWishlist } from '../contexts/WishlistContext';
import { useAuth } from '../contexts/AuthContext';
import { useSnackbar } from '../contexts/SnackbarContext';
import { AuthenticationError } from '../services/api.config';
import type { WishlistItem } from '../services/wishlist.service';
import logo from '../assets/images/kks_new_logo_dark.png';
import styles from './Wishlist.module.css';

interface WishlistItemCardProps {
    item: WishlistItem;
    onRemove: (productId: number) => void;
    onAddToCart: (item: WishlistItem) => void;
    removingId: number | null;
    addingToCartId: number | null;
    formatPriceRange: (item: WishlistItem) => string;
    formatPrice: (price: string | null) => string;
    hasDiscount: boolean;
    currentPrice: number | null;
}

const WishlistItemCard: React.FC<WishlistItemCardProps> = ({
    item,
    onRemove,
    onAddToCart,
    removingId,
    addingToCartId,
    formatPriceRange,
    formatPrice,
    hasDiscount,
    currentPrice,
}) => {
    const [imageError, setImageError] = useState(false);
    const [imageSrc, setImageSrc] = useState<string>(() => {
        // Initial state - same logic as ProductCard
        const img = item.imageUrl;
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

    // Update image source when item changes - match ProductCard logic exactly
    useEffect(() => {
        setImageError(false);
        const img = item.imageUrl;
        
        // Log for debugging
        console.log(`[Wishlist] Setting image for product ${item.productId}:`, {
            imageUrl: img,
            hasImageUrl: !!img,
            isSupabaseUrl: img?.includes('supabase.co/storage/v1/object/public/'),
            isHttpUrl: img?.startsWith('http://') || img?.startsWith('https://'),
        });
        
        if (!img || img === '/logo.png' || img === '') {
            console.warn(`[Wishlist] No image URL for product ${item.productId}, using fallback logo`);
            setImageSrc(logo);
        } else if (img.startsWith('http://') || img.startsWith('https://')) {
            // Validate Supabase URL format
            if (img.includes('supabase.co/storage/v1/object/public/')) {
                console.log(`[Wishlist] ✅ Using Supabase URL for product ${item.productId}:`, img);
                setImageSrc(img);
                // Pre-validate the URL (this won't block rendering)
                const testImg = new Image();
                testImg.onerror = () => {
                    console.warn(`[Wishlist] Pre-validation: Image URL may be invalid or inaccessible:`, img);
                };
                testImg.onload = () => {
                    console.log(`[Wishlist] Pre-validation: Image URL is valid:`, img);
                };
                testImg.src = img;
            } else {
                console.log(`[Wishlist] Using non-Supabase HTTP URL for product ${item.productId}:`, img);
                setImageSrc(img);
            }
        } else {
            console.warn(`[Wishlist] Invalid image URL format for product ${item.productId}, using fallback:`, img);
            setImageSrc(logo);
        }
    }, [item.imageUrl, item.productId]);

    const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
        if (!imageError) {
            const img = e.currentTarget;
            console.warn(`[Wishlist] Image failed to load for product ${item.productId}:`, {
                attemptedUrl: item.imageUrl,
                currentSrc: img.currentSrc,
                naturalWidth: img.naturalWidth,
                naturalHeight: img.naturalHeight,
                complete: img.complete,
            });
            
            // Try to diagnose the issue
            if (item.imageUrl && (item.imageUrl.startsWith('http://') || item.imageUrl.startsWith('https://'))) {
                // Test if the URL is accessible (but don't block)
                fetch(item.imageUrl, { method: 'HEAD', mode: 'no-cors' })
                    .then(() => {
                        console.log(`[Wishlist] URL is accessible (no-cors check):`, item.imageUrl);
                    })
                    .catch((err) => {
                        console.error(`[Wishlist] URL accessibility check failed:`, err);
                    });
            }
            
            setImageError(true);
            setImageSrc(logo);
        }
    };

    const handleRemoveClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        e.stopPropagation();
        onRemove(item.productId);
    };

    const handleViewProductClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        e.stopPropagation();
        onAddToCart(item);
    };

    return (
        <Link to={`/product/${item.productId}`} className={styles.card}>
            {/* Image Section */}
            <div className={styles.imageSection}>
                <img 
                    src={imageSrc}
                    alt={item.productName} 
                    className={styles.productImage}
                    onError={handleImageError}
                    onLoad={() => {
                        console.log(`[Wishlist] ✅ Image loaded successfully for product ${item.productId}:`, imageSrc);
                        if (imageError) {
                            setImageError(false);
                        }
                    }}
                    loading="lazy"
                />
                <button 
                    className={styles.removeButton}
                    onClick={handleRemoveClick}
                    disabled={removingId === item.productId}
                    aria-label="Remove from wishlist"
                    title="Remove from wishlist"
                >
                    <X 
                        size={18} 
                        style={{ 
                            transition: 'all 0.2s ease',
                            opacity: removingId === item.productId ? 0.5 : 1 
                        }}
                    />
                </button>
            </div>

            {/* Content Section */}
            <div className={styles.cardContent}>
                {/* Title */}
                <h3 className={styles.cardTitle}>{item.productName}</h3>

                {/* Price */}
                <div className={styles.priceSection}>
                    <span className={styles.priceLabel}>price range</span>
                    <div className={styles.prices}>
                        <span className={styles.currentPrice}>{formatPriceRange(item)}</span>
                        {hasDiscount && currentPrice && (
                            <span className={styles.originalPrice}>{formatPrice(item.basePrice)}</span>
                        )}
                    </div>
                </div>

                {/* View Product Button */}
                <button
                    onClick={handleViewProductClick}
                    className={styles.viewProductBtn}
                    disabled={addingToCartId === item.productId}
                >
                    {addingToCartId === item.productId ? (
                        'Loading...'
                    ) : (
                        <>
                            <ShoppingCart size={16} />
                            <span>View Product</span>
                        </>
                    )}
                </button>
            </div>
        </Link>
    );
};

const Wishlist: React.FC = () => {
    const { wishlistItems, removeFromWishlist, isLoading, refreshWishlist } = useWishlist();
    const { isAuthenticated, showLoginModal } = useAuth();
    const { showError } = useSnackbar();
    const navigate = useNavigate();
    const [removingId, setRemovingId] = useState<number | null>(null);
    const [addingToCartId, setAddingToCartId] = useState<number | null>(null);

    useEffect(() => {
        if (isAuthenticated) {
            refreshWishlist();
        }
    }, [isAuthenticated, refreshWishlist]);

    const handleRemoveFromWishlist = async (productId: number) => {
        if (!isAuthenticated) {
            showLoginModal();
            return;
        }

        try {
            setRemovingId(productId);
            await removeFromWishlist(productId);
        } catch (error) {
            console.error('Error removing from wishlist:', error);
            showError('Failed to remove item from wishlist. Please try again.');
        } finally {
            setRemovingId(null);
        }
    };

    const handleAddToCart = async (item: any) => {
        if (!isAuthenticated) {
            showLoginModal();
            return;
        }

        try {
            setAddingToCartId(item.productId);
            // For now, we need to get the first variant. In a real app, you might want to show variant selection
            // For simplicity, we'll try to add with variant_id = 1 or handle it differently
            // You might want to navigate to product detail page instead
            navigate(`/product/${item.productId}`);
        } catch (error: any) {
            console.error('Error adding to cart:', error);
            if (error instanceof AuthenticationError) {
                showLoginModal();
            } else {
                showError('Failed to add to cart. Please try again.');
            }
        } finally {
            setAddingToCartId(null);
        }
    };

    const formatPrice = (price: string | null): string => {
        if (!price) return 'Price not available';
        const numPrice = parseFloat(price);
        return `Rs ${numPrice.toLocaleString('en-PK', { maximumFractionDigits: 0 })}`;
    };

    const formatPriceRange = (item: WishlistItem): string => {
        // Use priceRange if available and valid
        if (item.priceRange && item.priceRange.trim().length > 0 && item.priceRange !== '--') {
            return `Rs ${item.priceRange}`;
        }
        // Fallback to salePrice or basePrice
        if (item.salePrice) {
            const numPrice = parseFloat(item.salePrice);
            return `Rs ${numPrice.toLocaleString('en-PK', { maximumFractionDigits: 0 })}`;
        }
        if (item.basePrice) {
            const numPrice = parseFloat(item.basePrice);
            return `Rs ${numPrice.toLocaleString('en-PK', { maximumFractionDigits: 0 })}`;
        }
        return 'Price not available';
    };

    return (
        <div className={styles.wishlistPage}>
            {/* Features Bar */}
            <div className={styles.featuresBar}>
                <div className="container">
                    <div className={styles.features}>
                        <div className={styles.feature}>
                            <div className={styles.featureIcon}>
                                <RotateCcw size={20} />
                            </div>
                            <div className={styles.featureText}>
                                <span className={styles.featureTitle}>Easy Returns</span>
                                <span className={styles.featureSubtitle}>No Worries</span>
                            </div>
                        </div>
                        <div className={styles.feature}>
                            <div className={styles.featureIcon}>
                                <Truck size={20} />
                            </div>
                            <div className={styles.featureText}>
                                <span className={styles.featureTitle}>Quick Delivery</span>
                                <span className={styles.featureSubtitle}>Instant Comfort</span>
                            </div>
                        </div>
                        <div className={styles.feature}>
                            <div className={styles.featureIcon}>
                                <ShieldCheck size={20} />
                            </div>
                            <div className={styles.featureText}>
                                <span className={styles.featureTitle}>Shop Easy</span>
                                <span className={styles.featureSubtitle}>Sleep Easy</span>
                            </div>
                        </div>
                        <div className={styles.feature}>
                            <div className={styles.featureIcon}>
                                <Truck size={20} />
                            </div>
                            <div className={styles.featureText}>
                                <span className={styles.featureTitle}>Shop Now, Pay Later</span>
                                <span className={styles.featureSubtitle}>with Klarna</span>
                            </div>
                        </div>
                        <div className={styles.feature}>
                            <div className={styles.featureIcon}>
                                <Clock size={20} />
                            </div>
                            <div className={styles.featureText}>
                                <span className={styles.featureTitle}>Buy It, Try It</span>
                                <span className={styles.featureSubtitle}>Pay Later</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="container">
                <div className={styles.content}>
                    {/* Back to Home Link */}
                    <Link to="/" className={styles.backLink}>
                        <ArrowLeft size={20} />
                        <span>Back to Home</span>
                    </Link>

                    {/* Header */}
                    <div className={styles.header}>
                        <h1 className={styles.title}>My Wishlist</h1>
                        <p className={styles.subtitle}>
                            Save your favorite items and add them to cart when you're ready to buy
                        </p>
                    </div>

                    {/* Loading State */}
                    {isLoading ? (
                        <div className={styles.emptyState}>
                            <div className={styles.emptyIcon}>
                                <Heart size={80} />
                            </div>
                            <h2 className={styles.emptyTitle}>Loading your wishlist...</h2>
                        </div>
                    ) : wishlistItems.length === 0 ? (
                        <div className={styles.emptyState}>
                            <div className={styles.emptyIcon}>
                                <Heart size={80} />
                            </div>
                            <h2 className={styles.emptyTitle}>Your wishlist is empty</h2>
                            <p className={styles.emptySubtitle}>
                                Start adding items you love to your wishlist
                            </p>
                            <Link to="/" className={styles.startShoppingBtn}>
                                Start Shopping
                            </Link>
                        </div>
                    ) : (
                        <div className={styles.wishlistGrid}>
                            {wishlistItems.map(item => {
                                const currentPrice = item.salePrice ? parseFloat(item.salePrice) : null;
                                const originalPrice = item.basePrice ? parseFloat(item.basePrice) : null;
                                const hasDiscount = !!(originalPrice && currentPrice && originalPrice > currentPrice);

                                return (
                                    <WishlistItemCard
                                        key={item.wishlistId}
                                        item={item}
                                        formatPriceRange={formatPriceRange}
                                        formatPrice={formatPrice}
                                        hasDiscount={hasDiscount}
                                        currentPrice={currentPrice}
                                        removingId={removingId}
                                        addingToCartId={addingToCartId}
                                        onRemove={handleRemoveFromWishlist}
                                        onAddToCart={handleAddToCart}
                                    />
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Wishlist;
