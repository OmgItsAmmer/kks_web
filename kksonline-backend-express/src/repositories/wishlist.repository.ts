import { db } from '../config/database.config.ts';
import { logger } from '../utils/logger.ts';
import { InternalServerError, ConflictError } from '../utils/errors.ts';
import type { Wishlist } from '@prisma/client';

export class WishlistRepository {
  /**
   * Get wishlist items for a customer
   */
  async findByCustomerId(customerId: number): Promise<Wishlist[]> {
    try {
      const wishlist = await db.wishlist.findMany({
        where: { customer_id: customerId },
        orderBy: { created_at: 'desc' },
      });
      return wishlist;
    } catch (error) {
      logger.error('Error fetching wishlist', { error, customerId });
      throw new InternalServerError('Database error');
    }
  }

  /**
   * Get wishlist with product details
   */
  async findWithProductDetails(customerId: number): Promise<{
    wishlistId: bigint;
    productId: number;
    productName: string;
    salePrice: string | null;
    basePrice: string | null;
    priceRange: string | null;
    createdAt: Date;
  }[]> {
    try {
      const wishlist = await db.wishlist.findMany({
        where: { customer_id: customerId },
        include: {
          product: {
            select: {
              name: true,
              sale_price: true,
              base_price: true,
              price_range: true,
              isVisible: true,
            },
          },
        },
        orderBy: { created_at: 'desc' },
      });

      return wishlist
        .filter((item) => item.product?.isVisible !== false)
        .map((item) => ({
          wishlistId: item.wishlist_id,
          productId: item.product_id!,
          productName: item.product?.name || 'Unknown',
          salePrice: item.product?.sale_price || null,
          basePrice: item.product?.base_price || null,
          priceRange: item.product?.price_range || null,
          createdAt: item.created_at,
        }));
    } catch (error) {
      logger.error('Error fetching wishlist with details', { error, customerId });
      throw new InternalServerError('Database error');
    }
  }

  /**
   * Add item to wishlist
   */
  async add(customerId: number, productId: number): Promise<Wishlist> {
    // Check if already in wishlist
    const existing = await this.findByCustomerAndProduct(customerId, productId);
    if (existing) {
      throw new ConflictError('Product already in wishlist');
    }

    try {
      const wishlistItem = await db.wishlist.create({
        data: {
          customer_id: customerId,
          product_id: productId,
        },
      });
      return wishlistItem;
    } catch (error) {
      logger.error('Error adding to wishlist', { error, customerId, productId });
      throw new InternalServerError('Failed to add to wishlist');
    }
  }

  /**
   * Remove item from wishlist
   */
  async remove(customerId: number, productId: number): Promise<boolean> {
    try {
      await db.wishlist.deleteMany({
        where: {
          customer_id: customerId,
          product_id: productId,
        },
      });
      return true;
    } catch (error) {
      logger.error('Error removing from wishlist', { error, customerId, productId });
      throw new InternalServerError('Failed to remove from wishlist');
    }
  }

  /**
   * Remove by wishlist ID
   */
  async removeById(wishlistId: bigint): Promise<boolean> {
    try {
      await db.wishlist.delete({
        where: { wishlist_id: wishlistId },
      });
      return true;
    } catch (error) {
      logger.error('Error removing wishlist item', { error, wishlistId });
      throw new InternalServerError('Failed to remove from wishlist');
    }
  }

  /**
   * Check if product is in wishlist
   */
  async isInWishlist(customerId: number, productId: number): Promise<boolean> {
    const item = await this.findByCustomerAndProduct(customerId, productId);
    return item !== null;
  }

  /**
   * Get wishlist item by customer and product
   */
  async findByCustomerAndProduct(customerId: number, productId: number): Promise<Wishlist | null> {
    try {
      const item = await db.wishlist.findFirst({
        where: {
          customer_id: customerId,
          product_id: productId,
        },
      });
      return item;
    } catch (error) {
      logger.error('Error checking wishlist', { error, customerId, productId });
      return null;
    }
  }

  /**
   * Get wishlist count
   */
  async getCount(customerId: number): Promise<number> {
    try {
      const count = await db.wishlist.count({
        where: { customer_id: customerId },
      });
      return count;
    } catch (error) {
      logger.error('Error getting wishlist count', { error, customerId });
      return 0;
    }
  }

  /**
   * Clear wishlist
   */
  async clear(customerId: number): Promise<boolean> {
    try {
      await db.wishlist.deleteMany({
        where: { customer_id: customerId },
      });
      return true;
    } catch (error) {
      logger.error('Error clearing wishlist', { error, customerId });
      throw new InternalServerError('Failed to clear wishlist');
    }
  }

  /**
   * Check if wishlist item belongs to customer
   */
  async belongsToCustomer(wishlistId: bigint, customerId: number): Promise<boolean> {
    try {
      const item = await db.wishlist.findFirst({
        where: {
          wishlist_id: wishlistId,
          customer_id: customerId,
        },
      });
      return !!item;
    } catch (error) {
      return false;
    }
  }
}

// Export singleton
export const wishlistRepository = new WishlistRepository();
