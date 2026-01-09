import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Minus, Plus, X, ShieldCheck, Truck, Clock, RotateCcw } from 'lucide-react';
import styles from './Cart.module.css';

// Mock cart item data - replace with actual cart state management
const mockCartItems = [
    {
        id: 1,
        name: 'Bedora Living Dream Sleep Memory Foam Mattress – Comfortable & Supportive | UK',
        size: '3FT SINGLE',
        sku: 'V2029',
        price: 97.50,
        originalPrice: 149.99,
        quantity: 1,
        image: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=400&h=300&fit=crop'
    }
];

const Cart: React.FC = () => {
    const [cartItems, setCartItems] = useState(mockCartItems);

    const updateQuantity = (id: number, newQuantity: number) => {
        if (newQuantity < 1) return;
        setCartItems(items =>
            items.map(item =>
                item.id === id ? { ...item, quantity: newQuantity } : item
            )
        );
    };

    const removeItem = (id: number) => {
        setCartItems(items => items.filter(item => item.id !== id));
    };

    const clearCart = () => {
        setCartItems([]);
    };

    const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const delivery = 0; // Free delivery
    const total = subtotal + delivery;

    return (
        <div className={styles.cartPage}>
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
                    {/* Cart Items Section */}
                    <div className={styles.cartSection}>
                        <div className={styles.cartHeader}>
                            <h1 className={styles.title}>Shopping Cart</h1>
                            <p className={styles.itemCount}>{cartItems.length} Item{cartItems.length !== 1 ? 's' : ''} in your cart</p>
                        </div>

                        {cartItems.length === 0 ? (
                            <div className={styles.emptyCart}>
                                <p>Your cart is empty</p>
                                <Link to="/" className={styles.continueShopping}>
                                    Continue Shopping
                                </Link>
                            </div>
                        ) : (
                            <>
                                <div className={styles.cartItems}>
                                    <div className={styles.cartItemsHeader}>
                                        <h2>Cart Items</h2>
                                        <button onClick={clearCart} className={styles.clearCart}>
                                            Clear Cart
                                        </button>
                                    </div>

                                    {cartItems.map(item => (
                                        <div key={item.id} className={styles.cartItem}>
                                            <img src={item.image} alt={item.name} className={styles.itemImage} />

                                            <div className={styles.itemDetails}>
                                                <h3 className={styles.itemName}>{item.name}</h3>
                                                <p className={styles.itemVariant}>· {item.size}</p>
                                                <p className={styles.itemSku}>SKU: {item.sku}</p>
                                                <div className={styles.itemPrice}>
                                                    <span className={styles.currentPrice}>Rs{item.price.toFixed(2)}</span>
                                                    <span className={styles.originalPrice}>Rs{item.originalPrice.toFixed(2)}</span>
                                                </div>
                                            </div>

                                            <div className={styles.itemActions}>
                                                <div className={styles.quantityControl}>
                                                    <button
                                                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                                        className={styles.quantityBtn}
                                                        aria-label="Decrease quantity"
                                                    >
                                                        <Minus size={16} />
                                                    </button>
                                                    <span className={styles.quantity}>{item.quantity}</span>
                                                    <button
                                                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                                        className={styles.quantityBtn}
                                                        aria-label="Increase quantity"
                                                    >
                                                        <Plus size={16} />
                                                    </button>
                                                </div>

                                                <div className={styles.itemTotal}>
                                                    Rs{(item.price * item.quantity).toFixed(2)}
                                                </div>

                                                <button
                                                    onClick={() => removeItem(item.id)}
                                                    className={styles.removeBtn}
                                                    aria-label="Remove item"
                                                >
                                                    <X size={20} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Order Summary Section */}
                    {cartItems.length > 0 && (
                        <div className={styles.summarySection}>
                            <div className={styles.ordeRsummary}>
                                <h2 className={styles.summaryTitle}>Order Summary</h2>

                                <div className={styles.summaryRow}>
                                    <span>Subtotal</span>
                                    <span>Rs{subtotal.toFixed(2)}</span>
                                </div>

                                <div className={styles.summaryRow}>
                                    <span>Delivery</span>
                                    <span className={styles.freeDelivery}>Free</span>
                                </div>

                                <div className={styles.summaryDivider}></div>

                                <div className={styles.summaryTotal}>
                                    <span>Total</span>
                                    <span>Rs{total.toFixed(2)}</span>
                                </div>

                                <Link to="/checkout" className={styles.checkoutBtn}>
                                    Proceed to Checkout
                                </Link>

                                <div className={styles.securityFeatures}>
                                    <div className={styles.securityItem}>
                                        <ShieldCheck size={16} />
                                        <span>Secure checkout</span>
                                    </div>
                                    <div className={styles.securityItem}>
                                        <Truck size={16} />
                                        <span>Free delivery</span>
                                    </div>
                                    <div className={styles.securityItem}>
                                        <Clock size={16} />
                                        <span>1-3 Hours delivery</span>
                                    </div>
                                </div>

                                <div className={styles.warranty}>
                                    <ShieldCheck size={24} />
                                    <span>10-Days Warranty</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Cart;
