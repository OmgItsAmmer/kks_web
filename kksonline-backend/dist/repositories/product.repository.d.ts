import type { Tables, InsertTables, UpdateTables } from '../types/database.types.js';
import type { SearchParams, ProductWithDetails } from '../types/api.types.js';
export declare class ProductRepository {
    /**
     * Get product by ID
     */
    findById(productId: number): Promise<Tables<'products'> | null>;
    /**
     * Get product with all relations
     */
    findByIdWithDetails(productId: number): Promise<ProductWithDetails | null>;
    /**
     * Get popular products
     */
    findPopular(params?: {
        limit?: number;
        offset?: number;
    }): Promise<Tables<'products'>[]>;
    /**
     * Get products by category
     */
    findByCategory(categoryId: number, params?: {
        page?: number;
        pageSize?: number;
    }): Promise<{
        products: Tables<'products'>[];
        total: number;
    }>;
    /**
     * Get products by brand
     */
    findByBrand(brandId: number, params?: {
        limit?: number;
    }): Promise<Tables<'products'>[]>;
    /**
     * Search products
     */
    search(params: SearchParams): Promise<{
        products: Tables<'products'>[];
        total: number;
    }>;
    /**
     * Get search suggestions (autocomplete)
     */
    getSearchSuggestions(query: string): Promise<string[]>;
    /**
     * Get products by IDs (batch)
     */
    findByIds(productIds: number[]): Promise<Tables<'products'>[]>;
    /**
     * Get all products (with pagination)
     */
    findAll(params?: {
        page?: number;
        pageSize?: number;
        visibleOnly?: boolean;
    }): Promise<{
        products: Tables<'products'>[];
        total: number;
    }>;
    /**
     * Get product count
     */
    getCount(filters?: {
        categoryId?: number;
        brandId?: number;
        isPopular?: boolean;
    }): Promise<number>;
    /**
     * Create product (admin)
     */
    create(product: InsertTables<'products'>): Promise<Tables<'products'>>;
    /**
     * Update product (admin)
     */
    update(productId: number, updates: UpdateTables<'products'>): Promise<Tables<'products'>>;
    /**
     * Delete product (admin)
     */
    delete(productId: number): Promise<boolean>;
    /**
     * Get product variants (visible only)
     */
    getVariants(productId: number): Promise<Tables<'product_variants'>[]>;
    /**
     * Get all product variants including hidden (admin)
     */
    getAllVariants(productId: number): Promise<Tables<'product_variants'>[]>;
    /**
     * Get variant by ID
     */
    getVariantById(variantId: number): Promise<Tables<'product_variants'> | null>;
    /**
     * Create product variant (admin)
     */
    createVariant(variant: InsertTables<'product_variants'>): Promise<Tables<'product_variants'>>;
    /**
     * Update product variant (admin)
     */
    updateVariant(variantId: number, updates: UpdateTables<'product_variants'>): Promise<Tables<'product_variants'>>;
    /**
     * Delete product variant (admin)
     */
    deleteVariant(variantId: number): Promise<boolean>;
    /**
     * Invalidate product cache
     */
    private invalidateCache;
}
export declare const productRepository: ProductRepository;
//# sourceMappingURL=product.repository.d.ts.map