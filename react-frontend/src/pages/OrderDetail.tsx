import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Package, MapPin, CreditCard, Printer, ArrowLeft, AlertTriangle, X } from 'lucide-react';
import { orderService } from '../services/order.service';
import type { Order } from '../services/order.service';
import { useProtectedAction } from '../hooks/useProtectedAction';
import { productService } from '../services/product.service';
import { useSnackbar } from '../contexts/SnackbarContext';
import Loader from '../components/Loader';
import type { CartItem } from '../types/cart';
import styles from './OrderDetail.module.css';

interface UnavailableItem {
  productName: string;
  variantName: string;
  requestedQuantity: number;
  availableStock: number;
  reason: string;
}

const OrderDetail: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [showUnavailableModal, setShowUnavailableModal] = useState(false);
  const [unavailableItems, setUnavailableItems] = useState<UnavailableItem[]>([]);
  const [availableCartItems, setAvailableCartItems] = useState<CartItem[]>([]);
  const { executeProtectedAction } = useProtectedAction();
  const { showError, showSuccess } = useSnackbar();
  const navigate = useNavigate();

  useEffect(() => {
    if (orderId) {
      loadOrder();
    }
  }, [orderId]);

  const loadOrder = async () => {
    setLoading(true);
    await executeProtectedAction(async () => {
      try {
        const response = await orderService.getOrderById(Number(orderId));
        setOrder(response.data);
      } catch (error) {
        console.error('Error loading order:', error);
      } finally {
        setLoading(false);
      }
    });
  };

  const handlePrintInvoice = () => {
    window.print();
  };

  const handleCheckout = async () => {
    if (!order || !order.items || order.items.length === 0) {
      showError('No items in this order to reorder');
      return;
    }

    setCheckingAvailability(true);

    try {
      const unavailable: UnavailableItem[] = [];
      const available: CartItem[] = [];
      let subtotal = 0;

      // Check each order item for availability
      for (const item of order.items) {
        try {
          // Fetch product details to get current variant information
          const productResponse = await productService.getProductById(item.productId);
          const product = productResponse.data;

          // Find the variant
          const variant = product.variants?.find((v) => v.variant_id === item.variantId);

          if (!variant) {
            unavailable.push({
              productName: item.productName,
              variantName: item.variantName,
              requestedQuantity: item.quantity,
              availableStock: 0,
              reason: 'Product variant no longer available',
            });
            continue;
          }

          // Check if variant is visible
          if (!variant.is_visible) {
            unavailable.push({
              productName: item.productName,
              variantName: item.variantName,
              requestedQuantity: item.quantity,
              availableStock: variant.stock,
              reason: 'Product is not currently available for purchase',
            });
            continue;
          }

          // Check stock availability
          if (variant.stock < item.quantity) {
            if (variant.stock > 0) {
              // Partial availability
              unavailable.push({
                productName: item.productName,
                variantName: item.variantName,
                requestedQuantity: item.quantity,
                availableStock: variant.stock,
                reason: `Only ${variant.stock} units available (you ordered ${item.quantity})`,
              });
            } else {
              // Out of stock
              unavailable.push({
                productName: item.productName,
                variantName: item.variantName,
                requestedQuantity: item.quantity,
                availableStock: 0,
                reason: 'Out of stock',
              });
            }
            continue;
          }

          // Item is available - add to cart items
          const cartItem: CartItem = {
            cartId: 0, // Temporary ID for reorder flow
            variantId: variant.variant_id,
            quantity: item.quantity,
            sellPrice: variant.sell_price,
            buyPrice: variant.buy_price,
            productId: item.productId,
            productName: item.productName,
            variantName: item.variantName,
            stock: variant.stock,
            isVisible: variant.is_visible,
            imageUrl: item.imageUrl,
          };
          available.push(cartItem);
          subtotal += variant.sell_price * item.quantity;
        } catch (error) {
          console.error(`Error checking availability for ${item.productName}:`, error);
          unavailable.push({
            productName: item.productName,
            variantName: item.variantName,
            requestedQuantity: item.quantity,
            availableStock: 0,
            reason: 'Unable to verify availability',
          });
        }
      }

      setCheckingAvailability(false);

      // If some items are unavailable, show modal
      if (unavailable.length > 0) {
        setUnavailableItems(unavailable);
        setAvailableCartItems(available);
        setShowUnavailableModal(true);
      } else {
        // All items available, proceed to checkout
        proceedToCheckout(available, subtotal);
      }
    } catch (error) {
      console.error('Error checking item availability:', error);
      showError('Failed to check item availability. Please try again.');
      setCheckingAvailability(false);
    }
  };

  const proceedToCheckout = (cartItems: CartItem[], subtotal: number) => {
    if (cartItems.length === 0) {
      showError('No items available to checkout');
      return;
    }

    showSuccess(`Proceeding with ${cartItems.length} item(s)`);
    navigate('/checkout', {
      state: {
        cartItems,
        subtotal,
        itemCount: cartItems.reduce((sum, item) => sum + item.quantity, 0),
        isReorder: true,
      },
    });
  };

  const handleProceedWithoutUnavailable = () => {
    setShowUnavailableModal(false);
    const subtotal = availableCartItems.reduce(
      (sum, item) => sum + item.sellPrice * item.quantity,
      0
    );
    proceedToCheckout(availableCartItems, subtotal);
  };

  const handleCancelCheckout = () => {
    setShowUnavailableModal(false);
    setUnavailableItems([]);
    setAvailableCartItems([]);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return styles.statusPending;
      case 'processing':
        return styles.statusProcessing;
      case 'confirmed':
      case 'ready':
        return styles.statusConfirmed;
      case 'delivered':
      case 'completed':
        return styles.statusDelivered;
      case 'cancelled':
        return styles.statusCancelled;
      default:
        return '';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-PK', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return <Loader message="Loading order details..." variant="fullpage" />;
  }

  if (!order) {
    return (
      <div className="container">
        <div className={styles.error}>Order not found</div>
      </div>
    );
  }

  const subtotal = Number(order.sub_total);
  const discount = Number(order.discount);
  const tax = Number(order.tax);
  const shippingFee = Number(order.shipping_fee);
  const total = Number(order.paid_amount);

  return (
    <div className="container">
      <div className={styles.orderDetail}>
        {/* Back Button */}
        <Link to="/orders" className={styles.backButton}>
          <ArrowLeft size={20} />
          Back to Orders
        </Link>

        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerInfo}>
            <h1>Order #{order.order_id}</h1>
            <p className={styles.orderDate}>{formatDate(order.order_date)}</p>
          </div>
          <div className={styles.headerActions}>
            <span className={`${styles.statusBadge} ${getStatusColor(order.status)}`}>
              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
            </span>
            <button onClick={handlePrintInvoice} className={styles.printButton}>
              <Printer size={18} />
              Print Invoice
            </button>
          </div>
        </div>

        <div className={styles.content}>
          {/* Order Items */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <Package size={20} />
              Order Items
            </h2>
            <div className={styles.itemsList}>
              {order.items && order.items.length > 0 ? (
                order.items.map((item, index) => (
                  <div key={index} className={styles.item}>
                    {item.imageUrl && (
                      <img
                        src={item.imageUrl}
                        alt={item.productName}
                        className={styles.itemImage}
                      />
                    )}
                    <div className={styles.itemInfo}>
                      <h3 className={styles.itemName}>{item.productName}</h3>
                      <p className={styles.itemVariant}>{item.variantName}</p>
                    </div>
                    <div className={styles.itemQuantity}>
                      Qty: {item.quantity}
                    </div>
                    <div className={styles.itemPrice}>
                      Rs {Number(item.price).toLocaleString()}
                    </div>
                  </div>
                ))
              ) : (
                <p className={styles.noItems}>No items in this order</p>
              )}
            </div>
          </div>

          {/* Delivery Address */}
          {order.address && (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>
                <MapPin size={20} />
                Delivery Address
              </h2>
              <div className={styles.addressCard}>
                <p className={styles.addressName}>{order.address.full_name}</p>
                <p className={styles.addressText}>{order.address.shipping_address}</p>
                <p className={styles.addressText}>
                  {order.address.city}, {order.address.postal_code}
                </p>
                <p className={styles.addressText}>{order.address.country}</p>
                <p className={styles.addressPhone}>{order.address.phone_number}</p>
              </div>
            </div>
          )}

          {/* Payment Details */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <CreditCard size={20} />
              Payment Details
            </h2>
            <div className={styles.paymentCard}>
              <div className={styles.paymentRow}>
                <span>Payment Method</span>
                <span className={styles.paymentValue}>
                  {order.payment_method || 'Cash on Delivery'}
                </span>
              </div>
              <div className={styles.paymentRow}>
                <span>Subtotal</span>
                <span>Rs {subtotal.toLocaleString()}</span>
              </div>
              {discount > 0 && (
                <div className={styles.paymentRow}>
                  <span>Discount</span>
                  <span className={styles.discount}>- Rs {discount.toLocaleString()}</span>
                </div>
              )}
              {tax > 0 && (
                <div className={styles.paymentRow}>
                  <span>Tax</span>
                  <span>Rs {tax.toLocaleString()}</span>
                </div>
              )}
              {shippingFee > 0 && (
                <div className={styles.paymentRow}>
                  <span>Shipping Fee</span>
                  <span>Rs {shippingFee.toLocaleString()}</span>
                </div>
              )}
              <div className={`${styles.paymentRow} ${styles.paymentTotal}`}>
                <span>Total Amount</span>
                <span>Rs {total.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className={styles.actions}>
          <button 
            onClick={handleCheckout} 
            className={styles.checkoutButton}
            disabled={checkingAvailability}
          >
            {checkingAvailability ? 'Checking Availability...' : 'Checkout Again'}
          </button>
        </div>
      </div>

      {/* Unavailable Items Modal */}
      {showUnavailableModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitle}>
                <AlertTriangle size={24} color="#f59e0b" />
                <h2>Some Items Are Unavailable</h2>
              </div>
              <button 
                onClick={handleCancelCheckout}
                className={styles.modalClose}
                aria-label="Close"
              >
                <X size={24} />
              </button>
            </div>

            <div className={styles.modalContent}>
              <p className={styles.modalDescription}>
                The following items from your order are not available:
              </p>

              <div className={styles.unavailableList}>
                {unavailableItems.map((item, index) => (
                  <div key={index} className={styles.unavailableItem}>
                    <div className={styles.unavailableItemInfo}>
                      <strong>{item.productName}</strong>
                      <span className={styles.unavailableVariant}>{item.variantName}</span>
                    </div>
                    <div className={styles.unavailableReason}>
                      <span className={styles.reasonBadge}>{item.reason}</span>
                    </div>
                  </div>
                ))}
              </div>

              {availableCartItems.length > 0 ? (
                <p className={styles.availableInfo}>
                  ✓ {availableCartItems.length} item(s) are still available and can be ordered
                </p>
              ) : (
                <p className={styles.noAvailableInfo}>
                  Unfortunately, none of the items from this order are currently available.
                </p>
              )}
            </div>

            <div className={styles.modalActions}>
              <button
                onClick={handleCancelCheckout}
                className={styles.modalCancelButton}
              >
                Cancel
              </button>
              {availableCartItems.length > 0 && (
                <button
                  onClick={handleProceedWithoutUnavailable}
                  className={styles.modalProceedButton}
                >
                  Proceed with Available Items ({availableCartItems.length})
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderDetail;
