import { db, Prisma } from '../config/database.config';
import { logger } from '../utils/logger';
import { NotFoundError, InternalServerError } from '../utils/errors';
import {
  CacheKeys,
  generateCacheKey,
  deleteByPattern,
  withCache
} from '../utils/cache';
import { supabaseImageService } from '../services/supabase-image.service';
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

export class ProductRepository {
  /**
   * Get product by ID
   */
  async findById(productId: number): Promise<Product | null> {
    const cacheKey = generateCacheKey(CacheKeys.PRODUCT, { id: productId });

    return withCache(cacheKey, async () => {
      try {
        const product = await db.product.findUnique({
          where: { product_id: productId },
        });
        return product;
      } catch (error) {
        logger.error('Error fetching product by ID', { error, productId });
        throw new InternalServerError('Database error');
      }
    });
  }

  /**
   * Get product with all relations
   */
  async findByIdWithDetails(productId: number): Promise<ProductWithDetails | null> {
    const cacheKey = generateCacheKey(CacheKeys.PRODUCT, { id: productId, detailed: true });

    return withCache(cacheKey, async () => {
      try {
        const product = await db.product.findUnique({
          where: { product_id: productId },
          include: {
            category: true,
            brand: true,
            variants: true,
          },
        });

        if (!product) return null;

        // Get images
        const images = await supabaseImageService.getAllImagesForEntity(productId, 'products');
        const mainImage = await supabaseImageService.getMainImageUrl(productId, 'products');

        return {
          ...product,
          category: product.category || undefined,
          brand: product.brand || undefined,
          images,
          mainImage: mainImage || undefined,
        };
      } catch (error) {
        logger.error('Error fetching product with details', { error, productId });
        throw new InternalServerError('Database error');
      }
    });
  }

  /**
   * Get popular products
   */
  async findPopular(params: { limit?: number; offset?: number } = {}): Promise<Product[]> {
    const { limit = 10, offset = 0 } = params;
    const cacheKey = generateCacheKey(CacheKeys.POPULAR_PRODUCTS, { limit, offset });

    return withCache(cacheKey, async () => {
      try {
        const products = await db.product.findMany({
          where: {
            ispopular: true,
            isVisible: true,
          },
          orderBy: { created_at: 'desc' },
          skip: offset,
          take: limit,
        });
        return products;
      } catch (error) {
        logger.error('Error fetching popular products', { error });
        throw new InternalServerError('Database error');
      }
    });
  }

  /**
   * Get products by category
   */
  async findByCategory(categoryId: number, params: { page?: number; pageSize?: number } = {}): Promise<{
    products: Product[];
    total: number;
  }> {
    const { page = 1, pageSize = 20 } = params;
    const offset = (page - 1) * pageSize;
    const cacheKey = generateCacheKey(CacheKeys.PRODUCTS, { categoryId, page, pageSize });

    return withCache(cacheKey, async () => {
      try {
        const [products, total] = await Promise.all([
          db.product.findMany({
            where: {
              category_id: categoryId,
              isVisible: true,
            },
            orderBy: { created_at: 'desc' },
            skip: offset,
            take: pageSize,
          }),
          db.product.count({
            where: {
              category_id: categoryId,
              isVisible: true,
            },
          }),
        ]);

        return { products, total };
      } catch (error) {
        logger.error('Error fetching products by category', { error, categoryId });
        throw new InternalServerError('Database error');
      }
    });
  }

  /**
   * Get products by brand
   */
  async findByBrand(brandId: number, params: { limit?: number } = {}): Promise<Product[]> {
    const { limit = 50 } = params;
    const cacheKey = generateCacheKey(CacheKeys.PRODUCTS, { brandId, limit });

    return withCache(cacheKey, async () => {
      try {
        const products = await db.product.findMany({
          where: {
            brandID: brandId,
            isVisible: true,
          },
          orderBy: { created_at: 'desc' },
          take: limit,
        });
        return products;
      } catch (error) {
        logger.error('Error fetching products by brand', { error, brandId });
        throw new InternalServerError('Database error');
      }
    });
  }

  /**
   * Search products
   */
  async search(params: SearchParams): Promise<{ products: Product[]; total: number }> {
    const {
      query,
      categoryId,
      brandId,
      minPrice,
      maxPrice,
      isPopular,
      tag,
      sortBy = 'created_at',
      sortOrder = 'desc',
      page = 1,
      pageSize = 20,
    } = params;

    const offset = (page - 1) * pageSize;

    try {
      const where: Prisma.ProductWhereInput = {
        isVisible: true,
      };

      // Apply filters
      if (query) {
        const sanitizedQuery = query.replace(/[%_]/g, '');
        if (sanitizedQuery.length > 0) {
          where.name = { contains: sanitizedQuery, mode: 'insensitive' };
        }
      }

      if (categoryId) {
        where.category_id = categoryId;
      }

      if (brandId) {
        where.brandID = brandId;
      }

      if (isPopular !== undefined) {
        where.ispopular = isPopular;
      }

      if (tag) {
        where.tag = tag as any;
      }

      // Price filtering
      if (minPrice !== undefined || maxPrice !== undefined) {
        where.sale_price = {};
        if (minPrice !== undefined) {
          where.sale_price.gte = minPrice.toString();
        }
        if (maxPrice !== undefined) {
          where.sale_price.lte = maxPrice.toString();
        }
      }

      // Sorting
      const orderBy: Prisma.ProductOrderByWithRelationInput = {};
      const sortColumn = sortBy === 'popularity' ? 'ispopular' : sortBy === 'price' ? 'sale_price' : sortBy;
      orderBy[sortColumn as keyof Prisma.ProductOrderByWithRelationInput] = sortOrder;

      const [products, total] = await Promise.all([
        db.product.findMany({
          where,
          orderBy,
          skip: offset,
          take: pageSize,
        }),
        db.product.count({ where }),
      ]);

      return { products, total };
    } catch (error) {
      logger.error('Error searching products', { error, params });
      throw new InternalServerError('Database error');
    }
  }

  /**
   * Get search suggestions (autocomplete)
   */
  async getSearchSuggestions(query: string): Promise<string[]> {
    if (!query || query.length < 2) return [];

    const cacheKey = generateCacheKey(CacheKeys.SEARCH_SUGGESTIONS, { query: query.toLowerCase() });

    return withCache(cacheKey, async () => {
      try {
        const sanitizedQuery = query.replace(/[%_]/g, '');

        const products = await db.product.findMany({
          where: {
            isVisible: true,
            name: { contains: sanitizedQuery, mode: 'insensitive' },
          },
          select: { name: true },
          take: 10,
        });

        const suggestions = [...new Set(products.map((p) => p.name))];
        return suggestions;
      } catch (error) {
        logger.error('Error getting search suggestions', { error, query });
        return [];
      }
    }, 300);
  }

  /**
   * Get products by IDs (batch)
   */
  async findByIds(productIds: number[]): Promise<Product[]> {
    if (productIds.length === 0) return [];

    try {
      const products = await db.product.findMany({
        where: { product_id: { in: productIds } },
      });
      return products;
    } catch (error) {
      logger.error('Error fetching products by IDs', { error, productIds });
      throw new InternalServerError('Database error');
    }
  }

  /**
   * Get all products (with pagination)
   */
  async findAll(params: {
    page?: number;
    pageSize?: number;
    visibleOnly?: boolean;
  } = {}): Promise<{ products: Product[]; total: number }> {
    const { page = 1, pageSize = 20, visibleOnly = false } = params;
    const offset = (page - 1) * pageSize;

    try {
      const where: Prisma.ProductWhereInput = {};
      if (visibleOnly) {
        where.isVisible = true;
      }

      const [products, total] = await Promise.all([
        db.product.findMany({
          where,
          orderBy: { created_at: 'desc' },
          skip: offset,
          take: pageSize,
        }),
        db.product.count({ where }),
      ]);

      return { products, total };
    } catch (error) {
      logger.error('Error fetching all products', { error });
      throw new InternalServerError('Database error');
    }
  }

  /**
   * Get product count
   */
  async getCount(filters?: { categoryId?: number; brandId?: number; isPopular?: boolean }): Promise<number> {
    try {
      const where: Prisma.ProductWhereInput = { isVisible: true };

      if (filters?.categoryId) {
        where.category_id = filters.categoryId;
      }

      if (filters?.brandId) {
        where.brandID = filters.brandId;
      }

      if (filters?.isPopular !== undefined) {
        where.ispopular = filters.isPopular;
      }

      const count = await db.product.count({ where });
      return count;
    } catch (error) {
      logger.error('Error getting product count', { error, filters });
      return 0;
    }
  }

  /**
   * Create product (admin)
   */
  async create(product: Prisma.ProductCreateInput): Promise<Product> {
    try {
      const newProduct = await db.product.create({
        data: product,
      });

      this.invalidateCache();
      return newProduct;
    } catch (error) {
      logger.error('Error creating product', { error });
      throw new InternalServerError('Failed to create product');
    }
  }

  /**
   * Update product (admin)
   */
  async update(productId: number, updates: Prisma.ProductUpdateInput): Promise<Product> {
    try {
      const product = await db.product.update({
        where: { product_id: productId },
        data: updates,
      });

      this.invalidateCache(productId);
      return product;
    } catch (error) {
      if ((error as { code?: string }).code === 'P2025') {
        throw new NotFoundError('Product not found');
      }
      logger.error('Error updating product', { error, productId });
      throw new InternalServerError('Failed to update product');
    }
  }

  /**
   * Delete product (admin)
   */
  async delete(productId: number): Promise<boolean> {
    try {
      await db.product.delete({
        where: { product_id: productId },
      });

      this.invalidateCache(productId);
      return true;
    } catch (error) {
      logger.error('Error deleting product', { error, productId });
      throw new InternalServerError('Failed to delete product');
    }
  }

  /**
   * Get product variants (visible only)
   */
  async getVariants(productId: number): Promise<ProductVariant[]> {
    const cacheKey = generateCacheKey(CacheKeys.PRODUCT_VARIANTS, { productId });

    return withCache(cacheKey, async () => {
      try {
        const variants = await db.productVariant.findMany({
          where: {
            product_id: productId,
            is_visible: true,
          },
          orderBy: { sell_price: 'asc' },
        });
        return variants;
      } catch (error) {
        logger.error('Error fetching product variants', { error, productId });
        throw new InternalServerError('Database error');
      }
    });
  }

  /**
   * Get all product variants including hidden (admin)
   */
  async getAllVariants(productId: number): Promise<ProductVariant[]> {
    try {
      const variants = await db.productVariant.findMany({
        where: { product_id: productId },
        orderBy: { sell_price: 'asc' },
      });
      return variants;
    } catch (error) {
      logger.error('Error fetching all product variants', { error, productId });
      throw new InternalServerError('Database error');
    }
  }

  /**
   * Get variant by ID
   */
  async getVariantById(variantId: number): Promise<ProductVariant | null> {
    try {
      const variant = await db.productVariant.findUnique({
        where: { variant_id: variantId },
      });
      return variant;
    } catch (error) {
      logger.error('Error fetching variant', { error, variantId });
      throw new InternalServerError('Database error');
    }
  }

  /**
   * Create product variant (admin)
   */
  async createVariant(variant: Prisma.ProductVariantCreateInput): Promise<ProductVariant> {
    try {
      const newVariant = await db.productVariant.create({
        data: variant,
      });

      deleteByPattern(`${CacheKeys.PRODUCT_VARIANTS}_productId:`);
      return newVariant;
    } catch (error) {
      logger.error('Error creating variant', { error });
      throw new InternalServerError('Failed to create variant');
    }
  }

  /**
   * Update product variant (admin)
   */
  async updateVariant(variantId: number, updates: Prisma.ProductVariantUpdateInput): Promise<ProductVariant> {
    try {
      const variant = await db.productVariant.update({
        where: { variant_id: variantId },
        data: updates,
      });

      deleteByPattern(`${CacheKeys.PRODUCT_VARIANTS}_productId:${variant.product_id}`);
      return variant;
    } catch (error) {
      if ((error as { code?: string }).code === 'P2025') {
        throw new NotFoundError('Variant not found');
      }
      logger.error('Error updating variant', { error, variantId });
      throw new InternalServerError('Failed to update variant');
    }
  }

  /**
   * Delete product variant (admin)
   */
  async deleteVariant(variantId: number): Promise<boolean> {
    // Get product_id first for cache invalidation
    const variant = await this.getVariantById(variantId);
    if (!variant) {
      throw new NotFoundError('Variant not found');
    }

    try {
      await db.productVariant.delete({
        where: { variant_id: variantId },
      });

      deleteByPattern(`${CacheKeys.PRODUCT_VARIANTS}_productId:${variant.product_id}`);
      return true;
    } catch (error) {
      logger.error('Error deleting variant', { error, variantId });
      throw new InternalServerError('Failed to delete variant');
    }
  }

  /**
   * Invalidate product cache
   */
  private invalidateCache(productId?: number): void {
    if (productId) {
      deleteByPattern(`${CacheKeys.PRODUCT}_id:${productId}`);
    }
    deleteByPattern(CacheKeys.PRODUCTS);
    deleteByPattern(CacheKeys.POPULAR_PRODUCTS);
  }
}

// Export singleton
export const productRepository = new ProductRepository();
