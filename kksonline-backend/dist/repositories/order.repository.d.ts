import type { Tables, InsertTables, UpdateTables, OrderStatus } from '../types/database.types.js';
import type { OrderWithDetails } from '../types/api.types.js';
export declare class OrderRepository {
    /**
     * Get orders for a customer
     */
    findByCustomerId(customerId: number, params?: {
        page?: number;
        pageSize?: number;
        status?: OrderStatus;
    }): Promise<{
        orders: Tables<'orders'>[];
        total: number;
    }>;
    /**
     * Get order by ID
     */
    findById(orderId: number): Promise<Tables<'orders'> | null>;
    /**
     * Get order with full details
     */
    findByIdWithDetails(orderId: number): Promise<OrderWithDetails | null>;
    /**
     * Create order
     */
    create(order: InsertTables<'orders'>): Promise<Tables<'orders'>>;
    /**
     * Insert order items
     */
    createOrderItems(items: {
        order_id: number;
        product_id: number;
        variant_id: number;
        quantity: number;
        price: number;
        total_buy_price?: number;
    }[]): Promise<void>;
    /**
     * Update order status
     */
    updateStatus(orderId: number, status: OrderStatus): Promise<Tables<'orders'>>;
    /**
     * Update order
     */
    update(orderId: number, updates: UpdateTables<'orders'>): Promise<Tables<'orders'>>;
    /**
     * Check for duplicate order by idempotency key
     */
    findByIdempotencyKey(idempotencyKey: string): Promise<Tables<'orders'> | null>;
    /**
     * Get order items
     */
    getOrderItems(orderId: number): Promise<Tables<'order_items'>[]>;
    /**
     * Get all orders (admin)
     */
    findAll(params?: {
        page?: number;
        pageSize?: number;
        status?: OrderStatus;
        customerId?: number;
        startDate?: string;
        endDate?: string;
    }): Promise<{
        orders: Tables<'orders'>[];
        total: number;
    }>;
    /**
     * Get order statistics (admin)
     */
    getStatistics(params?: {
        startDate?: string;
        endDate?: string;
    }): Promise<{
        totalOrders: number;
        pendingOrders: number;
        completedOrders: number;
        cancelledOrders: number;
        totalRevenue: number;
    }>;
}
export declare const orderRepository: OrderRepository;
//# sourceMappingURL=order.repository.d.ts.map