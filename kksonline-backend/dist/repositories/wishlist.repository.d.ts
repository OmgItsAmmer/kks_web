import type { Tables } from '../types/database.types.js';
export declare class WishlistRepository {
    /**
     * Get wishlist items for a customer
     */
    findByCustomerId(customerId: number): Promise<Tables<'wishlist'>[]>;
    /**
     * Get wishlist with product details
     */
    findWithProductDetails(customerId: number): Promise<{
        wishlistId: number;
        productId: number;
        productName: string;
        salePrice: string | null;
        basePrice: string | null;
        createdAt: string;
    }[]>;
    /**
     * Add item to wishlist
     */
    add(customerId: number, productId: number): Promise<Tables<'wishlist'>>;
    /**
     * Remove item from wishlist
     */
    remove(customerId: number, productId: number): Promise<boolean>;
    /**
     * Remove by wishlist ID
     */
    removeById(wishlistId: number): Promise<boolean>;
    /**
     * Check if product is in wishlist
     */
    isInWishlist(customerId: number, productId: number): Promise<boolean>;
    /**
     * Get wishlist item by customer and product
     */
    findByCustomerAndProduct(customerId: number, productId: number): Promise<Tables<'wishlist'> | null>;
    /**
     * Get wishlist count
     */
    getCount(customerId: number): Promise<number>;
    /**
     * Clear wishlist
     */
    clear(customerId: number): Promise<boolean>;
    /**
     * Check if wishlist item belongs to customer
     */
    belongsToCustomer(wishlistId: number, customerId: number): Promise<boolean>;
}
export declare const wishlistRepository: WishlistRepository;
//# sourceMappingURL=wishlist.repository.d.ts.map