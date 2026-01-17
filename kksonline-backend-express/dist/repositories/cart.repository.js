"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cartRepository = exports.CartRepository = void 0;
const database_config_1 = require("../config/database.config");
const logger_1 = require("../utils/logger");
const errors_1 = require("../utils/errors");
class CartRepository {
    /**
     * Get cart items for a customer (basic)
     */
    async findByCustomerId(customerId) {
        try {
            const cartItems = await database_config_1.db.cart.findMany({
                where: { customer_id: customerId },
            });
            return cartItems;
        }
        catch (error) {
            logger_1.logger.error('Error fetching cart items', { error, customerId });
            throw new errors_1.InternalServerError('Database error');
        }
    }
    /**
     * Get cart items with full product and variant details
     */
    async findWithDetails(customerId) {
        try {
            const cartItems = await database_config_1.db.cart.findMany({
                where: { customer_id: customerId },
                include: {
                    variant: {
                        include: {
                            product: {
                                select: {
                                    product_id: true,
                                    name: true,
                                    isVisible: true,
                                },
                            },
                        },
                    },
                },
            });
            return cartItems
                .filter((item) => item.variant)
                .map((item) => ({
                cartId: item.cart_id,
                variantId: item.variant.variant_id,
                quantity: parseInt(item.quantity, 10),
                sellPrice: Number(item.variant.sell_price),
                buyPrice: Number(item.variant.buy_price),
                productId: item.variant.product_id,
                productName: item.variant.product.name,
                variantName: item.variant.variant_name,
                stock: item.variant.stock || 0,
                isVisible: (item.variant.is_visible ?? true) && (item.variant.product.isVisible ?? true),
            }));
        }
        catch (error) {
            logger_1.logger.error('Error fetching cart with details', { error, customerId });
            throw new errors_1.InternalServerError('Database error');
        }
    }
    /**
     * Add item to cart or update quantity if exists
     */
    async addItem(customerId, variantId, quantity) {
        try {
            // Check if item already exists in cart
            const existing = await database_config_1.db.cart.findFirst({
                where: {
                    customer_id: customerId,
                    variant_id: variantId,
                },
            });
            if (existing) {
                // Update existing item
                const newQuantity = parseInt(existing.quantity, 10) + quantity;
                return this.updateQuantity(existing.cart_id, newQuantity);
            }
            // Insert new item
            const cartItem = await database_config_1.db.cart.create({
                data: {
                    customer_id: customerId,
                    variant_id: variantId,
                    quantity: quantity.toString(),
                },
            });
            return cartItem;
        }
        catch (error) {
            logger_1.logger.error('Error adding to cart', { error, customerId, variantId });
            throw new errors_1.InternalServerError('Failed to add item to cart');
        }
    }
    /**
     * Update cart item quantity by cart ID
     */
    async updateQuantity(cartId, newQuantity) {
        if (newQuantity <= 0) {
            await this.removeItem(cartId);
            throw new errors_1.BadRequestError('Item removed from cart');
        }
        try {
            const cartItem = await database_config_1.db.cart.update({
                where: { cart_id: cartId },
                data: { quantity: newQuantity.toString() },
            });
            return cartItem;
        }
        catch (error) {
            if (error.code === 'P2025') {
                throw new errors_1.NotFoundError('Cart item not found');
            }
            logger_1.logger.error('Error updating cart quantity', { error, cartId });
            throw new errors_1.InternalServerError('Failed to update cart');
        }
    }
    /**
     * Update cart item quantity by variant ID
     */
    async updateByVariant(customerId, variantId, newQuantity) {
        if (newQuantity <= 0) {
            await this.removeByVariant(customerId, variantId);
            throw new errors_1.BadRequestError('Item removed from cart');
        }
        try {
            const cartItem = await database_config_1.db.cart.findFirst({
                where: {
                    customer_id: customerId,
                    variant_id: variantId,
                },
            });
            if (!cartItem) {
                throw new errors_1.NotFoundError('Cart item not found');
            }
            const updated = await database_config_1.db.cart.update({
                where: { cart_id: cartItem.cart_id },
                data: { quantity: newQuantity.toString() },
            });
            return updated;
        }
        catch (error) {
            if (error instanceof errors_1.NotFoundError)
                throw error;
            logger_1.logger.error('Error updating cart by variant', { error, customerId, variantId });
            throw new errors_1.InternalServerError('Failed to update cart');
        }
    }
    /**
     * Remove item from cart by cart ID
     */
    async removeItem(cartId) {
        try {
            await database_config_1.db.cart.delete({
                where: { cart_id: cartId },
            });
            return true;
        }
        catch (error) {
            // Handle case where item doesn't exist (P2025)
            if (error.code === 'P2025') {
                throw new errors_1.NotFoundError('Cart item not found');
            }
            logger_1.logger.error('Error removing cart item', { error, cartId });
            throw new errors_1.InternalServerError('Failed to remove item from cart');
        }
    }
    /**
     * Remove item from cart by variant ID
     */
    async removeByVariant(customerId, variantId) {
        try {
            await database_config_1.db.cart.deleteMany({
                where: {
                    customer_id: customerId,
                    variant_id: variantId,
                },
            });
            return true;
        }
        catch (error) {
            logger_1.logger.error('Error removing cart item by variant', { error, customerId, variantId });
            throw new errors_1.InternalServerError('Failed to remove item from cart');
        }
    }
    /**
     * Clear entire cart for a customer
     */
    async clearCart(customerId) {
        try {
            await database_config_1.db.cart.deleteMany({
                where: { customer_id: customerId },
            });
            return true;
        }
        catch (error) {
            logger_1.logger.error('Error clearing cart', { error, customerId });
            throw new errors_1.InternalServerError('Failed to clear cart');
        }
    }
    /**
     * Get cart item count
     */
    async getItemCount(customerId) {
        try {
            const count = await database_config_1.db.cart.count({
                where: { customer_id: customerId },
            });
            return count;
        }
        catch (error) {
            logger_1.logger.error('Error getting cart count', { error, customerId });
            return 0;
        }
    }
    /**
     * Validate if item can be added to cart (stock check)
     */
    async canAddToCart(variantId, quantity) {
        try {
            const variant = await database_config_1.db.productVariant.findUnique({
                where: { variant_id: variantId },
                select: { stock: true, is_visible: true },
            });
            if (!variant || !variant.is_visible) {
                return false;
            }
            return (variant.stock || 0) >= quantity;
        }
        catch (error) {
            logger_1.logger.error('Error validating add to cart', { error, variantId, quantity });
            return false;
        }
    }
    /**
     * Check shop-level quantity limits
     */
    async checkShopLimit(customerId, variantId, newQuantity) {
        try {
            // Get shop settings
            const shop = await database_config_1.db.shop.findFirst();
            const maxAllowed = shop ? Number(shop.max_allowed_item_quantity) : 50;
            // Get current cart total for this item
            const cartItem = await database_config_1.db.cart.findFirst({
                where: {
                    customer_id: customerId,
                    variant_id: variantId,
                },
            });
            const currentQuantity = cartItem ? parseInt(cartItem.quantity, 10) : 0;
            const totalQuantity = currentQuantity + newQuantity;
            return {
                allowed: totalQuantity <= maxAllowed,
                canAddQuantity: Math.max(0, maxAllowed - currentQuantity),
                maxAllowedQuantity: maxAllowed,
                currentQuantity,
                remainingQuantity: Math.max(0, maxAllowed - totalQuantity),
            };
        }
        catch (error) {
            logger_1.logger.error('Error checking shop limit', { error, customerId, variantId });
            return {
                allowed: false,
                canAddQuantity: 0,
                maxAllowedQuantity: 50,
                currentQuantity: 0,
                remainingQuantity: 0,
            };
        }
    }
    /**
     * Validate cart stock and get adjustments
     */
    async validateCartStock(customerId) {
        try {
            const cartItems = await database_config_1.db.cart.findMany({
                where: { customer_id: customerId },
                include: {
                    variant: {
                        select: {
                            variant_id: true,
                            stock: true,
                            is_visible: true,
                        },
                    },
                },
            });
            return cartItems.map((item) => {
                const requestedQuantity = parseInt(item.quantity, 10);
                const availableStock = item.variant?.stock || 0;
                const isVisible = item.variant?.is_visible ?? false;
                const shouldRemove = !isVisible || availableStock === 0;
                const adjustedQuantity = shouldRemove ? 0 : Math.min(requestedQuantity, availableStock);
                const isValid = isVisible && requestedQuantity <= availableStock;
                let message = '';
                if (shouldRemove) {
                    message = 'Item is no longer available';
                }
                else if (!isValid) {
                    message = `Only ${availableStock} items available`;
                }
                return {
                    cartId: item.cart_id,
                    variantId: item.variant_id || 0,
                    requestedQuantity,
                    availableStock,
                    isValid,
                    adjustedQuantity,
                    shouldRemove,
                    message,
                };
            });
        }
        catch (error) {
            logger_1.logger.error('Error validating cart stock', { error, customerId });
            return [];
        }
    }
    /**
     * Apply cart stock adjustments
     */
    async applyCartAdjustments(customerId, adjustments) {
        try {
            for (const adjustment of adjustments) {
                if (adjustment.shouldRemove) {
                    await database_config_1.db.cart.delete({
                        where: { cart_id: adjustment.cartId },
                    });
                }
                else if (adjustment.adjustedQuantity !== adjustment.requestedQuantity) {
                    await database_config_1.db.cart.update({
                        where: { cart_id: adjustment.cartId },
                        data: { quantity: adjustment.adjustedQuantity.toString() },
                    });
                }
            }
            return true;
        }
        catch (error) {
            logger_1.logger.error('Error applying cart adjustments', { error, customerId });
            return false;
        }
    }
    /**
     * Transfer cart to kiosk
     */
    async transferToKiosk(customerId, kioskSessionId) {
        try {
            const cartItems = await database_config_1.db.cart.findMany({
                where: { customer_id: customerId },
            });
            if (cartItems.length === 0)
                return false;
            // Create kiosk cart items
            await database_config_1.db.kioskCart.createMany({
                data: cartItems
                    .filter((item) => item.variant_id)
                    .map((item) => ({
                    kiosk_session_id: kioskSessionId,
                    variant_id: item.variant_id,
                    quantity: parseInt(item.quantity, 10),
                })),
            });
            // Clear customer cart
            await this.clearCart(customerId);
            return true;
        }
        catch (error) {
            logger_1.logger.error('Error transferring cart to kiosk', { error, customerId, kioskSessionId });
            return false;
        }
    }
    /**
     * Get cart total
     */
    async getCartTotal(customerId) {
        const items = await this.findWithDetails(customerId);
        let subtotal = 0;
        let itemCount = 0;
        for (const item of items) {
            if (item.isVisible) {
                subtotal += item.sellPrice * item.quantity;
                itemCount += item.quantity;
            }
        }
        return { subtotal, itemCount };
    }
}
exports.CartRepository = CartRepository;
// Export singleton
exports.cartRepository = new CartRepository();
//# sourceMappingURL=cart.repository.js.map