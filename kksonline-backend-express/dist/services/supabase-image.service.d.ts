export type EntityCategory = 'products' | 'brands' | 'categories' | 'customers' | 'vendors' | 'salesman' | 'shop';
/**
 * Service for handling Supabase Storage images
 *
 * NOTE: All caching has been removed as requested.
 * Every call now hits the database and Supabase storage URL helper directly.
 */
export declare class SupabaseImageService {
    /**
     * Get featured/main image URL for an entity
     */
    getMainImageUrl(entityId: number, entityCategory: EntityCategory): Promise<string | null>;
    /**
     * Get all image URLs for an entity
     */
    getAllImagesForEntity(entityId: number, entityCategory: EntityCategory): Promise<string[]>;
    /**
     * Get main images for multiple entities (batch operation)
     */
    getMainImagesForEntities(entityIds: number[], entityCategory: EntityCategory): Promise<Map<number, string>>;
}
export declare const supabaseImageService: SupabaseImageService;
//# sourceMappingURL=supabase-image.service.d.ts.map