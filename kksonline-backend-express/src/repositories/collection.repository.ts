import { db, Prisma } from '../config/database.config';
import { logger } from '../utils/logger';
import { NotFoundError, InternalServerError, BadRequestError } from '../utils/errors';
import { supabaseImageService } from '../services/supabase-image.service';
import { getSupabasePublicUrl } from '../config/supabase.config';
import {
  CacheKeys,
  generateCacheKey,
  deleteByPattern,
  withCache
} from '../utils/cache';

export interface CollectionWithItems {
  collection_id: number;
  name: string;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
  is_featured: boolean;
  display_order: number;
  created_at: Date;
  updated_at: Date;
  items: CollectionItemDetail[];
  total_price: number;
}

export interface CollectionItemDetail {
  collection_item_id: number;
  variant_id: number;
  default_quantity: number;
  sort_order: number;
  product_id: number;
  product_name: string;
  variant_name: string | null;
  sell_price: number;
  stock: number;
  is_visible: boolean;
  sku: string | null;
  image_url: string | null;
  all_variants?: VariantOption[];
}

export interface VariantOption {
  variant_id: number;
  variant_name: string | null;
  sell_price: number;
  stock: number;
  sku: string | null;
  is_visible: boolean;
}

export interface CollectionCartItem {
  variant_id: number;
  quantity: number;
}

export class CollectionRepository {
  /**
   * Helper function to process collection image URL
   * If image_url is just a filename (not a full URL), construct Supabase URL
   */
  private processImageUrl(imageUrl: string | null): string | null {
    if (!imageUrl || imageUrl === '' || imageUrl === '/logo.png') {
      return null;
    }
    
    // If it's already a full URL, return as-is
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      return imageUrl;
    }
    
    // Otherwise, construct Supabase URL from filename
    // Collections bucket name is 'collections'
    try {
      return getSupabasePublicUrl('collections', imageUrl);
    } catch (error) {
      logger.warn('[CollectionRepository] Error constructing Supabase URL for image', { imageUrl, error });
      return null;
    }
  }

  /**
   * Helper function to process a collection object and fix its image URL
   */
  private processCollection(collection: any): any {
    if (collection) {
      collection.image_url = this.processImageUrl(collection.image_url ?? null);
    }
    return collection;
  }

  /**
   * Helper function to process an array of collections
   */
  private processCollections(collections: any[]): any[] {
    return collections.map(c => this.processCollection(c));
  }

  /**
   * Attach main images for collections from `image_entity` + `images` tables.
   *
   * Why: In your DB, `collections.image_url` can be NULL; images are stored in
   * Supabase Storage and mapped by `image_entity` with `entity_category='collections'`,
   * where `images.folderType` is the bucket name and `images.filename` is the file name.
   */
  private async attachMainImagesForCollections(collections: any[]): Promise<any[]> {
    if (!collections || collections.length === 0) return [];

    const ids = collections
      .map((c) => Number(c.collection_id))
      .filter((id) => Number.isFinite(id) && id > 0);

    if (ids.length === 0) {
      return this.processCollections(collections);
    }

    const images = await supabaseImageService.getMainImagesForEntities(ids, 'collections');

    return collections.map((c) => {
      const id = Number(c.collection_id);
      const fallbackFromImages = images.get(id) || null;
      const merged = {
        ...c,
        image_url: c.image_url || fallbackFromImages,
      };
      return this.processCollection(merged);
    });
  }

  /**
   * Get all active collections (for customer display)
   */
  async findActive(params: { limit?: number; offset?: number; featuredOnly?: boolean } = {}): Promise<any[]> {
    const { limit = 10, offset = 0, featuredOnly = false } = params;
    const cacheKey = generateCacheKey('COLLECTIONS_ACTIVE', { limit, offset, featuredOnly });

    return withCache(cacheKey, async () => {
      try {
        // Use raw SQL to get collections with aggregated data
        const collections = await db.$queryRaw<any[]>`
          SELECT 
            c.collection_id,
            c.name,
            c.description,
            c.image_url,
            c.is_premium,
            c.is_featured,
            c.display_order,
            c.created_at,
            COUNT(ci.collection_item_id)::int AS item_count,
            COALESCE(SUM(pv.sell_price * ci.default_quantity), 0)::numeric AS total_price
          FROM collections c
          LEFT JOIN collection_items ci ON c.collection_id = ci.collection_id
          LEFT JOIN product_variants pv ON ci.variant_id = pv.variant_id AND pv.is_visible = true
          WHERE c.is_active = true
            ${featuredOnly ? Prisma.sql`AND c.is_featured = true` : Prisma.empty}
          GROUP BY c.collection_id
          ORDER BY c.display_order ASC, c.created_at DESC
          LIMIT ${limit}
          OFFSET ${offset}
        `;

        return await this.attachMainImagesForCollections(collections);
      } catch (error) {
        logger.error('Error fetching active collections', { error, params });
        throw new InternalServerError('Database error');
      }
    });
  }

  /**
   * Get collection by ID with full details
   */
  async findById(collectionId: number): Promise<CollectionWithItems | null> {
    const cacheKey = generateCacheKey('COLLECTION', { id: collectionId });

    return withCache(cacheKey, async () => {
      try {
        // Get collection basic info
        const collection = await db.$queryRaw<any[]>`
          SELECT 
            collection_id,
            name,
            description,
            image_url,
            is_active,
            is_featured,
            display_order,
            created_at,
            updated_at
          FROM collections
          WHERE collection_id = ${collectionId}
        `;

        if (!collection || collection.length === 0) {
          return null;
        }

        // Get collection items with product details
        const items = await db.$queryRaw<any[]>`
          SELECT 
            ci.collection_item_id,
            ci.variant_id,
            ci.default_quantity,
            ci.sort_order,
            p.product_id,
            p.name AS product_name,
            pv.variant_name,
            pv.sell_price,
            pv.stock,
            pv.is_visible,
            pv.sku
          FROM collection_items ci
          INNER JOIN product_variants pv ON ci.variant_id = pv.variant_id
          INNER JOIN products p ON pv.product_id = p.product_id
          WHERE ci.collection_id = ${collectionId}
            AND pv.is_visible = true
            AND p."isVisible" = true
          ORDER BY ci.sort_order ASC
        `;

        // Get images for all products
        const productIds = items.map(item => item.product_id);
        const images = await supabaseImageService.getMainImagesForEntities(productIds, 'products');

        // Get all variants for each product
        const itemsWithDetails: CollectionItemDetail[] = await Promise.all(
          items.map(async (item) => {
            // Get all variants for this product
            const allVariants = await db.$queryRaw<VariantOption[]>`
              SELECT 
                variant_id,
                variant_name,
                sell_price,
                stock,
                sku,
                is_visible
              FROM product_variants
              WHERE product_id = ${item.product_id}
                AND is_visible = true
              ORDER BY sell_price ASC
            `;

            return {
              ...item,
              image_url: images.get(item.product_id) || null,
              all_variants: allVariants,
            };
          })
        );

        // Calculate total price
        const totalPrice = itemsWithDetails.reduce(
          (sum, item) => sum + Number(item.sell_price) * item.default_quantity,
          0
        );

        const mainImage = await supabaseImageService.getMainImageUrl(collectionId, 'collections');
        const processedCollection = this.processCollection({
          ...collection[0],
          image_url: collection[0].image_url || mainImage,
        });
        return {
          ...processedCollection,
          items: itemsWithDetails,
          total_price: totalPrice,
        };
      } catch (error) {
        logger.error('Error fetching collection by ID', { error, collectionId });
        throw new InternalServerError('Database error');
      }
    });
  }

  /**
   * Get featured collections (for hero section)
   */
  async findFeatured(limit: number = 7): Promise<any[]> {
    return this.findActive({ limit, offset: 0, featuredOnly: true });
  }

  /**
   * Get ONE premium collection (for main banner)
   */
  async findPremium(): Promise<any | null> {
    const cacheKey = generateCacheKey('COLLECTION_PREMIUM', {});

    return withCache(cacheKey, async () => {
      try {
        const collections = await db.$queryRaw<any[]>`
          SELECT 
            c.collection_id,
            c.name,
            c.description,
            c.image_url,
            c.is_premium,
            c.is_featured,
            c.display_order,
            c.created_at,
            COUNT(ci.collection_item_id)::int AS item_count,
            COALESCE(SUM(pv.sell_price * ci.default_quantity), 0)::numeric AS total_price
          FROM collections c
          LEFT JOIN collection_items ci ON c.collection_id = ci.collection_id
          LEFT JOIN product_variants pv ON ci.variant_id = pv.variant_id AND pv.is_visible = true
          WHERE c.is_active = true AND c.is_premium = true
          GROUP BY c.collection_id
          LIMIT 1
        `;

        if (collections.length > 0) {
          const c = collections[0];
          const img = await supabaseImageService.getMainImageUrl(Number(c.collection_id), 'collections');
          return this.processCollection({
            ...c,
            image_url: c.image_url || img,
          });
        }
        return null;
      } catch (error) {
        logger.error('Error fetching premium collection', { error });
        throw new InternalServerError('Database error');
      }
    });
  }

  /**
   * Get standard collections (non-premium, for side/bottom cards)
   */
  async findStandard(limit: number = 6): Promise<any[]> {
    const cacheKey = generateCacheKey('COLLECTIONS_STANDARD', { limit });

    return withCache(cacheKey, async () => {
      try {
        const collections = await db.$queryRaw<any[]>`
          SELECT 
            c.collection_id,
            c.name,
            c.description,
            c.image_url,
            c.is_featured,
            c.display_order,
            c.created_at,
            COUNT(ci.collection_item_id)::int AS item_count,
            COALESCE(SUM(pv.sell_price * ci.default_quantity), 0)::numeric AS total_price
          FROM collections c
          LEFT JOIN collection_items ci ON c.collection_id = ci.collection_id
          LEFT JOIN product_variants pv ON ci.variant_id = pv.variant_id AND pv.is_visible = true
          WHERE c.is_active = true 
            AND c.is_featured = true 
            AND (c.is_premium = false OR c.is_premium IS NULL)
          GROUP BY c.collection_id
          ORDER BY c.display_order ASC, c.created_at DESC
          LIMIT ${limit}
        `;

        return await this.attachMainImagesForCollections(collections);
      } catch (error) {
        logger.error('Error fetching standard collections', { error, limit });
        throw new InternalServerError('Database error');
      }
    });
  }

  /**
   * Get premium collection (ONE collection for main banner)
   */
  async findPremiumCollection(): Promise<any | null> {
    const cacheKey = generateCacheKey('COLLECTION_PREMIUM', {});

    return withCache(cacheKey, async () => {
      try {
        const collections = await db.$queryRaw<any[]>`
          SELECT 
            c.collection_id,
            c.name,
            c.description,
            c.image_url,
            c.is_featured,
            c.is_premium,
            c.display_order,
            c.created_at,
            COUNT(ci.collection_item_id)::int AS item_count,
            COALESCE(SUM(pv.sell_price * ci.default_quantity), 0)::numeric AS total_price
          FROM collections c
          LEFT JOIN collection_items ci ON c.collection_id = ci.collection_id
          LEFT JOIN product_variants pv ON ci.variant_id = pv.variant_id AND pv.is_visible = true
          WHERE c.is_active = true
            AND c.is_premium = true
          GROUP BY c.collection_id
          ORDER BY c.display_order ASC
          LIMIT 1
        `;

        if (collections.length > 0) {
          const c = collections[0];
          const img = await supabaseImageService.getMainImageUrl(Number(c.collection_id), 'collections');
          return this.processCollection({
            ...c,
            image_url: c.image_url || img,
          });
        }
        return null;
      } catch (error) {
        logger.error('Error fetching premium collection', { error });
        throw new InternalServerError('Database error');
      }
    });
  }

  /**
   * Get standard collections (excludes premium)
   */
  async findStandardCollections(limit: number = 6): Promise<any[]> {
    const cacheKey = generateCacheKey('COLLECTIONS_STANDARD', { limit });

    return withCache(cacheKey, async () => {
      try {
        const collections = await db.$queryRaw<any[]>`
          SELECT 
            c.collection_id,
            c.name,
            c.description,
            c.image_url,
            c.is_featured,
            c.is_premium,
            c.display_order,
            c.created_at,
            COUNT(ci.collection_item_id)::int AS item_count,
            COALESCE(SUM(pv.sell_price * ci.default_quantity), 0)::numeric AS total_price
          FROM collections c
          LEFT JOIN collection_items ci ON c.collection_id = ci.collection_id
          LEFT JOIN product_variants pv ON ci.variant_id = pv.variant_id AND pv.is_visible = true
          WHERE c.is_active = true
            AND c.is_featured = true
            AND c.is_premium = false
          GROUP BY c.collection_id
          ORDER BY c.created_at DESC
          LIMIT ${limit}
        `;

        return await this.attachMainImagesForCollections(collections);
      } catch (error) {
        logger.error('Error fetching standard collections', { error, limit });
        throw new InternalServerError('Database error');
      }
    });
  }

  /**
   * Add collection to cart
   */
  async addToCart(customerId: number, collectionId: number, items: CollectionCartItem[]): Promise<any> {
    try {
      // Validate collection exists and is active
      const collection = await this.findById(collectionId);
      if (!collection || !collection.is_active) {
        throw new NotFoundError('Collection not found or inactive');
      }

      // Validate all variants exist and have sufficient stock
      for (const item of items) {
        const variant = await db.$queryRaw<any[]>`
          SELECT variant_id, stock, is_visible
          FROM product_variants
          WHERE variant_id = ${item.variant_id}
        `;

        if (!variant || variant.length === 0 || !variant[0].is_visible) {
          throw new BadRequestError(`Variant ${item.variant_id} not found or not visible`);
        }

        if (variant[0].stock < item.quantity) {
          throw new BadRequestError(`Insufficient stock for variant ${item.variant_id}`);
        }
      }

      // Check if collection already in cart
      const existingCart = await db.$queryRaw<any[]>`
        SELECT collection_cart_id
        FROM collection_cart
        WHERE customer_id = ${customerId} AND collection_id = ${collectionId}
      `;

      let collectionCartId: number;

      if (existingCart && existingCart.length > 0) {
        // Update existing cart entry
        collectionCartId = existingCart[0].collection_cart_id;
        
        // Delete old items
        await db.$executeRaw`
          DELETE FROM collection_cart_items
          WHERE collection_cart_id = ${collectionCartId}
        `;
      } else {
        // Create new cart entry
        const newCart = await db.$queryRaw<any[]>`
          INSERT INTO collection_cart (customer_id, collection_id)
          VALUES (${customerId}, ${collectionId})
          RETURNING collection_cart_id
        `;
        collectionCartId = newCart[0].collection_cart_id;
      }

      // Insert cart items
      for (const item of items) {
        await db.$executeRaw`
          INSERT INTO collection_cart_items (collection_cart_id, variant_id, quantity)
          VALUES (${collectionCartId}, ${item.variant_id}, ${item.quantity})
        `;
      }

      // Invalidate cart cache
      deleteByPattern(`CART_customer:${customerId}`);

      return { collection_cart_id: collectionCartId, message: 'Collection added to cart' };
    } catch (error) {
      if (error instanceof BadRequestError || error instanceof NotFoundError) {
        throw error;
      }
      logger.error('Error adding collection to cart', { error, customerId, collectionId });
      throw new InternalServerError('Failed to add collection to cart');
    }
  }

  /**
   * Get customer's collection cart
   */
  async getCustomerCollectionCart(customerId: number): Promise<any[]> {
    const cacheKey = generateCacheKey('COLLECTION_CART', { customerId });

    return withCache(cacheKey, async () => {
      try {
        const cartItems = await db.$queryRaw<any[]>`
          SELECT 
            cc.collection_cart_id,
            cc.collection_id,
            c.name AS collection_name,
            c.image_url AS collection_image,
            cci.variant_id,
            cci.quantity,
            p.product_id,
            p.name AS product_name,
            pv.variant_name,
            pv.sell_price,
            pv.stock
          FROM collection_cart cc
          INNER JOIN collections c ON cc.collection_id = c.collection_id
          INNER JOIN collection_cart_items cci ON cc.collection_cart_id = cci.collection_cart_id
          INNER JOIN product_variants pv ON cci.variant_id = pv.variant_id
          INNER JOIN products p ON pv.product_id = p.product_id
          WHERE cc.customer_id = ${customerId}
            AND c.is_active = true
            AND pv.is_visible = true
          ORDER BY cc.created_at DESC
        `;

        return cartItems;
      } catch (error) {
        logger.error('Error fetching collection cart', { error, customerId });
        throw new InternalServerError('Database error');
      }
    }, 60); // Cache for 1 minute
  }

  /**
   * Remove collection from cart
   */
  async removeFromCart(customerId: number, collectionCartId: number): Promise<boolean> {
    try {
      await db.$executeRaw`
        DELETE FROM collection_cart
        WHERE collection_cart_id = ${collectionCartId}
          AND customer_id = ${customerId}
      `;

      deleteByPattern(`COLLECTION_CART_customer:${customerId}`);
      return true;
    } catch (error) {
      logger.error('Error removing collection from cart', { error, customerId, collectionCartId });
      throw new InternalServerError('Failed to remove collection from cart');
    }
  }

  /**
   * Calculate collection price with custom items
   */
  async calculatePrice(items: CollectionCartItem[]): Promise<number> {
    try {
      let total = 0;

      for (const item of items) {
        const variant = await db.$queryRaw<any[]>`
          SELECT sell_price
          FROM product_variants
          WHERE variant_id = ${item.variant_id} AND is_visible = true
        `;

        if (variant && variant.length > 0) {
          total += Number(variant[0].sell_price) * item.quantity;
        }
      }

      return total;
    } catch (error) {
      logger.error('Error calculating collection price', { error, items });
      throw new InternalServerError('Failed to calculate price');
    }
  }

  /**
   * Get collection count
   */
  async getCount(activeOnly: boolean = true): Promise<number> {
    try {
      const result = await db.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*)::bigint as count
        FROM collections
        ${activeOnly ? Prisma.sql`WHERE is_active = true` : Prisma.empty}
      `;

      return Number(result[0]?.count ?? 0);
    } catch (error) {
      logger.error('Error getting collection count', { error });
      return 0;
    }
  }

  /**
   * Invalidate collection cache
   */
  invalidateCache(collectionId?: number): void {
    if (collectionId) {
      deleteByPattern(`COLLECTION_id:${collectionId}`);
    }
    deleteByPattern('COLLECTIONS_ACTIVE');
  }
}

// Export singleton
export const collectionRepository = new CollectionRepository();
