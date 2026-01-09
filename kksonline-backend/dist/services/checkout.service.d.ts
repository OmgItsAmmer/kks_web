import type { CheckoutRequest, CheckoutResponse } from '../types/api.types.js';
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
     * Validate cart security (prices, stock, visibility)
     */
    private validateCartSecurity;
    /**
     * Calculate checkout totals
     */
    private calculateTotals;
    /**
     * Reserve inventory
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
     * Confirm inventory reservation (reduce stock)
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