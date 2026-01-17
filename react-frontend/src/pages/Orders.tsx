import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Package, ChevronRight } from 'lucide-react';
import { orderService } from '../services/order.service';
import type { Order } from '../services/order.service';
import { useProtectedAction } from '../hooks/useProtectedAction';
import Loader from '../components/Loader';
import styles from './Orders.module.css';

const Orders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;
  const { executeProtectedAction } = useProtectedAction();

  useEffect(() => {
    loadOrders();
  }, [page]);

  const loadOrders = async () => {
    setLoading(true);
    await executeProtectedAction(async () => {
      try {
        const response = await orderService.getOrders(page, pageSize);
        setOrders(response.data);
        setTotal(response.pagination.total);
      } catch (error) {
        console.error('Error loading orders:', error);
      } finally {
        setLoading(false);
      }
    });
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

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="container">
      <div className={styles.ordersPage}>
        <div className={styles.header}>
          <h1>My Orders</h1>
          <p className={styles.subtitle}>Track and manage your orders</p>
        </div>

        {loading ? (
          <Loader message="Loading orders..." variant="inline" />
        ) : orders.length > 0 ? (
          <>
            <div className={styles.ordersList}>
              {orders.map((order) => (
                <Link
                  key={order.order_id}
                  to={`/orders/${order.order_id}`}
                  className={styles.orderCard}
                >
                  <div className={styles.orderHeader}>
                    <div className={styles.orderInfo}>
                      <div className={styles.orderId}>
                        <Package size={20} />
                        <span>Order #{order.order_id}</span>
                      </div>
                      <span className={styles.orderDate}>
                        {formatDate(order.order_date)}
                      </span>
                    </div>
                    <ChevronRight size={20} className={styles.chevron} />
                  </div>

                  <div className={styles.orderDetails}>
                    <div className={styles.orderAmount}>
                      <span className={styles.label}>Total Amount</span>
                      <span className={styles.value}>
                        Rs {Number(order.paid_amount).toLocaleString()}
                      </span>
                    </div>
                    <div className={styles.orderStatus}>
                      <span className={styles.label}>Status</span>
                      <span className={`${styles.statusBadge} ${getStatusColor(order.status)}`}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </span>
                    </div>
                    <div className={styles.orderPayment}>
                      <span className={styles.label}>Payment</span>
                      <span className={styles.value}>
                        {order.payment_method || 'Cash on Delivery'}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {totalPages > 1 && (
              <div className={styles.pagination}>
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className={styles.paginationButton}
                >
                  Previous
                </button>
                <span className={styles.pageInfo}>
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className={styles.paginationButton}
                >
                  Next
                </button>
              </div>
            )}
          </>
        ) : (
          <div className={styles.emptyState}>
            <Package size={64} className={styles.emptyIcon} />
            <h2>No Orders Yet</h2>
            <p>Start shopping to see your orders here</p>
            <Link to="/" className={styles.shopButton}>
              Start Shopping
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default Orders;
