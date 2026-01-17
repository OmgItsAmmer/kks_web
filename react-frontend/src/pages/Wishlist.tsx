import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, ArrowLeft, RotateCcw, Truck, ShieldCheck, Clock, X, ShoppingCart } from 'lucide-react';
import { useWishlist } from '../contexts/WishlistContext';
import { cartService } from '../services/cart.service';
import { useAuth } from '../contexts/AuthContext';
import { useSnackbar } from '../contexts/SnackbarContext';
import { AuthenticationError } from '../services/api.config';
import styles from './Wishlist.module.css';

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
                                const hasDiscount = originalPrice && currentPrice && originalPrice > currentPrice;

                                return (
                                    <div key={item.wishlistId} className={styles.wishlistItem}>
                                        <button
                                            onClick={() => handleRemoveFromWishlist(item.productId)}
                                            className={styles.removeBtn}
                                            aria-label="Remove from wishlist"
                                            disabled={removingId === item.productId}
                                        >
                                            {removingId === item.productId ? (
                                                <span className={styles.spinner}>...</span>
                                            ) : (
                                                <X size={20} />
                                            )}
                                        </button>

                                        <Link 
                                            to={`/product/${item.productId}`}
                                            className={styles.itemImageWrapper}
                                        >
                                            <img 
                                                src={item.imageUrl || '/placeholder-product.png'} 
                                                alt={item.productName} 
                                                className={styles.itemImage}
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).src = '/placeholder-product.png';
                                                }}
                                            />
                                        </Link>

                                        <div className={styles.itemDetails}>
                                            <Link to={`/product/${item.productId}`}>
                                                <h3 className={styles.itemName}>{item.productName}</h3>
                                            </Link>
                                            <div className={styles.itemPrice}>
                                                {currentPrice ? (
                                                    <>
                                                        <span className={styles.currentPrice}>{formatPrice(item.salePrice)}</span>
                                                        {hasDiscount && (
                                                            <span className={styles.originalPrice}>{formatPrice(item.basePrice)}</span>
                                                        )}
                                                    </>
                                                ) : (
                                                    <span className={styles.currentPrice}>Price not available</span>
                                                )}
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => handleAddToCart(item)}
                                            className={styles.addToCartBtn}
                                            disabled={addingToCartId === item.productId}
                                        >
                                            {addingToCartId === item.productId ? (
                                                'Loading...'
                                            ) : (
                                                <>
                                                    <ShoppingCart size={16} />
                                                    View Product
                                                </>
                                            )}
                                        </button>
                                    </div>
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
