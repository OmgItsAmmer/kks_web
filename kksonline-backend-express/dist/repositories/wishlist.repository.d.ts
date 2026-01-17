import type { Wishlist } from '@prisma/client';
export declare class WishlistRepository {
    /**
     * Get wishlist items for a customer
     */
    findByCustomerId(customerId: number): Promise<Wishlist[]>;
    /**
     * Get wishlist with product details
     */
    findWithProductDetails(customerId: number): Promise<{
        wishlistId: bigint;
        productId: number;
        productName: string;
        salePrice: string | null;
        basePrice: string | null;
        createdAt: Date;
    }[]>;
    /**
     * Add item to wishlist
     */
    add(customerId: number, productId: number): Promise<Wishlist>;
    /**
     * Remove item from wishlist
     */
    remove(customerId: number, productId: number): Promise<boolean>;
    /**
     * Remove by wishlist ID
     */
    removeById(wishlistId: bigint): Promise<boolean>;
    /**
     * Check if product is in wishlist
     */
    isInWishlist(customerId: number, productId: number): Promise<boolean>;
    /**
     * Get wishlist item by customer and product
     */
    findByCustomerAndProduct(customerId: number, productId: number): Promise<Wishlist | null>;
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
    belongsToCustomer(wishlistId: bigint, customerId: number): Promise<boolean>;
}
export declare const wishlistRepository: WishlistRepository;
//# sourceMappingURL=wishlist.repository.d.ts.map