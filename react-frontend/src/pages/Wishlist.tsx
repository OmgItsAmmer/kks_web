import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, ArrowLeft, RotateCcw, Truck, ShieldCheck, Clock, X } from 'lucide-react';
import styles from './Wishlist.module.css';

// Mock wishlist item data - replace with actual wishlist state management
const mockWishlistItems: any[] = [
    // Empty by default - can be populated with product data
];

const Wishlist: React.FC = () => {
    const [wishlistItems, setWishlistItems] = useState(mockWishlistItems);

    const removeFromWishlist = (id: number) => {
        setWishlistItems(items => items.filter(item => item.id !== id));
    };

    const addToCart = (item: any) => {
        // Add to cart logic here
        console.log('Adding to cart:', item);
        alert('Item added to cart! (This is a demo)');
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

                    {/* Empty State or Wishlist Items */}
                    {wishlistItems.length === 0 ? (
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
                            {wishlistItems.map(item => (
                                <div key={item.id} className={styles.wishlistItem}>
                                    <button
                                        onClick={() => removeFromWishlist(item.id)}
                                        className={styles.removeBtn}
                                        aria-label="Remove from wishlist"
                                    >
                                        <X size={20} />
                                    </button>

                                    <div className={styles.itemImageWrapper}>
                                        <img src={item.image} alt={item.name} className={styles.itemImage} />
                                    </div>

                                    <div className={styles.itemDetails}>
                                        <h3 className={styles.itemName}>{item.name}</h3>
                                        {item.variant && (
                                            <p className={styles.itemVariant}>{item.variant}</p>
                                        )}
                                        <div className={styles.itemPrice}>
                                            <span className={styles.currentPrice}>Rs{item.price.toFixed(2)}</span>
                                            {item.originalPrice && (
                                                <span className={styles.originalPrice}>Rs{item.originalPrice.toFixed(2)}</span>
                                            )}
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => addToCart(item)}
                                        className={styles.addToCartBtn}
                                    >
                                        Add to Cart
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Wishlist;
