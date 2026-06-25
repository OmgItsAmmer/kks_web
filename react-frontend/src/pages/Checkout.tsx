import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ShieldCheck, Truck, Award, Lock, MapPin, AlertTriangle, Store, Copy, ExternalLink } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useSnackbar } from '../contexts/SnackbarContext';
import Loader from '../components/Loader';
// TEMP: Advance payment receipt + bank details disabled — see src/config/feature-flags.ts
import { checkoutService } from '../services/checkout.service';
import { cartService } from '../services/cart.service';
import type { CartItem } from '../types/cart';
import styles from './Checkout.module.css';

type CheckoutState = 'loading' | 'ready' | 'processing' | 'success' | 'error';

interface LocationState {
  cartItems?: CartItem[];
  subtotal?: number;
  itemCount?: number;
  isReorder?: boolean;
  isCollectionCheckout?: boolean;
  collectionId?: number;
  collectionName?: string;
}

const STORE_MAP_URL = 'https://maps.app.goo.gl/FnSNEcv2gNYyRhDJA';
const STORE_NAME = 'Kashif Karyana Store';
const STORE_MAP_EMBED_URL =
  'https://maps.google.com/maps?q=29.7973111,72.8596898&z=16&output=embed';

const Checkout: React.FC = () => {
  const { isAuthenticated, showLoginModal } = useAuth();
  const { showWarning, showSuccess } = useSnackbar();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState;

  const [checkoutState, setCheckoutState] = useState<CheckoutState>('loading');
  const [error, setError] = useState<string | null>(null);

  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [subtotal, setSubtotal] = useState(0);

  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [placedOrderId, setPlacedOrderId] = useState<number | null>(null);
  const [placedOrderTotal, setPlacedOrderTotal] = useState<number | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      showLoginModal();
      navigate('/cart');
      return;
    }

    loadData();
  }, [isAuthenticated, location.key]);

  const loadData = async () => {
    try {
      setCheckoutState('loading');
      setError(null);

      if (state?.cartItems && state?.subtotal !== undefined) {
        setCartItems(state.cartItems);
        setSubtotal(state.subtotal);
      } else {
        const cartData = await cartService.getCart();
        setCartItems(cartData.items);
        setSubtotal(cartData.subtotal);
      }

      setCheckoutState('ready');
    } catch (err: any) {
      console.error('Error loading checkout data:', err);
      setError(err.message || 'Failed to load checkout data');
      setCheckoutState('error');
    }
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!cartItems || cartItems.length === 0) {
      if (state?.isReorder) {
        showWarning('No items available to reorder. All items may be out of stock.');
      } else {
        showWarning('Your cart is empty. Please add items before checkout.');
      }
      navigate('/cart');
      return;
    }

    if (!fullName || !phoneNumber) {
      showWarning('Please provide your full name and phone number');
      return;
    }

    try {
      setCheckoutState('processing');
      setError(null);

      const checkoutItems = cartItems.map((item) => {
        const cartItem: {
          variantId: number;
          quantity: number;
          sellPrice: number;
          buyPrice?: number;
        } = {
          variantId: Number(item.variantId),
          quantity: Number(item.quantity),
          sellPrice: Number(item.sellPrice),
        };

        if (item.buyPrice !== undefined && item.buyPrice !== null) {
          cartItem.buyPrice = Number(item.buyPrice);
        }

        return cartItem;
      });

      if (!checkoutItems || checkoutItems.length === 0) {
        throw new Error('Cart is empty. Please add items to cart before checkout.');
      }

      const checkoutRequest = {
        addressId: 0,
        shippingMethod: 'pickup' as const,
        paymentMethod: 'cod' as const,
        cartItems: checkoutItems,
      };

      const result = await checkoutService.createOrder(checkoutRequest);

      setPlacedOrderId(result.orderId ?? null);
      setPlacedOrderTotal(result.total ?? null);
      setCheckoutState('success');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      window.dispatchEvent(new CustomEvent('cart-updated'));
    } catch (err: any) {
      console.error('Error processing checkout:', err);

      if (err.status === 422 || err.statusCode === 422) {
        let errorMessage = 'Validation failed. Please check your input.';

        if (err.errors) {
          const errorDetails = Object.entries(err.errors)
            .flatMap(([field, messages]) => {
              const msgArray = Array.isArray(messages) ? messages : [messages];
              return msgArray.map((msg) => `${field}: ${msg}`);
            })
            .join('\n');

          if (errorDetails) {
            errorMessage = `${errorMessage}\n\n${errorDetails}`;
          }
        } else if (err.message) {
          errorMessage = err.message;
        }

        setError(errorMessage);
      } else {
        setError(err.message || 'Failed to process checkout');
      }

      setCheckoutState('error');

      setTimeout(() => {
        setCheckoutState('ready');
      }, 5000);
    }
  };

  const finalTotal = subtotal;

  const handleCopyStoreLink = async () => {
    try {
      await navigator.clipboard.writeText(STORE_MAP_URL);
      showSuccess('Store location link copied!');
    } catch {
      showWarning('Could not copy link. Please copy it manually.');
    }
  };

  if (checkoutState === 'loading') {
    return <Loader message="Loading checkout..." variant="fullpage" />;
  }

  if (checkoutState === 'success') {
    return (
      <div className={styles.checkoutPage}>
        <div className="container">
          <div className={styles.successContainer}>
            <ShieldCheck size={64} />
            <h2>Order Placed Successfully!</h2>
            <p>Thank you for your order. We will have it ready for store pickup.</p>
            {placedOrderId && (
              <p className={styles.successOrderMeta}>
                Order #{placedOrderId}
                {placedOrderTotal != null && ` · Rs ${placedOrderTotal.toFixed(2)}`}
              </p>
            )}
            <button
              type="button"
              className={styles.successContinueBtn}
              onClick={() => navigate('/')}
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.checkoutPage}>
      <div className={styles.featuresBar}>
        <div className="container">
          <div className={styles.features}>
            <div className={styles.feature}>
              <div className={styles.featureIcon}>
                <Lock size={20} />
              </div>
              <div className={styles.featureText}>
                <span className={styles.featureTitle}>Secure Checkout</span>
              </div>
            </div>
            <div className={styles.feature}>
              <div className={styles.featureIcon}>
                <Store size={20} />
              </div>
              <div className={styles.featureText}>
                <span className={styles.featureTitle}>Store Pickup</span>
              </div>
            </div>
            <div className={styles.feature}>
              <div className={styles.featureIcon}>
                <Award size={20} />
              </div>
              <div className={styles.featureText}>
                <span className={styles.featureTitle}>10 Days Warranty</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container">
        <div className={styles.header}>
          <h1 className={styles.title}>Checkout</h1>
          <p className={styles.subtitle}>Complete your purchase securely</p>
        </div>

        {error && checkoutState === 'error' && (
          <div className={styles.errorBanner}>
            <AlertTriangle size={20} />
            <span>{error}</span>
          </div>
        )}

        <div className={styles.content}>
          <div className={styles.formSection}>
            <form onSubmit={handleCheckout}>
              <div className={styles.formGroup}>
                <div className={styles.sectionHeader}>
                  <div className={styles.sectionIcon}>
                    <MapPin size={20} />
                  </div>
                  <h2>Pickup Details</h2>
                </div>

                <div className={styles.customerDetails}>
                  <div className={styles.formRow}>
                    <div className={styles.formField}>
                      <label htmlFor="fullName">Full Name *</label>
                      <input
                        type="text"
                        id="fullName"
                        name="fullName"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                        className={styles.input}
                        placeholder="Enter your full name"
                      />
                    </div>

                    <div className={styles.formField}>
                      <label htmlFor="phoneNumber">Phone Number *</label>
                      <input
                        type="tel"
                        id="phoneNumber"
                        name="phoneNumber"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        required
                        className={styles.input}
                        placeholder="03XX-XXXXXXX"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className={styles.formGroup}>
                <div className={styles.sectionHeader}>
                  <div className={styles.sectionIcon}>
                    <Truck size={20} />
                  </div>
                  <h2>Pickup Option</h2>
                </div>

                <div className={styles.deliveryOptions}>
                  <div className={`${styles.deliveryOption} ${styles.selected}`}>
                    <div className={styles.deliveryInfo}>
                      <div className={styles.deliveryTitle}>
                        <span className={styles.deliveryName}>Store Pickup</span>
                        <span className={styles.deliveryPrice}>Free</span>
                      </div>
                      <p className={styles.deliveryDescription}>
                        Collect your order from our KKS store. Home delivery is temporarily unavailable.
                      </p>
                    </div>
                  </div>
                </div>

                <div className={styles.storeLocation}>
                  <p className={styles.storeLocationTitle}>Store Location</p>
                  <p className={styles.storeLocationName}>{STORE_NAME}</p>

                  <div className={styles.mapEmbed} data-lenis-prevent>
                    <iframe
                      title={`${STORE_NAME} on Google Maps`}
                      src={STORE_MAP_EMBED_URL}
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      allowFullScreen
                    />
                  </div>

                  <div className={styles.copyLinkRow}>
                    <input
                      type="text"
                      readOnly
                      value={STORE_MAP_URL}
                      className={styles.copyLinkInput}
                      aria-label="Store location link"
                      onFocus={(e) => e.target.select()}
                    />
                    <button
                      type="button"
                      className={styles.copyLinkBtn}
                      onClick={handleCopyStoreLink}
                    >
                      <Copy size={16} />
                      Copy
                    </button>
                  </div>

                  <a
                    href={STORE_MAP_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.openMapsLink}
                  >
                    <ExternalLink size={16} />
                    Open in Google Maps
                  </a>
                </div>
              </div>
            </form>
          </div>

          <div className={styles.summarySection}>
            <div className={styles.orderSummary}>
              <h2 className={styles.summaryTitle}>Order Summary</h2>

              <div className={styles.summaryItems}>
                {cartItems.slice(0, 3).map((item, index) => (
                  <div key={`${item.cartId || 'item'}-${item.variantId}-${index}`} className={styles.summaryItem}>
                    <span className={styles.itemName}>
                      {item.productName} ({item.variantName}) x {item.quantity}
                    </span>
                    <span className={styles.itemPrice}>Rs {(item.sellPrice * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
                {cartItems.length > 3 && (
                  <p className={styles.moreItems}>+{cartItems.length - 3} more items</p>
                )}
              </div>

              <div className={styles.summaryRow}>
                <span>Subtotal</span>
                <span>Rs {subtotal.toFixed(2)}</span>
              </div>

              <div className={styles.summaryRow}>
                <span>Pickup</span>
                <span className={styles.freeDelivery}>Free</span>
              </div>

              <div className={styles.summaryDivider}></div>

              <div className={styles.summaryTotal}>
                <span>Total</span>
                <span>Rs {finalTotal.toFixed(2)}</span>
              </div>

              <button
                type="submit"
                onClick={handleCheckout}
                className={styles.checkoutBtn}
                disabled={checkoutState === 'processing'}
              >
                <Lock size={20} />
                {checkoutState === 'processing' ? 'Processing...' : 'Place Order'}
              </button>

              <div className={styles.securityInfo}>
                <div className={styles.securityIcon}>
                  <Lock size={16} />
                </div>
                <div className={styles.securityText}>
                  <p className={styles.securityTitle}>Secure Payment</p>
                  <p className={styles.securitySubtitle}>Your information is safe with us</p>
                </div>
              </div>

              <div className={styles.paymentMethods}>
                <p className={styles.paymentTitle}>Payment Method:</p>
                <div className={styles.paymentIcons}>
                  <span className={styles.paymentIcon}>Cash On Delivery</span>
                </div>
              </div>

              <div className={styles.warranty}>
                <ShieldCheck size={24} />
                <span>10 Days Warranty</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
