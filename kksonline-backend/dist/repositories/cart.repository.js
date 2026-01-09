import { supabaseAdmin } from '../config/supabase.config.js';
import { logger } from '../utils/logger.js';
import { InternalServerError, NotFoundError, BadRequestError } from '../utils/errors.js';
export class CartRepository {
    /**
     * Get cart items for a customer (basic)
     */
    async findByCustomerId(customerId) {
        const { data, error } = await supabaseAdmin
            .from('cart')
            .select('*')
            .eq('customer_id', customerId);
        if (error) {
            logger.error('Error fetching cart items', { error, customerId });
            throw new InternalServerError('Database error');
        }
        return data || [];
    }
    /**
     * Get cart items with full product and variant details
     */
    async findWithDetails(customerId) {
        const { data, error } = await supabaseAdmin
            .from('cart')
            .select(`
        cart_id,
        quantity,
        variant_id,
        product_variants!inner(
          variant_id,
          product_id,
          variant_name,
          sell_price,
          buy_price,
          stock,
          is_visible,
          products!inner(
            product_id,
            name,
            isVisible
          )
        )
      `)
            .eq('customer_id', customerId);
        if (error) {
            logger.error('Error fetching cart with details', { error, customerId });
            throw new InternalServerError('Database error');
        }
        if (!data)
            return [];
        // Transform the data
        return data.map((item) => {
            const variant = item.product_variants;
            return {
                cartId: item.cart_id,
                variantId: variant.variant_id,
                quantity: parseInt(item.quantity, 10),
                sellPrice: variant.sell_price,
                buyPrice: variant.buy_price,
                productId: variant.product_id,
                productName: variant.products.name,
                variantName: variant.variant_name,
                stock: variant.stock || 0,
                isVisible: (variant.is_visible ?? true) && (variant.products.isVisible ?? true),
            };
        });
    }
    /**
     * Add item to cart or update quantity if exists
     */
    async addItem(customerId, variantId, quantity) {
        // Check if item already exists in cart
        const { data: existing, error: checkError } = await supabaseAdmin
            .from('cart')
            .select('cart_id, quantity')
            .eq('customer_id', customerId)
            .eq('variant_id', variantId)
            .single();
        if (checkError && checkError.code !== 'PGRST116') {
            logger.error('Error checking existing cart item', { error: checkError, customerId, variantId });
            throw new InternalServerError('Database error');
        }
        if (existing) {
            // Update existing item
            const newQuantity = parseInt(existing.quantity, 10) + quantity;
            return this.updateQuantity(existing.cart_id, newQuantity);
        }
        // Insert new item
        const { data, error } = await supabaseAdmin
            .from('cart')
            .insert({
            customer_id: customerId,
            variant_id: variantId,
            quantity: quantity.toString(),
        })
            .select()
            .single();
        if (error) {
            logger.error('Error adding to cart', { error, customerId, variantId });
            throw new InternalServerError('Failed to add item to cart');
        }
        return data;
    }
    /**
     * Update cart item quantity by cart ID
     */
    async updateQuantity(cartId, newQuantity) {
        if (newQuantity <= 0) {
            await this.removeItem(cartId);
            throw new BadRequestError('Item removed from cart');
        }
        const { data, error } = await supabaseAdmin
            .from('cart')
            .update({ quantity: newQuantity.toString() })
            .eq('cart_id', cartId)
            .select()
            .single();
        if (error) {
            if (error.code === 'PGRST116') {
                throw new NotFoundError('Cart item not found');
            }
            logger.error('Error updating cart quantity', { error, cartId });
            throw new InternalServerError('Failed to update cart');
        }
        return data;
    }
    /**
     * Update cart item quantity by variant ID
     */
    async updateByVariant(customerId, variantId, newQuantity) {
        if (newQuantity <= 0) {
            await this.removeByVariant(customerId, variantId);
            throw new BadRequestError('Item removed from cart');
        }
        const { data, error } = await supabaseAdmin
            .from('cart')
            .update({ quantity: newQuantity.toString() })
            .eq('customer_id', customerId)
            .eq('variant_id', variantId)
            .select()
            .single();
        if (error) {
            if (error.code === 'PGRST116') {
                throw new NotFoundError('Cart item not found');
            }
            logger.error('Error updating cart by variant', { error, customerId, variantId });
            throw new InternalServerError('Failed to update cart');
        }
        return data;
    }
    /**
     * Remove item from cart by cart ID
     */
    async removeItem(cartId) {
        const { error } = await supabaseAdmin
            .from('cart')
            .delete()
            .eq('cart_id', cartId);
        if (error) {
            logger.error('Error removing cart item', { error, cartId });
            throw new InternalServerError('Failed to remove item from cart');
        }
        return true;
    }
    /**
     * Remove item from cart by variant ID
     */
    async removeByVariant(customerId, variantId) {
        const { error } = await supabaseAdmin
            .from('cart')
            .delete()
            .eq('customer_id', customerId)
            .eq('variant_id', variantId);
        if (error) {
            logger.error('Error removing cart item by variant', { error, customerId, variantId });
            throw new InternalServerError('Failed to remove item from cart');
        }
        return true;
    }
    /**
     * Clear entire cart for a customer
     */
    async clearCart(customerId) {
        const { error } = await supabaseAdmin
            .from('cart')
            .delete()
            .eq('customer_id', customerId);
        if (error) {
            logger.error('Error clearing cart', { error, customerId });
            throw new InternalServerError('Failed to clear cart');
        }
        return true;
    }
    /**
     * Get cart item count
     */
    async getItemCount(customerId) {
        const { count, error } = await supabaseAdmin
            .from('cart')
            .select('*', { count: 'exact', head: true })
            .eq('customer_id', customerId);
        if (error) {
            logger.error('Error getting cart count', { error, customerId });
            return 0;
        }
        return count || 0;
    }
    /**
     * Validate if item can be added to cart (stock check)
     */
    async canAddToCart(variantId, quantity) {
        const { data, error } = await supabaseAdmin.rpc('add_to_cart_validation', {
            p_variant_id_input: variantId,
            p_new_quantity_input: quantity,
        });
        if (error) {
            logger.error('Error validating add to cart', { error, variantId, quantity });
            return false;
        }
        return data === true;
    }
    /**
     * Check shop-level quantity limits
     */
    async checkShopLimit(customerId, variantId, newQuantity) {
        const { data, error } = await supabaseAdmin.rpc('validate_add_to_cart_shop_limit', {
            p_customer_id: customerId,
            p_variant_id: variantId,
            p_new_quantity: newQuantity,
        });
        if (error) {
            logger.error('Error checking shop limit', { error, customerId, variantId });
            // Return a default restrictive response on error
            return {
                allowed: false,
                canAddQuantity: 0,
                maxAllowedQuantity: 50,
                currentQuantity: 0,
                remainingQuantity: 0,
            };
        }
        // Parse JSON response
        const result = data;
        return {
            allowed: result.allowed,
            canAddQuantity: result.can_add_quantity,
            maxAllowedQuantity: result.max_allowed_quantity,
            currentQuantity: result.current_quantity,
            remainingQuantity: result.remaining_quantity,
        };
    }
    /**
     * Validate cart stock and get adjustments
     */
    async validateCartStock(customerId) {
        const { data, error } = await supabaseAdmin.rpc('validate_and_adjust_cart_stock', {
            p_customer_id: customerId,
        });
        if (error) {
            logger.error('Error validating cart stock', { error, customerId });
            return [];
        }
        if (!data)
            return [];
        // Parse JSON array response
        return data.map((item) => {
            const i = item;
            return {
                cartId: i.cart_id,
                variantId: i.variant_id,
                requestedQuantity: i.requested_quantity,
                availableStock: i.available_stock,
                isValid: i.is_valid,
                adjustedQuantity: i.adjusted_quantity,
                shouldRemove: i.should_remove,
                message: i.message,
            };
        });
    }
    /**
     * Apply cart stock adjustments
     */
    async applyCartAdjustments(customerId, adjustments) {
        const adjustmentsJson = adjustments.map((a) => ({
            cart_id: a.cartId,
            variant_id: a.variantId,
            adjusted_quantity: a.adjustedQuantity,
            should_remove: a.shouldRemove,
        }));
        const { data, error } = await supabaseAdmin.rpc('apply_cart_adjustments', {
            p_customer_id: customerId,
            p_adjustments: adjustmentsJson,
        });
        if (error) {
            logger.error('Error applying cart adjustments', { error, customerId });
            return false;
        }
        return data === true;
    }
    /**
     * Transfer cart to kiosk
     */
    async transferToKiosk(customerId, kioskSessionId) {
        const { data, error } = await supabaseAdmin.rpc('transfer_cart_to_kiosk', {
            p_customer_id: customerId,
            p_kiosk_session_id: kioskSessionId,
        });
        if (error) {
            logger.error('Error transferring cart to kiosk', { error, customerId, kioskSessionId });
            return false;
        }
        return data === true;
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
// Export singleton
export const cartRepository = new CartRepository();
//# sourceMappingURL=cart.repository.js.map