import { Prisma } from '../config/database.config';
import type { Order, OrderItem, Address, Customer, OrderStatus } from '@prisma/client';
export interface OrderItemWithProduct {
    productId: number;
    variantId: number;
    productName: string;
    variantName: string;
    quantity: number;
    price: number;
    imageUrl?: string;
}
export interface OrderWithDetails extends Order {
    items?: OrderItemWithProduct[];
    address?: Address;
    customer?: Pick<Customer, 'customer_id' | 'first_name' | 'last_name' | 'email' | 'phone_number'>;
}
export declare class OrderRepository {
    /**
     * Get orders for a customer
     */
    findByCustomerId(customerId: number, params?: {
        page?: number;
        pageSize?: number;
        status?: OrderStatus;
    }): Promise<{
        orders: Order[];
        total: number;
    }>;
    /**
     * Get order by ID
     */
    findById(orderId: number): Promise<Order | null>;
    /**
     * Get order with full details
     */
    findByIdWithDetails(orderId: number): Promise<OrderWithDetails | null>;
    /**
     * Create order
     */
    create(orderData: Prisma.OrderCreateInput): Promise<Order>;
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
    updateStatus(orderId: number, status: OrderStatus): Promise<Order>;
    /**
     * Update order
     */
    update(orderId: number, updates: Prisma.OrderUpdateInput): Promise<Order>;
    /**
     * Check for duplicate order by idempotency key
     */
    findByIdempotencyKey(idempotencyKey: string): Promise<Order | null>;
    /**
     * Get order items
     */
    getOrderItems(orderId: number): Promise<OrderItem[]>;
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
        orders: Order[];
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