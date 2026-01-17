import { Prisma } from '../config/database.config';
import type { Brand } from '@prisma/client';
export declare class BrandRepository {
    /**
     * Get all brands
     */
    findAll(): Promise<Brand[]>;
    /**
     * Get featured brands
     */
    findFeatured(): Promise<Brand[]>;
    /**
     * Get verified brands
     */
    findVerified(): Promise<Brand[]>;
    /**
     * Get brand by ID
     */
    findById(brandId: number): Promise<Brand | null>;
    /**
     * Create brand (admin)
     */
    create(brand: Prisma.BrandCreateInput): Promise<Brand>;
    /**
     * Update brand (admin)
     */
    update(brandId: number, updates: Prisma.BrandUpdateInput): Promise<Brand>;
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