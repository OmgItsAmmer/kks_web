import { supabaseAdmin } from '../config/supabase.config.js';
import { logger } from '../utils/logger.js';
import { InternalServerError, NotFoundError } from '../utils/errors.js';
export class OrderRepository {
    /**
     * Get orders for a customer
     */
    async findByCustomerId(customerId, params = {}) {
        const { page = 1, pageSize = 20, status } = params;
        const offset = (page - 1) * pageSize;
        let query = supabaseAdmin
            .from('orders')
            .select('*', { count: 'exact' })
            .eq('customer_id', customerId);
        if (status) {
            query = query.eq('status', status);
        }
        const { data, error, count } = await query
            .order('order_date', { ascending: false })
            .range(offset, offset + pageSize - 1);
        if (error) {
            logger.error('Error fetching orders', { error, customerId });
            throw new InternalServerError('Database error');
        }
        return {
            orders: data || [],
            total: count || 0,
        };
    }
    /**
     * Get order by ID
     */
    async findById(orderId) {
        const { data, error } = await supabaseAdmin
            .from('orders')
            .select('*')
            .eq('order_id', orderId)
            .single();
        if (error && error.code !== 'PGRST116') {
            logger.error('Error fetching order', { error, orderId });
            throw new InternalServerError('Database error');
        }
        return data;
    }
    /**
     * Get order with full details
     */
    async findByIdWithDetails(orderId) {
        const { data: order, error } = await supabaseAdmin
            .from('orders')
            .select(`
        *,
        addresses(*),
        customers(customer_id, first_name, last_name, email, phone_number)
      `)
            .eq('order_id', orderId)
            .single();
        if (error) {
            if (error.code === 'PGRST116')
                return null;
            logger.error('Error fetching order with details', { error, orderId });
            throw new InternalServerError('Database error');
        }
        if (!order)
            return null;
        // Get order items
        const { data: items, error: itemsError } = await supabaseAdmin
            .from('order_items')
            .select(`
        product_id,
        variant_id,
        quantity,
        price,
        products(name),
        product_variants(variant_name)
      `)
            .eq('order_id', orderId);
        if (itemsError) {
            logger.error('Error fetching order items', { error: itemsError, orderId });
        }
        const orderItems = (items || []).map((item) => {
            const product = item.products;
            const variant = item.product_variants;
            return {
                productId: item.product_id,
                variantId: item.variant_id,
                productName: product?.name || 'Unknown',
                variantName: variant?.variant_name || 'Unknown',
                quantity: item.quantity,
                price: item.price,
            };
        });
        return {
            ...order,
            items: orderItems,
            address: order.addresses,
            customer: order.customers,
        };
    }
    /**
     * Create order
     */
    async create(order) {
        const { data, error } = await supabaseAdmin
            .from('orders')
            .insert(order)
            .select()
            .single();
        if (error) {
            logger.error('Error creating order', { error });
            throw new InternalServerError('Failed to create order');
        }
        return data;
    }
    /**
     * Insert order items
     */
    async createOrderItems(items) {
        const { error } = await supabaseAdmin
            .from('order_items')
            .insert(items);
        if (error) {
            logger.error('Error creating order items', { error });
            throw new InternalServerError('Failed to create order items');
        }
    }
    /**
     * Update order status
     */
    async updateStatus(orderId, status) {
        const { data, error } = await supabaseAdmin
            .from('orders')
            .update({ status })
            .eq('order_id', orderId)
            .select()
            .single();
        if (error) {
            if (error.code === 'PGRST116') {
                throw new NotFoundError('Order not found');
            }
            logger.error('Error updating order status', { error, orderId });
            throw new InternalServerError('Failed to update order');
        }
        return data;
    }
    /**
     * Update order
     */
    async update(orderId, updates) {
        const { data, error } = await supabaseAdmin
            .from('orders')
            .update(updates)
            .eq('order_id', orderId)
            .select()
            .single();
        if (error) {
            if (error.code === 'PGRST116') {
                throw new NotFoundError('Order not found');
            }
            logger.error('Error updating order', { error, orderId });
            throw new InternalServerError('Failed to update order');
        }
        return data;
    }
    /**
     * Check for duplicate order by idempotency key
     */
    async findByIdempotencyKey(idempotencyKey) {
        const { data, error } = await supabaseAdmin
            .from('orders')
            .select('*')
            .eq('idempotency_key', idempotencyKey)
            .single();
        if (error && error.code !== 'PGRST116') {
            logger.error('Error checking idempotency key', { error, idempotencyKey });
        }
        return data;
    }
    /**
     * Get order items
     */
    async getOrderItems(orderId) {
        const { data, error } = await supabaseAdmin
            .from('order_items')
            .select('*')
            .eq('order_id', orderId);
        if (error) {
            logger.error('Error fetching order items', { error, orderId });
            throw new InternalServerError('Database error');
        }
        return data || [];
    }
    /**
     * Get all orders (admin)
     */
    async findAll(params = {}) {
        const { page = 1, pageSize = 20, status, customerId, startDate, endDate } = params;
        const offset = (page - 1) * pageSize;
        let query = supabaseAdmin
            .from('orders')
            .select('*', { count: 'exact' });
        if (status) {
            query = query.eq('status', status);
        }
        if (customerId) {
            query = query.eq('customer_id', customerId);
        }
        if (startDate) {
            query = query.gte('order_date', startDate);
        }
        if (endDate) {
            query = query.lte('order_date', endDate);
        }
        const { data, error, count } = await query
            .order('order_date', { ascending: false })
            .range(offset, offset + pageSize - 1);
        if (error) {
            logger.error('Error fetching all orders', { error });
            throw new InternalServerError('Database error');
        }
        return {
            orders: data || [],
            total: count || 0,
        };
    }
    /**
     * Get order statistics (admin)
     */
    async getStatistics(params = {}) {
        let query = supabaseAdmin
            .from('orders')
            .select('status, paid_amount');
        if (params.startDate) {
            query = query.gte('order_date', params.startDate);
        }
        if (params.endDate) {
            query = query.lte('order_date', params.endDate);
        }
        const { data, error } = await query;
        if (error) {
            logger.error('Error getting order statistics', { error });
            throw new InternalServerError('Database error');
        }
        const stats = {
            totalOrders: data?.length || 0,
            pendingOrders: 0,
            completedOrders: 0,
            cancelledOrders: 0,
            totalRevenue: 0,
        };
        for (const order of data || []) {
            if (order.status === 'pending' || order.status === 'processing') {
                stats.pendingOrders++;
            }
            else if (order.status === 'completed' || order.status === 'delivered') {
                stats.completedOrders++;
                stats.totalRevenue += order.paid_amount || 0;
            }
            else if (order.status === 'cancelled') {
                stats.cancelledOrders++;
            }
        }
        return stats;
    }
}
// Export singleton
export const orderRepository = new OrderRepository();
//# sourceMappingURL=order.repository.js.map