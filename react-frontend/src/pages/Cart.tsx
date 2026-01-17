import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Minus, Plus, X, ShieldCheck, Truck, Clock, RotateCcw, AlertTriangle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useSnackbar } from '../contexts/SnackbarContext';
import Loader from '../components/Loader';
import { cartService } from '../services/cart.service';
import { AuthenticationError } from '../services/api.config';
import type { CartItem, CartSummary, CartStockValidation } from '../types/cart';
import styles from './Cart.module.css';

type CartState = 'loading' | 'ready' | 'validating' | 'error' | 'empty';

const Cart: React.FC = () => {
  const { isAuthenticated, showLoginModal } = useAuth();
  const { showError, showWarning, showSuccess } = useSnackbar();
  const navigate = useNavigate();
  
  const [cartState, setCartState] = useState<CartState>('loading');
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [subtotal, setSubtotal] = useState(0);
  const [itemCount, setItemCount] = useState(0);
  const [validationIssues, setValidationIssues] = useState<Map<number, CartStockValidation>>(new Map());
  const [error, setError] = useState<string | null>(null);
  const [updatingItems, setUpdatingItems] = useState<Set<number>>(new Set());

  // Load cart on mount and when authentication changes
  useEffect(() => {
    if (isAuthenticated) {
      loadCart();
    } else {
      // Check if there's a token but user is not authenticated (token might be expired)
      const token = localStorage.getItem('auth_token');
      if (token) {
        // Token exists but user not authenticated - try to load cart anyway
        // The API will return 401 and we'll handle it
        loadCart();
      } else {
        setCartState('empty');
        setCartItems([]);
      }
    }
  }, [isAuthenticated]);

  /**
   * Load cart from backend
   */
  const loadCart = async () => {
    try {
      setCartState('loading');
      setError(null);

      const cartData: CartSummary = await cartService.getCart();
      setCartItems(cartData.items);
      setSubtotal(cartData.subtotal);
      setItemCount(cartData.itemCount);

      if (cartData.items.length === 0) {
        setCartState('empty');
      } else {
        setCartState('ready');
        // Validate stock
        validateCartStock();
      }
    } catch (err: any) {
      console.error('Error loading cart:', err);
      
      // Handle authentication errors
      if (err instanceof AuthenticationError || err.name === 'AuthenticationError') {
        setError('Please login to view your cart');
        setCartState('empty');
        // Show login modal if user is not authenticated
        if (!isAuthenticated) {
          showLoginModal();
        }
        return;
      }
      
      setError(err.message || 'Failed to load cart');
      setCartState('error');
    }
  };

  /**
   * Validate cart stock
   */
  const validateCartStock = async () => {
    try {
      setCartState('validating');
      const validation = await cartService.validateCart();

      if (!validation.valid) {
        const issuesMap = new Map<number, CartStockValidation>();
        validation.adjustments.forEach((adj) => {
          if (!adj.isValid) {
            issuesMap.set(adj.cartId, adj);
          }
        });
        setValidationIssues(issuesMap);
      } else {
        setValidationIssues(new Map());
      }

      setCartState('ready');
    } catch (err: any) {
      console.error('Error validating cart:', err);
      setCartState('ready'); // Still show cart even if validation fails
    }
  };

  /**
   * Update item quantity
   */
  const updateQuantity = async (cartId: number, newQuantity: number) => {
    if (newQuantity < 1) {
      await removeItem(cartId);
      return;
    }

    // Check if item exists in local state
    const itemExists = cartItems.some(item => item.cartId === cartId);
    if (!itemExists) {
      console.log('Item not found in local state, reloading cart...');
      await loadCart();
      return;
    }

    try {
      // Add to updating set
      setUpdatingItems((prev) => new Set(prev).add(cartId));

      await cartService.updateCartItem(cartId, { quantity: newQuantity });

      // Update local state
      setCartItems((items) =>
        items.map((item) =>
          item.cartId === cartId ? { ...item, quantity: newQuantity } : item
        )
      );

      // Recalculate subtotal
      const newSubtotal = cartItems.reduce((sum, item) => {
        const qty = item.cartId === cartId ? newQuantity : item.quantity;
        return sum + item.sellPrice * qty;
      }, 0);
      setSubtotal(newSubtotal);

      // Clear validation issue for this item
      setValidationIssues((prev) => {
        const newMap = new Map(prev);
        newMap.delete(cartId);
        return newMap;
      });
    } catch (err: any) {
      console.error('Error updating quantity:', err);
      
      // Handle authentication errors
      if (err instanceof AuthenticationError || err.name === 'AuthenticationError') {
        showLoginModal();
        return;
      }
      
      // Handle 404 - item not found (might have been deleted)
      if (err.status === 404 || err.statusCode === 404 || err.message?.includes('404') || err.message?.includes('not found') || err.message?.includes('Cart item not found')) {
        // Reload cart to sync with backend
        console.log('Cart item not found, reloading cart...');
        await loadCart();
        return;
      }
      
      showError(err.message || 'Failed to update quantity');
    } finally {
      // Remove from updating set
      setUpdatingItems((prev) => {
        const newSet = new Set(prev);
        newSet.delete(cartId);
        return newSet;
      });
    }
  };

  /**
   * Remove item from cart
   */
  const removeItem = async (cartId: number) => {
    // Check if item exists in local state
    const itemExists = cartItems.some(item => item.cartId === cartId);
    if (!itemExists) {
      console.log('Item not found in local state, reloading cart...');
      await loadCart();
      return;
    }

    try {
      setUpdatingItems((prev) => new Set(prev).add(cartId));

      await cartService.removeCartItem(cartId);

      // Update local state
      const remainingItems = cartItems.filter((item) => item.cartId !== cartId);
      setCartItems(remainingItems);
      
      // Clear validation issue
      setValidationIssues((prev) => {
        const newMap = new Map(prev);
        newMap.delete(cartId);
        return newMap;
      });

      // Recalculate
      if (remainingItems.length === 0) {
        setCartState('empty');
        setSubtotal(0);
        setItemCount(0);
      } else {
        const newSubtotal = remainingItems.reduce((sum, item) => sum + item.sellPrice * item.quantity, 0);
        setSubtotal(newSubtotal);
        setItemCount(remainingItems.reduce((sum, item) => sum + item.quantity, 0));
      }
    } catch (err: any) {
      console.error('Error removing item:', err);
      
      // Handle authentication errors
      if (err instanceof AuthenticationError || err.name === 'AuthenticationError') {
        showLoginModal();
        return;
      }
      
      // Handle 404 - item already removed, just reload cart
      if (err.status === 404 || err.statusCode === 404 || err.message?.includes('404') || err.message?.includes('not found') || err.message?.includes('Cart item not found')) {
        console.log('Item already removed, reloading cart...');
        // Silently reload cart - item was already removed
        await loadCart();
        return;
      }
      
      showError(err.message || 'Failed to remove item');
    } finally {
      setUpdatingItems((prev) => {
        const newSet = new Set(prev);
        newSet.delete(cartId);
        return newSet;
      });
    }
  };

  /**
   * Clear entire cart
   */
  const clearCart = async () => {
    if (!confirm('Are you sure you want to clear your cart?')) {
      return;
    }

    try {
      setCartState('loading');
      await cartService.clearCart();
      setCartItems([]);
      setSubtotal(0);
      setItemCount(0);
      setValidationIssues(new Map());
      setCartState('empty');
    } catch (err: any) {
      console.error('Error clearing cart:', err);
      
      // Handle authentication errors
      if (err instanceof AuthenticationError || err.name === 'AuthenticationError') {
        showLoginModal();
        setCartState('empty');
        return;
      }
      
      showError(err.message || 'Failed to clear cart');
      setCartState('ready');
    }
  };

  /**
   * Handle checkout navigation
   */
  const handleCheckout = () => {
    if (!isAuthenticated) {
      showLoginModal();
      return;
    }

    // Check if there are any validation issues
    if (validationIssues.size > 0) {
      showWarning('Please resolve stock issues before proceeding to checkout');
      return;
    }

    // Navigate to checkout with cart data
    navigate('/checkout', { state: { cartItems, subtotal, itemCount } });
  };

  const delivery = 0; // Free delivery
  const total = subtotal + delivery;

  // Loading state
  if (cartState === 'loading') {
    return <Loader message="Loading your cart..." variant="fullpage" />;
  }

  // Error state
  if (cartState === 'error') {
    return (
      <div className={styles.cartPage}>
        <div className="container">
          <div className={styles.content}>
            <div className={styles.cartSection}>
              <div className={styles.errorContainer}>
                <AlertTriangle size={48} />
                <h2>Error Loading Cart</h2>
                <p>{error}</p>
                <button onClick={loadCart} className={styles.retryBtn}>
                  Try Again
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
                <span className={styles.featureSubtitle}>1-3 Hours</span>
              </div>
            </div>
            <div className={styles.feature}>
              <div className={styles.featureIcon}>
                <ShieldCheck size={20} />
              </div>
              <div className={styles.featureText}>
                <span className={styles.featureTitle}>Shop Easy</span>
                <span className={styles.featureSubtitle}>Quality Products</span>
              </div>
            </div>
            <div className={styles.feature}>
              <div className={styles.featureIcon}>
                <Clock size={20} />
              </div>
              <div className={styles.featureText}>
                <span className={styles.featureTitle}>Buy It, Try It</span>
                <span className={styles.featureSubtitle}>Satisfaction Guaranteed</span>
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
              <p className={styles.itemCount}>
                {cartItems.length} Item{cartItems.length !== 1 ? 's' : ''} in your cart
              </p>
            </div>

            {cartState === 'empty' ? (
              <div className={styles.emptyCart}>
                {!isAuthenticated ? (
                  <>
                    <p>Please login to view your cart</p>
                    <button onClick={showLoginModal} className={styles.loginBtn}>
                      Login
                    </button>
                    <Link to="/" className={styles.continueShopping}>
                      Continue Shopping
                    </Link>
                  </>
                ) : (
                  <>
                    <p>Your cart is empty</p>
                    <Link to="/" className={styles.continueShopping}>
                      Continue Shopping
                    </Link>
                  </>
                )}
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

                  {cartItems.map((item) => {
                    const validation = validationIssues.get(item.cartId);
                    const isOutOfStock = validation?.shouldRemove || item.stock === 0;
                    const hasStockIssue = validation && !validation.isValid;
                    const isUpdating = updatingItems.has(item.cartId);

                    return (
                      <div
                        key={item.cartId}
                        className={`${styles.cartItem} ${isOutOfStock ? styles.outOfStock : ''} ${isUpdating ? styles.updating : ''}`}
                      >
                        <img
                          src={item.imageUrl || 'https://via.placeholder.com/150'}
                          alt={item.productName}
                          className={styles.itemImage}
                        />

                        <div className={styles.itemDetails}>
                          <h3 className={styles.itemName}>{item.productName}</h3>
                          <p className={styles.itemVariant}>· {item.variantName}</p>
                          
                          {/* Stock warning */}
                          {isOutOfStock && (
                            <div className={styles.stockWarning}>
                              <AlertTriangle size={16} />
                              <span>Out of Stock</span>
                            </div>
                          )}
                          
                          {hasStockIssue && !isOutOfStock && (
                            <div className={styles.stockWarning}>
                              <AlertTriangle size={16} />
                              <span>Only {validation.availableStock} available</span>
                            </div>
                          )}
                          
                          {!isOutOfStock && item.stock < 10 && (
                            <div className={styles.lowStockWarning}>
                              <span>Only {item.stock} left in stock</span>
                            </div>
                          )}

                          <div className={styles.itemPrice}>
                            <span className={styles.currentPrice}>Rs {item.sellPrice.toFixed(2)}</span>
                          </div>
                        </div>

                        <div className={styles.itemActions}>
                          <div className={styles.quantityControl}>
                            <button
                              onClick={() => updateQuantity(item.cartId, item.quantity - 1)}
                              className={styles.quantityBtn}
                              aria-label="Decrease quantity"
                              disabled={isUpdating || isOutOfStock}
                            >
                              <Minus size={16} />
                            </button>
                            <span className={styles.quantity}>{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(item.cartId, item.quantity + 1)}
                              className={styles.quantityBtn}
                              aria-label="Increase quantity"
                              disabled={isUpdating || isOutOfStock || item.quantity >= item.stock}
                            >
                              <Plus size={16} />
                            </button>
                          </div>

                          <div className={styles.itemTotal}>
                            Rs {(item.sellPrice * item.quantity).toFixed(2)}
                          </div>

                          <button
                            onClick={() => removeItem(item.cartId)}
                            className={styles.removeBtn}
                            aria-label="Remove item"
                            disabled={isUpdating}
                          >
                            <X size={20} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
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
                  <span>Rs {subtotal.toFixed(2)}</span>
                </div>

                <div className={styles.summaryRow}>
                  <span>Delivery</span>
                  <span className={styles.freeDelivery}>Free</span>
                </div>

                <div className={styles.summaryDivider}></div>

                <div className={styles.summaryTotal}>
                  <span>Total</span>
                  <span>Rs {total.toFixed(2)}</span>
                </div>

                {validationIssues.size > 0 && (
                  <div className={styles.validationWarning}>
                    <AlertTriangle size={16} />
                    <span>Please resolve stock issues before checkout</span>
                  </div>
                )}

                <button
                  onClick={handleCheckout}
                  className={styles.checkoutBtn}
                  disabled={validationIssues.size > 0 || cartState === 'validating'}
                >
                  {cartState === 'validating' ? 'Validating...' : 'Proceed to Checkout'}
                </button>

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
