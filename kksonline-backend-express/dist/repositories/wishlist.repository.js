"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.wishlistRepository = exports.WishlistRepository = void 0;
const database_config_1 = require("../config/database.config");
const logger_1 = require("../utils/logger");
const errors_1 = require("../utils/errors");
class WishlistRepository {
    /**
     * Get wishlist items for a customer
     */
    async findByCustomerId(customerId) {
        try {
            const wishlist = await database_config_1.db.wishlist.findMany({
                where: { customer_id: customerId },
                orderBy: { created_at: 'desc' },
            });
            return wishlist;
        }
        catch (error) {
            logger_1.logger.error('Error fetching wishlist', { error, customerId });
            throw new errors_1.InternalServerError('Database error');
        }
    }
    /**
     * Get wishlist with product details
     */
    async findWithProductDetails(customerId) {
        try {
            const wishlist = await database_config_1.db.wishlist.findMany({
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
                productId: item.product_id,
                productName: item.product?.name || 'Unknown',
                salePrice: item.product?.sale_price || null,
                basePrice: item.product?.base_price || null,
                priceRange: item.product?.price_range || null,
                createdAt: item.created_at,
            }));
        }
        catch (error) {
            logger_1.logger.error('Error fetching wishlist with details', { error, customerId });
            throw new errors_1.InternalServerError('Database error');
        }
    }
    /**
     * Add item to wishlist
     */
    async add(customerId, productId) {
        // Check if already in wishlist
        const existing = await this.findByCustomerAndProduct(customerId, productId);
        if (existing) {
            throw new errors_1.ConflictError('Product already in wishlist');
        }
        try {
            const wishlistItem = await database_config_1.db.wishlist.create({
                data: {
                    customer_id: customerId,
                    product_id: productId,
                },
            });
            return wishlistItem;
        }
        catch (error) {
            logger_1.logger.error('Error adding to wishlist', { error, customerId, productId });
            throw new errors_1.InternalServerError('Failed to add to wishlist');
        }
    }
    /**
     * Remove item from wishlist
     */
    async remove(customerId, productId) {
        try {
            await database_config_1.db.wishlist.deleteMany({
                where: {
                    customer_id: customerId,
                    product_id: productId,
                },
            });
            return true;
        }
        catch (error) {
            logger_1.logger.error('Error removing from wishlist', { error, customerId, productId });
            throw new errors_1.InternalServerError('Failed to remove from wishlist');
        }
    }
    /**
     * Remove by wishlist ID
     */
    async removeById(wishlistId) {
        try {
            await database_config_1.db.wishlist.delete({
                where: { wishlist_id: wishlistId },
            });
            return true;
        }
        catch (error) {
            logger_1.logger.error('Error removing wishlist item', { error, wishlistId });
            throw new errors_1.InternalServerError('Failed to remove from wishlist');
        }
    }
    /**
     * Check if product is in wishlist
     */
    async isInWishlist(customerId, productId) {
        const item = await this.findByCustomerAndProduct(customerId, productId);
        return item !== null;
    }
    /**
     * Get wishlist item by customer and product
     */
    async findByCustomerAndProduct(customerId, productId) {
        try {
            const item = await database_config_1.db.wishlist.findFirst({
                where: {
                    customer_id: customerId,
                    product_id: productId,
                },
            });
            return item;
        }
        catch (error) {
            logger_1.logger.error('Error checking wishlist', { error, customerId, productId });
            return null;
        }
    }
    /**
     * Get wishlist count
     */
    async getCount(customerId) {
        try {
            const count = await database_config_1.db.wishlist.count({
                where: { customer_id: customerId },
            });
            return count;
        }
        catch (error) {
            logger_1.logger.error('Error getting wishlist count', { error, customerId });
            return 0;
        }
    }
    /**
     * Clear wishlist
     */
    async clear(customerId) {
        try {
            await database_config_1.db.wishlist.deleteMany({
                where: { customer_id: customerId },
            });
            return true;
        }
        catch (error) {
            logger_1.logger.error('Error clearing wishlist', { error, customerId });
            throw new errors_1.InternalServerError('Failed to clear wishlist');
        }
    }
    /**
     * Check if wishlist item belongs to customer
     */
    async belongsToCustomer(wishlistId, customerId) {
        try {
            const item = await database_config_1.db.wishlist.findFirst({
                where: {
                    wishlist_id: wishlistId,
                    customer_id: customerId,
                },
            });
            return !!item;
        }
        catch (error) {
            return false;
        }
    }
}
exports.WishlistRepository = WishlistRepository;
// Export singleton
exports.wishlistRepository = new WishlistRepository();
//# sourceMappingURL=wishlist.repository.js.map