import { db, Prisma } from '../config/database.config.ts';
import { logger } from '../utils/logger.ts';
import { InternalServerError, NotFoundError, BadRequestError } from '../utils/errors.ts';
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

export class CartRepository {
  /**
   * Get cart items for a customer (basic)
   */
  async findByCustomerId(customerId: number): Promise<Cart[]> {
    try {
      const cartItems = await db.cart.findMany({
        where: { customer_id: customerId },
      });
      return cartItems;
    } catch (error) {
      logger.error('Error fetching cart items', { error, customerId });
      throw new InternalServerError('Database error');
    }
  }

  /**
   * Get cart items with full product and variant details
   */
  async findWithDetails(customerId: number): Promise<CartItemWithDetails[]> {
    try {
      const cartItems = await db.cart.findMany({
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
          variantId: item.variant!.variant_id,
          quantity: parseInt(item.quantity, 10),
          sellPrice: Number(item.variant!.sell_price),
          buyPrice: Number(item.variant!.buy_price),
          productId: item.variant!.product_id,
          productName: item.variant!.product.name,
          variantName: item.variant!.variant_name,
          stock: item.variant!.stock || 0,
          isVisible: (item.variant!.is_visible ?? true) && (item.variant!.product.isVisible ?? true),
        }));
    } catch (error) {
      logger.error('Error fetching cart with details', { error, customerId });
      throw new InternalServerError('Database error');
    }
  }

  /**
   * Add item to cart or update quantity if exists
   */
  async addItem(customerId: number, variantId: number, quantity: number): Promise<Cart> {
    try {
      // Check if item already exists in cart
      const existing = await db.cart.findFirst({
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
      const cartItem = await db.cart.create({
        data: {
          customer_id: customerId,
          variant_id: variantId,
          quantity: quantity.toString(),
        },
      });

      return cartItem;
    } catch (error) {
      logger.error('Error adding to cart', { error, customerId, variantId });
      throw new InternalServerError('Failed to add item to cart');
    }
  }

  /**
   * Update cart item quantity by cart ID
   */
  async updateQuantity(cartId: number, newQuantity: number): Promise<Cart> {
    if (newQuantity <= 0) {
      await this.removeItem(cartId);
      throw new BadRequestError('Item removed from cart');
    }

    try {
      const cartItem = await db.cart.update({
        where: { cart_id: cartId },
        data: { quantity: newQuantity.toString() },
      });

      return cartItem;
    } catch (error) {
      if ((error as { code?: string }).code === 'P2025') {
        throw new NotFoundError('Cart item not found');
      }
      logger.error('Error updating cart quantity', { error, cartId });
      throw new InternalServerError('Failed to update cart');
    }
  }

  /**
   * Update cart item quantity by variant ID
   */
  async updateByVariant(customerId: number, variantId: number, newQuantity: number): Promise<Cart> {
    if (newQuantity <= 0) {
      await this.removeByVariant(customerId, variantId);
      throw new BadRequestError('Item removed from cart');
    }

    try {
      const cartItem = await db.cart.findFirst({
        where: {
          customer_id: customerId,
          variant_id: variantId,
        },
      });

      if (!cartItem) {
        throw new NotFoundError('Cart item not found');
      }

      const updated = await db.cart.update({
        where: { cart_id: cartItem.cart_id },
        data: { quantity: newQuantity.toString() },
      });

      return updated;
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      logger.error('Error updating cart by variant', { error, customerId, variantId });
      throw new InternalServerError('Failed to update cart');
    }
  }

  /**
   * Remove item from cart by cart ID
   */
  async removeItem(cartId: number): Promise<boolean> {
    try {
      await db.cart.delete({
        where: { cart_id: cartId },
      });
      return true;
    } catch (error) {
      // Handle case where item doesn't exist (P2025)
      if ((error as { code?: string }).code === 'P2025') {
        throw new NotFoundError('Cart item not found');
      }
      logger.error('Error removing cart item', { error, cartId });
      throw new InternalServerError('Failed to remove item from cart');
    }
  }

  /**
   * Remove item from cart by variant ID
   */
  async removeByVariant(customerId: number, variantId: number): Promise<boolean> {
    try {
      await db.cart.deleteMany({
        where: {
          customer_id: customerId,
          variant_id: variantId,
        },
      });
      return true;
    } catch (error) {
      logger.error('Error removing cart item by variant', { error, customerId, variantId });
      throw new InternalServerError('Failed to remove item from cart');
    }
  }

  /**
   * Clear entire cart for a customer
   */
  async clearCart(customerId: number): Promise<boolean> {
    try {
      await db.cart.deleteMany({
        where: { customer_id: customerId },
      });
      return true;
    } catch (error) {
      logger.error('Error clearing cart', { error, customerId });
      throw new InternalServerError('Failed to clear cart');
    }
  }

  /**
   * Get cart item count
   */
  async getItemCount(customerId: number): Promise<number> {
    try {
      const count = await db.cart.count({
        where: { customer_id: customerId },
      });
      return count;
    } catch (error) {
      logger.error('Error getting cart count', { error, customerId });
      return 0;
    }
  }

  /**
   * Validate if item can be added to cart (stock check)
   */
  async canAddToCart(variantId: number, quantity: number): Promise<boolean> {
    try {
      const variant = await db.productVariant.findUnique({
        where: { variant_id: variantId },
        select: { stock: true, is_visible: true },
      });

      if (!variant || !variant.is_visible) {
        return false;
      }

      return (variant.stock || 0) >= quantity;
    } catch (error) {
      logger.error('Error validating add to cart', { error, variantId, quantity });
      return false;
    }
  }

  /**
   * Check shop-level quantity limits
   */
  async checkShopLimit(customerId: number, variantId: number, newQuantity: number): Promise<ShopLimitValidationResult> {
    try {
      // Get shop settings
      const shop = await db.shop.findFirst();
      const maxAllowed = shop ? Number(shop.max_allowed_item_quantity) : 50;

      // Get current cart total for this item
      const cartItem = await db.cart.findFirst({
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
    } catch (error) {
      logger.error('Error checking shop limit', { error, customerId, variantId });
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
  async validateCartStock(customerId: number): Promise<CartStockValidation[]> {
    try {
      const cartItems = await db.cart.findMany({
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
        } else if (!isValid) {
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
    } catch (error) {
      logger.error('Error validating cart stock', { error, customerId });
      return [];
    }
  }

  /**
   * Apply cart stock adjustments
   */
  async applyCartAdjustments(customerId: number, adjustments: CartStockValidation[]): Promise<boolean> {
    try {
      for (const adjustment of adjustments) {
        if (adjustment.shouldRemove) {
          await db.cart.delete({
            where: { cart_id: adjustment.cartId },
          });
        } else if (adjustment.adjustedQuantity !== adjustment.requestedQuantity) {
          await db.cart.update({
            where: { cart_id: adjustment.cartId },
            data: { quantity: adjustment.adjustedQuantity.toString() },
          });
        }
      }
      return true;
    } catch (error) {
      logger.error('Error applying cart adjustments', { error, customerId });
      return false;
    }
  }

  /**
   * Transfer cart to kiosk
   */
  async transferToKiosk(customerId: number, kioskSessionId: string): Promise<boolean> {
    try {
      const cartItems = await db.cart.findMany({
        where: { customer_id: customerId },
      });

      if (cartItems.length === 0) return false;

      // Create kiosk cart items
      await db.kioskCart.createMany({
        data: cartItems
          .filter((item) => item.variant_id)
          .map((item) => ({
            kiosk_session_id: kioskSessionId,
            variant_id: item.variant_id!,
            quantity: parseInt(item.quantity, 10),
          })),
      });

      // Clear customer cart
      await this.clearCart(customerId);

      return true;
    } catch (error) {
      logger.error('Error transferring cart to kiosk', { error, customerId, kioskSessionId });
      return false;
    }
  }

  /**
   * Get cart total
   */
  async getCartTotal(customerId: number): Promise<{ subtotal: number; itemCount: number }> {
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
