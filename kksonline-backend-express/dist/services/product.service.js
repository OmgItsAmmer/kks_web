"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.productService = exports.ProductService = void 0;
const product_repository_1 = require("../repositories/product.repository");
const image_service_1 = require("./image.service");
const logger_1 = require("../utils/logger");
const errors_1 = require("../utils/errors");
class ProductService {
    /**
     * Create a new product
     */
    async createProduct(input) {
        // Validate input
        this.validateProductInput(input);
        try {
            const productData = {
                name: input.name,
                description: input.description || '',
                base_price: input.base_price || '0',
                sale_price: input.sale_price || '0',
                ispopular: input.ispopular || false,
                stock_quantity: input.stock_quantity || 0,
                alert_stock: input.alert_stock,
                isVisible: input.isVisible ?? false,
                tag: input.tag,
                price_range: '--',
            };
            // Add category relation if provided
            if (input.category_id) {
                productData.category = {
                    connect: { category_id: input.category_id },
                };
            }
            // Add brand relation if provided
            if (input.brandID) {
                productData.brand = {
                    connect: { brandID: input.brandID },
                };
            }
            const product = await product_repository_1.productRepository.create(productData);
            logger_1.logger.info('Product created successfully', { productId: product.product_id });
            return product;
        }
        catch (error) {
            logger_1.logger.error('Error creating product', { error, input });
            throw error;
        }
    }
    /**
     * Update an existing product
     */
    async updateProduct(productId, input) {
        // Check if product exists
        const existingProduct = await product_repository_1.productRepository.findById(productId);
        if (!existingProduct) {
            throw new errors_1.NotFoundError('Product not found');
        }
        try {
            const updateData = {};
            if (input.name !== undefined)
                updateData.name = input.name;
            if (input.description !== undefined)
                updateData.description = input.description;
            if (input.base_price !== undefined)
                updateData.base_price = input.base_price;
            if (input.sale_price !== undefined)
                updateData.sale_price = input.sale_price;
            if (input.ispopular !== undefined)
                updateData.ispopular = input.ispopular;
            if (input.stock_quantity !== undefined)
                updateData.stock_quantity = input.stock_quantity;
            if (input.alert_stock !== undefined)
                updateData.alert_stock = input.alert_stock;
            if (input.isVisible !== undefined)
                updateData.isVisible = input.isVisible;
            if (input.tag !== undefined)
                updateData.tag = input.tag;
            // Update category relation if provided
            if (input.category_id !== undefined) {
                updateData.category = input.category_id
                    ? { connect: { category_id: input.category_id } }
                    : { disconnect: true };
            }
            // Update brand relation if provided
            if (input.brandID !== undefined) {
                updateData.brand = input.brandID
                    ? { connect: { brandID: input.brandID } }
                    : { disconnect: true };
            }
            const product = await product_repository_1.productRepository.update(productId, updateData);
            logger_1.logger.info('Product updated successfully', { productId });
            return product;
        }
        catch (error) {
            logger_1.logger.error('Error updating product', { error, productId, input });
            throw error;
        }
    }
    /**
     * Delete a product
     */
    async deleteProduct(productId) {
        // Check if product exists
        const existingProduct = await product_repository_1.productRepository.findById(productId);
        if (!existingProduct) {
            throw new errors_1.NotFoundError('Product not found');
        }
        try {
            // Delete associated images
            await image_service_1.imageService.deleteAllImagesForEntity(productId, 'products');
            // Delete product (variants will be cascade deleted by DB)
            await product_repository_1.productRepository.delete(productId);
            logger_1.logger.info('Product deleted successfully', { productId });
            return true;
        }
        catch (error) {
            logger_1.logger.error('Error deleting product', { error, productId });
            throw error;
        }
    }
    /**
     * Toggle product visibility
     */
    async toggleVisibility(productId, isVisible) {
        return this.updateProduct(productId, { isVisible });
    }
    /**
     * Create a product variant
     */
    async createVariant(input) {
        // Validate input
        this.validateVariantInput(input);
        // Check if product exists
        const product = await product_repository_1.productRepository.findById(input.product_id);
        if (!product) {
            throw new errors_1.NotFoundError('Product not found');
        }
        // Check if SKU is unique (if provided)
        if (input.sku) {
            const existingVariant = await product_repository_1.productRepository.getVariantById(input.product_id);
            // Note: We'd need to add a method to check SKU uniqueness in repository
        }
        try {
            const variantData = {
                variant_name: input.variant_name,
                buy_price: input.buy_price,
                sell_price: input.sell_price,
                stock: input.stock || 0,
                sku: input.sku,
                is_visible: input.is_visible ?? true,
                alert_stock: input.alert_stock || 0,
                product: {
                    connect: { product_id: input.product_id },
                },
            };
            const variant = await product_repository_1.productRepository.createVariant(variantData);
            logger_1.logger.info('Product variant created successfully', { variantId: variant.variant_id });
            // Update product price range
            await this.updateProductPriceRange(input.product_id);
            return variant;
        }
        catch (error) {
            logger_1.logger.error('Error creating variant', { error, input });
            throw error;
        }
    }
    /**
     * Update a product variant
     */
    async updateVariant(variantId, input) {
        // Check if variant exists
        const existingVariant = await product_repository_1.productRepository.getVariantById(variantId);
        if (!existingVariant) {
            throw new errors_1.NotFoundError('Variant not found');
        }
        try {
            const updateData = {};
            if (input.variant_name !== undefined)
                updateData.variant_name = input.variant_name;
            if (input.buy_price !== undefined)
                updateData.buy_price = input.buy_price;
            if (input.sell_price !== undefined)
                updateData.sell_price = input.sell_price;
            if (input.stock !== undefined)
                updateData.stock = input.stock;
            if (input.sku !== undefined)
                updateData.sku = input.sku;
            if (input.is_visible !== undefined)
                updateData.is_visible = input.is_visible;
            if (input.alert_stock !== undefined)
                updateData.alert_stock = input.alert_stock;
            updateData.updated_at = new Date();
            const variant = await product_repository_1.productRepository.updateVariant(variantId, updateData);
            logger_1.logger.info('Product variant updated successfully', { variantId });
            // Update product price range
            await this.updateProductPriceRange(existingVariant.product_id);
            return variant;
        }
        catch (error) {
            logger_1.logger.error('Error updating variant', { error, variantId, input });
            throw error;
        }
    }
    /**
     * Delete a product variant
     */
    async deleteVariant(variantId) {
        // Check if variant exists
        const existingVariant = await product_repository_1.productRepository.getVariantById(variantId);
        if (!existingVariant) {
            throw new errors_1.NotFoundError('Variant not found');
        }
        try {
            await product_repository_1.productRepository.deleteVariant(variantId);
            logger_1.logger.info('Product variant deleted successfully', { variantId });
            // Update product price range
            await this.updateProductPriceRange(existingVariant.product_id);
            return true;
        }
        catch (error) {
            logger_1.logger.error('Error deleting variant', { error, variantId });
            throw error;
        }
    }
    /**
     * Bulk update products
     */
    async bulkUpdateProducts(productIds, updates) {
        const results = {
            success: 0,
            failed: 0,
            errors: [],
        };
        for (const productId of productIds) {
            try {
                await this.updateProduct(productId, updates);
                results.success++;
            }
            catch (error) {
                results.failed++;
                results.errors.push({ productId, error: error.message });
            }
        }
        logger_1.logger.info('Bulk update completed', results);
        return results;
    }
    /**
     * Bulk delete products
     */
    async bulkDeleteProducts(productIds) {
        const results = {
            success: 0,
            failed: 0,
            errors: [],
        };
        for (const productId of productIds) {
            try {
                await this.deleteProduct(productId);
                results.success++;
            }
            catch (error) {
                results.failed++;
                results.errors.push({ productId, error: error.message });
            }
        }
        logger_1.logger.info('Bulk delete completed', results);
        return results;
    }
    /**
     * Update product price range based on variants
     */
    async updateProductPriceRange(productId) {
        try {
            const variants = await product_repository_1.productRepository.getAllVariants(productId);
            if (variants.length === 0) {
                await product_repository_1.productRepository.update(productId, { price_range: '--' });
                return;
            }
            const prices = variants
                .filter((v) => v.is_visible)
                .map((v) => parseFloat(v.sell_price.toString()));
            if (prices.length === 0) {
                await product_repository_1.productRepository.update(productId, { price_range: '--' });
                return;
            }
            const minPrice = Math.min(...prices);
            const maxPrice = Math.max(...prices);
            const priceRange = minPrice === maxPrice ? `${minPrice}` : `${minPrice} - ${maxPrice}`;
            await product_repository_1.productRepository.update(productId, { price_range: priceRange });
        }
        catch (error) {
            logger_1.logger.error('Error updating price range', { error, productId });
        }
    }
    /**
     * Validate product input
     */
    validateProductInput(input) {
        if (!input.name || input.name.trim().length === 0) {
            throw new errors_1.BadRequestError('Product name is required');
        }
        if (input.name.length > 255) {
            throw new errors_1.BadRequestError('Product name is too long (max 255 characters)');
        }
        // Validate prices if provided
        if (input.base_price && isNaN(parseFloat(input.base_price))) {
            throw new errors_1.BadRequestError('Invalid base price');
        }
        if (input.sale_price && isNaN(parseFloat(input.sale_price))) {
            throw new errors_1.BadRequestError('Invalid sale price');
        }
        // Validate stock quantity
        if (input.stock_quantity !== undefined && input.stock_quantity < 0) {
            throw new errors_1.BadRequestError('Stock quantity cannot be negative');
        }
    }
    /**
     * Validate variant input
     */
    validateVariantInput(input) {
        if (!input.variant_name || input.variant_name.trim().length === 0) {
            throw new errors_1.BadRequestError('Variant name is required');
        }
        if (input.buy_price < 0) {
            throw new errors_1.BadRequestError('Buy price cannot be negative');
        }
        if (input.sell_price < 0) {
            throw new errors_1.BadRequestError('Sell price cannot be negative');
        }
        if (input.stock !== undefined && input.stock < 0) {
            throw new errors_1.BadRequestError('Stock cannot be negative');
        }
    }
}
exports.ProductService = ProductService;
// Export singleton
exports.productService = new ProductService();
//# sourceMappingURL=product.service.js.map