export interface CollectionWithItems {
    collection_id: number;
    name: string;
    description: string | null;
    image_url: string | null;
    is_active: boolean;
    is_featured: boolean;
    display_order: number;
    created_at: Date;
    updated_at: Date;
    items: CollectionItemDetail[];
    total_price: number;
}
export interface CollectionItemDetail {
    collection_item_id: number;
    variant_id: number;
    default_quantity: number;
    sort_order: number;
    product_id: number;
    product_name: string;
    variant_name: string | null;
    sell_price: number;
    stock: number;
    is_visible: boolean;
    sku: string | null;
    image_url: string | null;
    all_variants?: VariantOption[];
}
export interface VariantOption {
    variant_id: number;
    variant_name: string | null;
    sell_price: number;
    stock: number;
    sku: string | null;
    is_visible: boolean;
}
export interface CollectionCartItem {
    variant_id: number;
    quantity: number;
}
export declare class CollectionRepository {
    /**
     * Helper function to process collection image URL
     * If image_url is just a filename (not a full URL), construct Supabase URL
     */
    private processImageUrl;
    /**
     * Helper function to process a collection object and fix its image URL
     */
    private processCollection;
    /**
     * Helper function to process an array of collections
     */
    private processCollections;
    /**
     * Attach main images for collections from `image_entity` + `images` tables.
     *
     * Why: In your DB, `collections.image_url` can be NULL; images are stored in
     * Supabase Storage and mapped by `image_entity` with `entity_category='collections'`,
     * where `images.folderType` is the bucket name and `images.filename` is the file name.
     */
    private attachMainImagesForCollections;
    /**
     * Get all active collections (for customer display)
     */
    findActive(params?: {
        limit?: number;
        offset?: number;
        featuredOnly?: boolean;
    }): Promise<any[]>;
    /**
     * Get collection by ID with full details
     */
    findById(collectionId: number): Promise<CollectionWithItems | null>;
    /**
     * Get featured collections (for hero section)
     */
    findFeatured(limit?: number): Promise<any[]>;
    /**
     * Get ONE premium collection (for main banner)
     */
    findPremium(): Promise<any | null>;
    /**
     * Get standard collections (non-premium, for side/bottom cards)
     */
    findStandard(limit?: number): Promise<any[]>;
    /**
     * Get premium collection (ONE collection for main banner)
     */
    findPremiumCollection(): Promise<any | null>;
    /**
     * Get standard collections (excludes premium)
     */
    findStandardCollections(limit?: number): Promise<any[]>;
    /**
     * Add collection to cart
     */
    addToCart(customerId: number, collectionId: number, items: CollectionCartItem[]): Promise<any>;
    /**
     * Get customer's collection cart
     */
    getCustomerCollectionCart(customerId: number): Promise<any[]>;
    /**
     * Remove collection from cart
     */
    removeFromCart(customerId: number, collectionCartId: number): Promise<boolean>;
    /**
     * Calculate collection price with custom items
     */
    calculatePrice(items: CollectionCartItem[]): Promise<number>;
    /**
     * Get collection count
     */
    getCount(activeOnly?: boolean): Promise<number>;
    /**
     * Invalidate collection cache
     */
    invalidateCache(collectionId?: number): void;
}
export declare const collectionRepository: CollectionRepository;
//# sourceMappingURL=collection.repository.d.ts.map