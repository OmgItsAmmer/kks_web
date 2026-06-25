import type { PaymentMethod } from '@prisma/client';
export interface CartItem {
    variantId: number;
    quantity: number;
    sellPrice: number;
    buyPrice?: number;
}
export interface CheckoutRequest {
    cartItems?: CartItem[];
    directCheckout?: {
        variantId: number;
        quantity: number;
        price: number;
    };
    addressId: number;
    shippingMethod: 'shipping' | 'pickup';
    paymentMethod: PaymentMethod;
    idempotencyKey?: string;
    paymentReceiptPath?: string;
}
export interface CheckoutTotals {
    subtotal: number;
    tax: number;
    shipping: number;
    discount: number;
    total: number;
    cost: number;
}
export interface CheckoutResponse {
    success: boolean;
    orderId?: number;
    total?: number;
    message: string;
    errorCode?: string;
}
export declare class CheckoutService {
    /**
     * Process secure checkout
     */
    processCheckout(customerId: number, request: CheckoutRequest, clientInfo?: {
        ip?: string;
        userAgent?: string;
    }): Promise<CheckoutResponse>;
    /**
     * Generate idempotency key for checkout
     */
    private generateIdempotencyKey;
    /**
     * Validate shipping method
     */
    private validateShippingMethod;
    /**
     * Validate advance payment receipt upload when shop requires it
     */
    private validatePaymentReceipt;
    /**
     * Validate cart security (prices, stock, visibility)
     */
    private validateCartSecurity;
    /**
     * Calculate checkout totals
     */
    private calculateTotals;
    /**
     * Reserve inventory using Prisma transaction
     */
    private reserveInventory;
    /**
     * Process payment
     */
    private processPayment;
    /**
     * Create order
     */
    private createOrder;
    /**
     * Confirm inventory reservation (remove reservations, stock already decremented)
     */
    private confirmInventoryReservation;
    /**
     * Rollback inventory reservation
     */
    private rollbackInventoryReservation;
    /**
     * Log security event
     */
    private logSecurityEvent;
    private getSeverityLevel;
}
export declare const checkoutService: CheckoutService;
//# sourceMappingURL=checkout.service.d.ts.map