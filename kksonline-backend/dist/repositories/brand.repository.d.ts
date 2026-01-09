import type { Tables, InsertTables, UpdateTables } from "../types/database.types.js";
export declare class BrandRepository {
    /**
     * Get all brands
     */
    findAll(): Promise<Tables<'brands'>[]>;
    /**
     * Get featured brands
     */
    findFeatured(): Promise<Tables<'brands'>[]>;
    /**
     * Get verified brands
     */
    findVerified(): Promise<Tables<'brands'>[]>;
    /**
     * Get brand by ID
     */
    findById(brandId: number): Promise<Tables<'brands'> | null>;
    /**
     * Create brand (admin)
     */
    create(brand: InsertTables<'brands'>): Promise<Tables<'brands'>>;
    /**
     * Update brand (admin)
     */
    update(brandId: number, updates: UpdateTables<'brands'>): Promise<Tables<'brands'>>;
    /**
     * Delete brand (admin)
     */
    delete(brandId: number): Promise<boolean>;
    /**
     * Update product count for a brand
     */
    updateProductCount(brandId: number): Promise<void>;
    private invalidateCache;
}
export declare const brandRepository: BrandRepository;
//# sourceMappingURL=brand.repository.d.ts.map