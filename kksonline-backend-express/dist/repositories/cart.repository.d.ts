import type { Cart } from '@prisma/client';
export interface CartItemWithDetails {
    cartId: number;
    variantId: number;
    quantity: number;
    sellPrice: number;
    buyPrice?: number;
    productId: number;
    productName: string;
    variantName: string;
    stock: number;
    isVisible: boolean;
    imageUrl?: string;
}
export interface ShopLimitValidationResult {
    allowed: boolean;
    canAddQuantity: number;
    maxAllowedQuantity: number;
    currentQuantity: number;
    remainingQuantity: number;
}
export interface CartStockValidation {
    cartId: number;
    variantId: number;
    requestedQuantity: number;
    availableStock: number;
    isValid: boolean;
    adjustedQuantity: number;
    shouldRemove: boolean;
    message: string;
}
export declare class CartRepository {
    /**
     * Get cart items for a customer (basic)
     */
    findByCustomerId(customerId: number): Promise<Cart[]>;
    /**
     * Get cart items with full product and variant details
     */
    findWithDetails(customerId: number): Promise<CartItemWithDetails[]>;
    /**
     * Add item to cart or update quantity if exists
     */
    addItem(customerId: number, variantId: number, quantity: number): Promise<Cart>;
    /**
     * Update cart item quantity by cart ID
     */
    updateQuantity(cartId: number, newQuantity: number): Promise<Cart>;
    /**
     * Update cart item quantity by variant ID
     */
    updateByVariant(customerId: number, variantId: number, newQuantity: number): Promise<Cart>;
    /**
     * Remove item from cart by cart ID
     */
    removeItem(cartId: number): Promise<boolean>;
    /**
     * Remove item from cart by variant ID
     */
    removeByVariant(customerId: number, variantId: number): Promise<boolean>;
    /**
     * Clear entire cart for a customer
     */
    clearCart(customerId: number): Promise<boolean>;
    /**
     * Get cart item count
     */
    getItemCount(customerId: number): Promise<number>;
    /**
     * Validate if item can be added to cart (stock check)
     */
    canAddToCart(variantId: number, quantity: number): Promise<boolean>;
    /**
     * Check shop-level quantity limits
     */
    checkShopLimit(customerId: number, variantId: number, newQuantity: number): Promise<ShopLimitValidationResult>;
    /**
     * Validate cart stock and get adjustments
     */
    validateCartStock(customerId: number): Promise<CartStockValidation[]>;
    /**
     * Apply cart stock adjustments
     */
    applyCartAdjustments(customerId: number, adjustments: CartStockValidation[]): Promise<boolean>;
    /**
     * Transfer cart to kiosk
     */
    transferToKiosk(customerId: number, kioskSessionId: string): Promise<boolean>;
    /**
     * Get cart total
     */
    getCartTotal(customerId: number): Promise<{
        subtotal: number;
        itemCount: number;
    }>;
}
export declare const cartRepository: CartRepository;
//# sourceMappingURL=cart.repository.d.ts.map