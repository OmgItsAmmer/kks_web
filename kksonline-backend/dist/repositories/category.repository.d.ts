import type { Tables, InsertTables, UpdateTables } from '../types/database.types.js';
export declare class CategoryRepository {
    /**
     * Get all categories
     */
    findAll(): Promise<Tables<'categories'>[]>;
    /**
     * Get featured categories
     */
    findFeatured(): Promise<Tables<'categories'>[]>;
    /**
     * Get category by ID
     */
    findById(categoryId: number): Promise<Tables<'categories'> | null>;
    /**
     * Create category (admin)
     */
    create(category: InsertTables<'categories'>): Promise<Tables<'categories'>>;
    /**
     * Update category (admin)
     */
    update(categoryId: number, updates: UpdateTables<'categories'>): Promise<Tables<'categories'>>;
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