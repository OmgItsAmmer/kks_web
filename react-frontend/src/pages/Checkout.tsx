import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ShieldCheck, Truck, Award, Lock, MapPin, AlertTriangle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useSnackbar } from '../contexts/SnackbarContext';
import Loader from '../components/Loader';
import MapLocationPicker from '../components/GoogleMapLocationPicker';
import { addressService } from '../services/address.service';
import { checkoutService } from '../services/checkout.service';
import { cartService } from '../services/cart.service';
import type { CreateAddressRequest } from '../types/address';
import type { CartItem } from '../types/cart';
import styles from './Checkout.module.css';

type CheckoutState = 'loading' | 'ready' | 'processing' | 'success' | 'error';

interface LocationState {
  cartItems?: CartItem[];
  subtotal?: number;
  itemCount?: number;
  isReorder?: boolean;
}

const Checkout: React.FC = () => {
  const { isAuthenticated, showLoginModal } = useAuth();
  const { showError, showWarning } = useSnackbar();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState;

  const [checkoutState, setCheckoutState] = useState<CheckoutState>('loading');
  const [shippingMethod, setShippingMethod] = useState<'shipping' | 'pickup'>('shipping');
  const [error, setError] = useState<string | null>(null);

  // Cart data
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [subtotal, setSubtotal] = useState(0);

  // Google Maps location data
  const [selectedLocation, setSelectedLocation] = useState<{
    latitude: number;
    longitude: number;
    place_id?: string;
    formatted_address?: string;
    address_components?: any;
  } | null>(null);
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [saveAddress, setSaveAddress] = useState(false);

  // Load initial data
  useEffect(() => {
    if (!isAuthenticated) {
      showLoginModal();
      navigate('/cart');
      return;
    }

    loadData();
  }, [isAuthenticated]);

  /**
   * Load cart data
   */
  const loadData = async () => {
    try {
      setCheckoutState('loading');
      setError(null);

      // Load cart data (from state or fetch)
      if (state?.cartItems && state?.subtotal) {
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

  /**
   * Handle location selection from Google Maps
   */
  const handleLocationSelect = (location: {
    latitude: number;
    longitude: number;
    place_id?: string;
    formatted_address?: string;
    address_components?: any;
  }) => {
    setSelectedLocation(location);
  };

  /**
   * Process checkout
   */
  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate cart is not empty
    if (!cartItems || cartItems.length === 0) {
      if (state?.isReorder) {
        showWarning('No items available to reorder. All items may be out of stock.');
      } else {
        showWarning('Your cart is empty. Please add items before checkout.');
      }
      navigate('/cart');
      return;
    }

    // Validation
    if (!selectedLocation) {
      showWarning('Please select a delivery location on the map');
      return;
    }

    if (!fullName || !phoneNumber) {
      showWarning('Please provide your full name and phone number');
      return;
    }

    // Extract address components from Google Maps data
    const addressComponents = selectedLocation.address_components || {};
    
    try {
      setCheckoutState('processing');
      setError(null);

      // Prepare cart items for checkout
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
        
        // Only include buyPrice if it exists
        if (item.buyPrice !== undefined && item.buyPrice !== null) {
          cartItem.buyPrice = Number(item.buyPrice);
        }
        
        return cartItem;
      });

      // Validate cart items
      if (!checkoutItems || checkoutItems.length === 0) {
        throw new Error('Cart is empty. Please add items to cart before checkout.');
      }

      // Helper function to get non-empty value or undefined
      const getNonEmpty = (value: string | undefined) => {
        const trimmed = value?.trim();
        return trimmed && trimmed.length > 0 ? trimmed : undefined;
      };

      // Create address with Google Maps data - only include non-empty fields
      const addressData: CreateAddressRequest = {
        fullName: fullName.trim(),
        phoneNumber: phoneNumber.trim(),
        country: 'Pakistan',
        latitude: selectedLocation.latitude,
        longitude: selectedLocation.longitude,
      };

      // Only add optional fields if they have non-empty values
      const formattedAddress = getNonEmpty(selectedLocation.formatted_address);
      if (formattedAddress) {
        addressData.shippingAddress = formattedAddress;
        addressData.formatted_address = formattedAddress;
      }

      const city = getNonEmpty(
        addressComponents.city || 
        addressComponents.locality || 
        addressComponents.town || 
        addressComponents.village
      );
      if (city) {
        addressData.city = city;
      }

      const postalCode = getNonEmpty(addressComponents.postal_code);
      if (postalCode) {
        addressData.postalCode = postalCode;
      }

      const placeId = getNonEmpty(selectedLocation.place_id);
      if (placeId) {
        addressData.place_id = placeId;
      }

      // Create address (save if checkbox is checked, otherwise temporary)
      let addressIdToUse: number;
      
      try {
        const addressResponse = await addressService.createAddress(addressData);
        addressIdToUse = addressResponse.data.address_id;
        
        // If user doesn't want to save, we'll still create it but it will be associated with the order
        // The backend can handle cleanup of unsaved addresses if needed
      } catch (err: any) {
        console.error('Error creating address:', err);
        showError(err.message || 'Failed to create address');
        return;
      }

      // Create checkout request (COD only)
      const checkoutRequest = {
        addressId: addressIdToUse,
        shippingMethod: shippingMethod as 'shipping' | 'pickup',
        paymentMethod: 'cod' as const,
        cartItems: checkoutItems,
      };

      console.log('[Checkout] Sending checkout request:', checkoutRequest);

      const result = await checkoutService.createOrder(checkoutRequest);

      setCheckoutState('success');

      // Redirect to order confirmation
      setTimeout(() => {
        navigate(`/orders/${result.orderId}`, { 
          state: { 
            message: 'Order placed successfully!',
            orderId: result.orderId,
            total: result.total 
          } 
        });
      }, 1000);
    } catch (err: any) {
      console.error('Error processing checkout:', err);
      
      // Handle validation errors with details
      if (err.status === 422 || err.statusCode === 422) {
        let errorMessage = 'Validation failed. Please check your input.';
        
        // Add validation error details if available
        if (err.errors) {
          const errorDetails = Object.entries(err.errors)
            .flatMap(([field, messages]) => {
              const msgArray = Array.isArray(messages) ? messages : [messages];
              return msgArray.map(msg => `${field}: ${msg}`);
            })
            .join('\n');
          
          if (errorDetails) {
            errorMessage = `${errorMessage}\n\n${errorDetails}`;
          }
        } else if (err.message) {
          errorMessage = err.message;
        }
        
        console.error('[Checkout] Validation errors:', err.errors || err.response);
        setError(errorMessage);
      } else {
        setError(err.message || 'Failed to process checkout');
      }
      
      setCheckoutState('error');
      
      // Reset to ready state after showing error
      setTimeout(() => {
        setCheckoutState('ready');
      }, 5000);
    }
  };

  // Calculate totals
  const deliveryFee = shippingMethod === 'shipping' ? 0 : 0; // Free delivery
  const finalTotal = subtotal + deliveryFee;

  // Loading state
  if (checkoutState === 'loading') {
    return <Loader message="Loading checkout..." variant="fullpage" />;
  }

  // Success state
  if (checkoutState === 'success') {
    return (
      <div className={styles.checkoutPage}>
        <div className="container">
          <div className={styles.successContainer}>
            <ShieldCheck size={64} />
            <h2>Order Placed Successfully!</h2>
            <p>Redirecting to order details...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.checkoutPage}>
      {/* Features Bar */}
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
                <Truck size={20} />
              </div>
              <div className={styles.featureText}>
                <span className={styles.featureTitle}>Free Delivery</span>
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

      {/* Main Content */}
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
          {/* Checkout Form */}
          <div className={styles.formSection}>
            <form onSubmit={handleCheckout}>
              {/* Delivery Address */}
              <div className={styles.formGroup}>
                <div className={styles.sectionHeader}>
                  <div className={styles.sectionIcon}>
                    <MapPin size={20} />
                  </div>
                  <h2>Delivery Address</h2>
                </div>

                {/* Map Location Picker */}
                <div className={styles.mapPickerContainer}>
                  <MapLocationPicker
                    onLocationSelect={handleLocationSelect}
                    height="400px"
                    required
                  />
                </div>

                {/* Customer Details */}
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

                  {/* Display selected address */}
                  {selectedLocation?.formatted_address && (
                    <div className={styles.selectedAddress}>
                      <MapPin size={16} />
                      <span>{selectedLocation.formatted_address}</span>
                    </div>
                  )}

                  {/* Save address checkbox */}
                  <div className={styles.checkboxField}>
                    <input
                      type="checkbox"
                      id="saveAddress"
                      checked={saveAddress}
                      onChange={(e) => setSaveAddress(e.target.checked)}
                      className={styles.checkbox}
                    />
                    <label htmlFor="saveAddress">Save this address for later use</label>
                  </div>
                </div>
              </div>

              {/* Delivery Options */}
              <div className={styles.formGroup}>
                <div className={styles.sectionHeader}>
                  <div className={styles.sectionIcon}>
                    <Truck size={20} />
                  </div>
                  <h2>Delivery Options</h2>
                </div>

                <div className={styles.deliveryOptions}>
                  <label className={`${styles.deliveryOption} ${shippingMethod === 'shipping' ? styles.selected : ''}`}>
                    <input
                      type="radio"
                      name="delivery"
                      value="shipping"
                      checked={shippingMethod === 'shipping'}
                      onChange={() => setShippingMethod('shipping')}
                      className={styles.radio}
                    />
                    <div className={styles.deliveryInfo}>
                      <div className={styles.deliveryTitle}>
                        <span className={styles.deliveryName}>Home Delivery (1-3 Hours)</span>
                        <span className={styles.deliveryPrice}>Free</span>
                      </div>
                      <p className={styles.deliveryDescription}>Free delivery to your doorstep</p>
                    </div>
                  </label>

                  <label className={`${styles.deliveryOption} ${shippingMethod === 'pickup' ? styles.selected : ''}`}>
                    <input
                      type="radio"
                      name="delivery"
                      value="pickup"
                      checked={shippingMethod === 'pickup'}
                      onChange={() => setShippingMethod('pickup')}
                      className={styles.radio}
                    />
                    <div className={styles.deliveryInfo}>
                      <div className={styles.deliveryTitle}>
                        <span className={styles.deliveryName}>Store Pickup</span>
                        <span className={styles.deliveryPrice}>Free</span>
                      </div>
                      <p className={styles.deliveryDescription}>Pick up from our store</p>
                    </div>
                  </label>
                </div>
              </div>

            </form>
          </div>

          {/* Order Summary */}
          <div className={styles.summarySection}>
            <div className={styles.orderSummary}>
              <h2 className={styles.summaryTitle}>Order Summary</h2>

              {/* Cart Items */}
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
                <span>Delivery</span>
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

              {/* Payment Method */}
              <div className={styles.paymentMethods}>
                <p className={styles.paymentTitle}>Payment Method:</p>
                <div className={styles.paymentIcons}>
                  <span className={styles.paymentIcon}>Cash On Delivery</span>
                </div>
              </div>

              {/* Warranty Badge */}
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
