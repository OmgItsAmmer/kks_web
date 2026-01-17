import { Prisma } from '../config/database.config';
import type { Category } from '@prisma/client';
export declare class CategoryRepository {
    /**
     * Get all categories
     */
    findAll(): Promise<Category[]>;
    /**
     * Get featured categories
     */
    findFeatured(): Promise<Category[]>;
    /**
     * Get category by ID
     */
    findById(categoryId: number): Promise<Category | null>;
    /**
     * Create category (admin)
     */
    create(category: Prisma.CategoryCreateInput): Promise<Category>;
    /**
     * Update category (admin)
     */
    update(categoryId: number, updates: Prisma.CategoryUpdateInput): Promise<Category>;
    /**
     * Delete category (admin)
     */
    delete(categoryId: number): Promise<boolean>;
    /**
     * Update product count for a category
     */
    updateProductCount(categoryId: number): Promise<void>;
    private invalidateCache;
}
export declare const categoryRepository: CategoryRepository;
//# sourceMappingURL=category.repository.d.ts.map