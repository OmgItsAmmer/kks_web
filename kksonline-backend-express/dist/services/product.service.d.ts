import type { Product, ProductVariant } from '@prisma/client';
export interface CreateProductInput {
    name: string;
    description?: string;
    base_price?: string;
    sale_price?: string;
    category_id?: number;
    brandID?: number;
    ispopular?: boolean;
    stock_quantity?: number;
    alert_stock?: number;
    isVisible?: boolean;
    tag?: string;
}
export interface UpdateProductInput {
    name?: string;
    description?: string;
    base_price?: string;
    sale_price?: string;
    category_id?: number;
    brandID?: number;
    ispopular?: boolean;
    stock_quantity?: number;
    alert_stock?: number;
    isVisible?: boolean;
    tag?: string;
}
export interface CreateVariantInput {
    product_id: number;
    variant_name: string;
    buy_price: number;
    sell_price: number;
    stock?: number;
    sku?: string;
    is_visible?: boolean;
    alert_stock?: number;
}
export interface UpdateVariantInput {
    variant_name?: string;
    buy_price?: number;
    sell_price?: number;
    stock?: number;
    sku?: string;
    is_visible?: boolean;
    alert_stock?: number;
}
export declare class ProductService {
    /**
     * Create a new product
     */
    createProduct(input: CreateProductInput): Promise<Product>;
    /**
     * Update an existing product
     */
    updateProduct(productId: number, input: UpdateProductInput): Promise<Product>;
    /**
     * Delete a product
     */
    deleteProduct(productId: number): Promise<boolean>;
    /**
     * Toggle product visibility
     */
    toggleVisibility(productId: number, isVisible: boolean): Promise<Product>;
    /**
     * Create a product variant
     */
    createVariant(input: CreateVariantInput): Promise<ProductVariant>;
    /**
     * Update a product variant
     */
    updateVariant(variantId: number, input: UpdateVariantInput): Promise<ProductVariant>;
    /**
     * Delete a product variant
     */
    deleteVariant(variantId: number): Promise<boolean>;
    /**
     * Bulk update products
     */
    bulkUpdateProducts(productIds: number[], updates: UpdateProductInput): Promise<{
        success: number;
        failed: number;
        errors: any[];
    }>;
    /**
     * Bulk delete products
     */
    bulkDeleteProducts(productIds: number[]): Promise<{
        success: number;
        failed: number;
        errors: any[];
    }>;
    /**
     * Update product price range based on variants
     */
    private updateProductPriceRange;
    /**
     * Validate product input
     */
    private validateProductInput;
    /**
     * Validate variant input
     */
    private validateVariantInput;
}
export declare const productService: ProductService;
//# sourceMappingURL=product.service.d.ts.map