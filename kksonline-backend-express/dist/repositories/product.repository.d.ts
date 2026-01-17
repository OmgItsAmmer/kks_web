import { Prisma } from '../config/database.config.ts';
import type { Product, ProductVariant, Category, Brand } from '@prisma/client';
export interface SearchParams {
    query?: string;
    categoryId?: number;
    brandId?: number;
    minPrice?: number;
    maxPrice?: number;
    isPopular?: boolean;
    tag?: string;
    sortBy?: 'name' | 'price' | 'created_at' | 'popularity';
    sortOrder?: 'asc' | 'desc';
    page?: number;
    pageSize?: number;
}
export interface ProductWithDetails extends Product {
    category?: Category;
    brand?: Brand;
    variants?: ProductVariant[];
    images?: string[];
    mainImage?: string;
}
export declare class ProductRepository {
    /**
     * Get product by ID
     */
    findById(productId: number): Promise<Product | null>;
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
    }): Promise<Product[]>;
    /**
     * Get products by category
     */
    findByCategory(categoryId: number, params?: {
        page?: number;
        pageSize?: number;
    }): Promise<{
        products: Product[];
        total: number;
    }>;
    /**
     * Get products by brand
     */
    findByBrand(brandId: number, params?: {
        limit?: number;
    }): Promise<Product[]>;
    /**
     * Search products
     */
    search(params: SearchParams): Promise<{
        products: Product[];
        total: number;
    }>;
    /**
     * Get search suggestions (autocomplete)
     */
    getSearchSuggestions(query: string): Promise<string[]>;
    /**
     * Get products by IDs (batch)
     */
    findByIds(productIds: number[]): Promise<Product[]>;
    /**
     * Get all products (with pagination)
     */
    findAll(params?: {
        page?: number;
        pageSize?: number;
        visibleOnly?: boolean;
    }): Promise<{
        products: Product[];
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
    create(product: Prisma.ProductCreateInput): Promise<Product>;
    /**
     * Update product (admin)
     */
    update(productId: number, updates: Prisma.ProductUpdateInput): Promise<Product>;
    /**
     * Delete product (admin)
     */
    delete(productId: number): Promise<boolean>;
    /**
     * Get product variants (visible only)
     */
    getVariants(productId: number): Promise<ProductVariant[]>;
    /**
     * Get all product variants including hidden (admin)
     */
    getAllVariants(productId: number): Promise<ProductVariant[]>;
    /**
     * Get variant by ID
     */
    getVariantById(variantId: number): Promise<ProductVariant | null>;
    /**
     * Create product variant (admin)
     */
    createVariant(variant: Prisma.ProductVariantCreateInput): Promise<ProductVariant>;
    /**
     * Update product variant (admin)
     */
    updateVariant(variantId: number, updates: Prisma.ProductVariantUpdateInput): Promise<ProductVariant>;
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