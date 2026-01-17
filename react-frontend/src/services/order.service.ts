import API_ENDPOINTS from './api.config';
import { apiRequest } from './api.config';

export interface OrderItem {
    productId: number;
    variantId: number;
    productName: string;
    variantName: string;
    quantity: number;
    price: number;
    imageUrl?: string;
}

export interface OrderAddress {
    full_name: string;
    shipping_address: string;
    city: string;
    postal_code: string;
    phone_number: string;
    country: string;
}

export interface Order {
    order_id: number;
    order_date: string;
    sub_total: number;
    status: string;
    saletype: string;
    address_id: number;
    paid_amount: number;
    discount: number;
    tax: number;
    shipping_fee: number;
    customer_id: number;
    payment_method: string;
    items?: OrderItem[];
    address?: OrderAddress;
}

export interface ApiResponse<T> {
    success: boolean;
    data: T;
    message?: string;
}

export interface PaginatedResponse<T> {
    success: boolean;
    data: T[];
    pagination: {
        page: number;
        pageSize: number;
        total: number;
        totalPages: number;
    };
}

class OrderService {
    constructor() {
        // Service uses apiRequest which handles base URL
    }

    /**
     * Get all orders for the authenticated customer
     */
    async getOrders(page = 1, pageSize = 20, status?: string): Promise<PaginatedResponse<Order>> {
        const params = new URLSearchParams({
            page: page.toString(),
            pageSize: pageSize.toString(),
        });

        if (status) {
            params.append('status', status);
        }

        const url = `/orders?${params.toString()}`;
        
        return await apiRequest<PaginatedResponse<Order>>(url, {
            method: 'GET',
        });
    }

    /**
     * Get order details by ID
     */
    async getOrderById(orderId: number): Promise<ApiResponse<Order>> {
        const url = `/orders/${orderId}`;
        
        return await apiRequest<ApiResponse<Order>>(url, {
            method: 'GET',
        });
    }

    /**
     * Cancel an order
     */
    async cancelOrder(orderId: number): Promise<ApiResponse<Order>> {
        const url = `/orders/${orderId}/cancel`;
        
        return await apiRequest<ApiResponse<Order>>(url, {
            method: 'POST',
        });
    }

    /**
     * Get order items
     */
    async getOrderItems(orderId: number): Promise<ApiResponse<OrderItem[]>> {
        const url = `/orders/${orderId}/items`;
        
        return await apiRequest<ApiResponse<OrderItem[]>>(url, {
            method: 'GET',
        });
    }
}

export const orderService = new OrderService();
