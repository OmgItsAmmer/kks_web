"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.collectionRepository = exports.CollectionRepository = void 0;
const database_config_1 = require("../config/database.config");
const logger_1 = require("../utils/logger");
const errors_1 = require("../utils/errors");
const supabase_image_service_1 = require("../services/supabase-image.service");
const supabase_config_1 = require("../config/supabase.config");
const cache_1 = require("../utils/cache");
class CollectionRepository {
    /**
     * Helper function to process collection image URL
     * If image_url is just a filename (not a full URL), construct Supabase URL
     */
    processImageUrl(imageUrl) {
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
            return (0, supabase_config_1.getSupabasePublicUrl)('collections', imageUrl);
        }
        catch (error) {
            logger_1.logger.warn('[CollectionRepository] Error constructing Supabase URL for image', { imageUrl, error });
            return null;
        }
    }
    /**
     * Helper function to process a collection object and fix its image URL
     */
    processCollection(collection) {
        if (collection) {
            collection.image_url = this.processImageUrl(collection.image_url ?? null);
        }
        return collection;
    }
    /**
     * Helper function to process an array of collections
     */
    processCollections(collections) {
        return collections.map(c => this.processCollection(c));
    }
    /**
     * Attach main images for collections from `image_entity` + `images` tables.
     *
     * Why: In your DB, `collections.image_url` can be NULL; images are stored in
     * Supabase Storage and mapped by `image_entity` with `entity_category='collections'`,
     * where `images.folderType` is the bucket name and `images.filename` is the file name.
     */
    async attachMainImagesForCollections(collections) {
        if (!collections || collections.length === 0)
            return [];
        const ids = collections
            .map((c) => Number(c.collection_id))
            .filter((id) => Number.isFinite(id) && id > 0);
        if (ids.length === 0) {
            return this.processCollections(collections);
        }
        logger_1.logger.info(`[CollectionRepository] Fetching images for ${ids.length} collections:`, ids);
        const images = await supabase_image_service_1.supabaseImageService.getMainImagesForEntities(ids, 'collections');
        logger_1.logger.info(`[CollectionRepository] Image service returned ${images.size} images`);
        images.forEach((url, collectionId) => {
            logger_1.logger.debug(`[CollectionRepository] Collection ${collectionId} -> ${url}`);
        });
        return collections.map((c) => {
            const id = Number(c.collection_id);
            const fallbackFromImages = images.get(id) || null;
            const originalImageUrl = c.image_url;
            // Determine final image URL with proper priority:
            // 1. Use fetched image from image_entity if available
            // 2. Only use c.image_url if it's a valid URL (not a placeholder like '/logo.png')
            // 3. Otherwise null
            let finalImageUrl = null;
            if (fallbackFromImages) {
                // Prefer the fetched image from image_entity
                finalImageUrl = fallbackFromImages;
            }
            else if (originalImageUrl && originalImageUrl !== '/logo.png' && originalImageUrl !== '') {
                // Use collections table image_url only if it's not a placeholder
                finalImageUrl = originalImageUrl;
            }
            const merged = {
                ...c,
                image_url: finalImageUrl,
            };
            logger_1.logger.debug(`[CollectionRepository] Collection ${id} (${c.name}):`, {
                original_image_url: originalImageUrl,
                fetched_from_image_entity: fallbackFromImages,
                final_image_url: merged.image_url,
            });
            return this.processCollection(merged);
        });
    }
    /**
     * Get all active collections (for customer display)
     */
    async findActive(params = {}) {
        const { limit = 10, offset = 0, featuredOnly = false } = params;
        const cacheKey = (0, cache_1.generateCacheKey)('COLLECTIONS_ACTIVE', { limit, offset, featuredOnly });
        return (0, cache_1.withCache)(cacheKey, async () => {
            try {
                // Use raw SQL to get collections with aggregated data
                const collections = await database_config_1.db.$queryRaw `
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
            ${featuredOnly ? database_config_1.Prisma.sql `AND c.is_featured = true` : database_config_1.Prisma.empty}
          GROUP BY c.collection_id
          ORDER BY c.display_order ASC, c.created_at DESC
          LIMIT ${limit}
          OFFSET ${offset}
        `;
                return await this.attachMainImagesForCollections(collections);
            }
            catch (error) {
                logger_1.logger.error('Error fetching active collections', { error, params });
                throw new errors_1.InternalServerError('Database error');
            }
        });
    }
    /**
     * Get collection by ID with full details
     */
    async findById(collectionId) {
        const cacheKey = (0, cache_1.generateCacheKey)('COLLECTION', { id: collectionId });
        return (0, cache_1.withCache)(cacheKey, async () => {
            try {
                // Get collection basic info
                const collection = await database_config_1.db.$queryRaw `
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
                const items = await database_config_1.db.$queryRaw `
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
                const images = await supabase_image_service_1.supabaseImageService.getMainImagesForEntities(productIds, 'products');
                // Get all variants for each product
                const itemsWithDetails = await Promise.all(items.map(async (item) => {
                    // Get all variants for this product
                    const allVariants = await database_config_1.db.$queryRaw `
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
                }));
                // Calculate total price
                const totalPrice = itemsWithDetails.reduce((sum, item) => sum + Number(item.sell_price) * item.default_quantity, 0);
                const mainImage = await supabase_image_service_1.supabaseImageService.getMainImageUrl(collectionId, 'collections');
                // Prefer fetched image over placeholder
                let finalImageUrl = null;
                if (mainImage) {
                    finalImageUrl = mainImage;
                }
                else if (collection[0].image_url && collection[0].image_url !== '/logo.png' && collection[0].image_url !== '') {
                    finalImageUrl = collection[0].image_url;
                }
                const processedCollection = this.processCollection({
                    ...collection[0],
                    image_url: finalImageUrl,
                });
                return {
                    ...processedCollection,
                    items: itemsWithDetails,
                    total_price: totalPrice,
                };
            }
            catch (error) {
                logger_1.logger.error('Error fetching collection by ID', { error, collectionId });
                throw new errors_1.InternalServerError('Database error');
            }
        });
    }
    /**
     * Get featured collections (for hero section)
     */
    async findFeatured(limit = 7) {
        return this.findActive({ limit, offset: 0, featuredOnly: true });
    }
    /**
     * Get ONE premium collection (for main banner)
     */
    async findPremium() {
        const cacheKey = (0, cache_1.generateCacheKey)('COLLECTION_PREMIUM', {});
        return (0, cache_1.withCache)(cacheKey, async () => {
            try {
                const collections = await database_config_1.db.$queryRaw `
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
                    const img = await supabase_image_service_1.supabaseImageService.getMainImageUrl(Number(c.collection_id), 'collections');
                    // Prefer fetched image over placeholder
                    let finalImageUrl = null;
                    if (img) {
                        finalImageUrl = img;
                    }
                    else if (c.image_url && c.image_url !== '/logo.png' && c.image_url !== '') {
                        finalImageUrl = c.image_url;
                    }
                    return this.processCollection({
                        ...c,
                        image_url: finalImageUrl,
                    });
                }
                return null;
            }
            catch (error) {
                logger_1.logger.error('Error fetching premium collection', { error });
                throw new errors_1.InternalServerError('Database error');
            }
        });
    }
    /**
     * Get standard collections (non-premium, for side/bottom cards)
     */
    async findStandard(limit = 6) {
        const cacheKey = (0, cache_1.generateCacheKey)('COLLECTIONS_STANDARD', { limit });
        return (0, cache_1.withCache)(cacheKey, async () => {
            try {
                const collections = await database_config_1.db.$queryRaw `
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
            }
            catch (error) {
                logger_1.logger.error('Error fetching standard collections', { error, limit });
                throw new errors_1.InternalServerError('Database error');
            }
        });
    }
    /**
     * Get premium collection (ONE collection for main banner)
     */
    async findPremiumCollection() {
        const cacheKey = (0, cache_1.generateCacheKey)('COLLECTION_PREMIUM', {});
        return (0, cache_1.withCache)(cacheKey, async () => {
            try {
                const collections = await database_config_1.db.$queryRaw `
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
                    const img = await supabase_image_service_1.supabaseImageService.getMainImageUrl(Number(c.collection_id), 'collections');
                    // Prefer fetched image over placeholder
                    let finalImageUrl = null;
                    if (img) {
                        finalImageUrl = img;
                    }
                    else if (c.image_url && c.image_url !== '/logo.png' && c.image_url !== '') {
                        finalImageUrl = c.image_url;
                    }
                    return this.processCollection({
                        ...c,
                        image_url: finalImageUrl,
                    });
                }
                return null;
            }
            catch (error) {
                logger_1.logger.error('Error fetching premium collection', { error });
                throw new errors_1.InternalServerError('Database error');
            }
        });
    }
    /**
     * Get standard collections (excludes premium)
     */
    async findStandardCollections(limit = 6) {
        const cacheKey = (0, cache_1.generateCacheKey)('COLLECTIONS_STANDARD', { limit });
        return (0, cache_1.withCache)(cacheKey, async () => {
            try {
                const collections = await database_config_1.db.$queryRaw `
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
            }
            catch (error) {
                logger_1.logger.error('Error fetching standard collections', { error, limit });
                throw new errors_1.InternalServerError('Database error');
            }
        });
    }
    /**
     * Add collection to cart
     */
    async addToCart(customerId, collectionId, items) {
        try {
            // Validate collection exists and is active
            const collection = await this.findById(collectionId);
            if (!collection || !collection.is_active) {
                throw new errors_1.NotFoundError('Collection not found or inactive');
            }
            // Validate all variants exist and have sufficient stock
            for (const item of items) {
                const variant = await database_config_1.db.$queryRaw `
          SELECT variant_id, stock, is_visible
          FROM product_variants
          WHERE variant_id = ${item.variant_id}
        `;
                if (!variant || variant.length === 0 || !variant[0].is_visible) {
                    throw new errors_1.BadRequestError(`Variant ${item.variant_id} not found or not visible`);
                }
                if (variant[0].stock < item.quantity) {
                    throw new errors_1.BadRequestError(`Insufficient stock for variant ${item.variant_id}`);
                }
            }
            // Check if collection already in cart
            const existingCart = await database_config_1.db.$queryRaw `
        SELECT collection_cart_id
        FROM collection_cart
        WHERE customer_id = ${customerId} AND collection_id = ${collectionId}
      `;
            let collectionCartId;
            if (existingCart && existingCart.length > 0) {
                // Update existing cart entry
                collectionCartId = existingCart[0].collection_cart_id;
                // Delete old items
                await database_config_1.db.$executeRaw `
          DELETE FROM collection_cart_items
          WHERE collection_cart_id = ${collectionCartId}
        `;
            }
            else {
                // Create new cart entry
                const newCart = await database_config_1.db.$queryRaw `
          INSERT INTO collection_cart (customer_id, collection_id)
          VALUES (${customerId}, ${collectionId})
          RETURNING collection_cart_id
        `;
                collectionCartId = newCart[0].collection_cart_id;
            }
            // Insert cart items into collection_cart_items
            for (const item of items) {
                await database_config_1.db.$executeRaw `
          INSERT INTO collection_cart_items (collection_cart_id, variant_id, quantity)
          VALUES (${collectionCartId}, ${item.variant_id}, ${item.quantity})
        `;
            }
            // Also add collection items to the main cart (so they appear in customer's regular cart)
            for (const item of items) {
                const existingCartItem = await database_config_1.db.cart.findFirst({
                    where: {
                        customer_id: customerId,
                        variant_id: item.variant_id,
                    },
                });
                if (existingCartItem) {
                    const newQty = parseInt(existingCartItem.quantity, 10) + item.quantity;
                    await database_config_1.db.cart.update({
                        where: { cart_id: existingCartItem.cart_id },
                        data: { quantity: newQty.toString() },
                    });
                }
                else {
                    await database_config_1.db.cart.create({
                        data: {
                            customer_id: customerId,
                            variant_id: item.variant_id,
                            quantity: item.quantity.toString(),
                        },
                    });
                }
            }
            // Invalidate cart cache
            (0, cache_1.deleteByPattern)(`CART_customer:${customerId}`);
            (0, cache_1.deleteByPattern)(`COLLECTION_CART_customer:${customerId}`);
            return { collection_cart_id: collectionCartId, message: 'Collection added to cart' };
        }
        catch (error) {
            if (error instanceof errors_1.BadRequestError || error instanceof errors_1.NotFoundError) {
                throw error;
            }
            logger_1.logger.error('Error adding collection to cart', { error, customerId, collectionId });
            throw new errors_1.InternalServerError('Failed to add collection to cart');
        }
    }
    /**
     * Get customer's collection cart
     */
    async getCustomerCollectionCart(customerId) {
        const cacheKey = (0, cache_1.generateCacheKey)('COLLECTION_CART', { customerId });
        return (0, cache_1.withCache)(cacheKey, async () => {
            try {
                const cartItems = await database_config_1.db.$queryRaw `
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
            }
            catch (error) {
                logger_1.logger.error('Error fetching collection cart', { error, customerId });
                throw new errors_1.InternalServerError('Database error');
            }
        }, 60); // Cache for 1 minute
    }
    /**
     * Remove collection from cart
     */
    async removeFromCart(customerId, collectionCartId) {
        try {
            await database_config_1.db.$executeRaw `
        DELETE FROM collection_cart
        WHERE collection_cart_id = ${collectionCartId}
          AND customer_id = ${customerId}
      `;
            (0, cache_1.deleteByPattern)(`COLLECTION_CART_customer:${customerId}`);
            return true;
        }
        catch (error) {
            logger_1.logger.error('Error removing collection from cart', { error, customerId, collectionCartId });
            throw new errors_1.InternalServerError('Failed to remove collection from cart');
        }
    }
    /**
     * Calculate collection price with custom items
     */
    async calculatePrice(items) {
        try {
            let total = 0;
            for (const item of items) {
                const variant = await database_config_1.db.$queryRaw `
          SELECT sell_price
          FROM product_variants
          WHERE variant_id = ${item.variant_id} AND is_visible = true
        `;
                if (variant && variant.length > 0) {
                    total += Number(variant[0].sell_price) * item.quantity;
                }
            }
            return total;
        }
        catch (error) {
            logger_1.logger.error('Error calculating collection price', { error, items });
            throw new errors_1.InternalServerError('Failed to calculate price');
        }
    }
    /**
     * Get collection count
     */
    async getCount(activeOnly = true) {
        try {
            const result = await database_config_1.db.$queryRaw `
        SELECT COUNT(*)::bigint as count
        FROM collections
        ${activeOnly ? database_config_1.Prisma.sql `WHERE is_active = true` : database_config_1.Prisma.empty}
      `;
            return Number(result[0]?.count ?? 0);
        }
        catch (error) {
            logger_1.logger.error('Error getting collection count', { error });
            return 0;
        }
    }
    /**
     * Invalidate collection cache
     */
    invalidateCache(collectionId) {
        if (collectionId) {
            (0, cache_1.deleteByPattern)(`COLLECTION_id:${collectionId}`);
        }
        (0, cache_1.deleteByPattern)('COLLECTIONS_ACTIVE');
    }
}
exports.CollectionRepository = CollectionRepository;
// Export singleton
exports.collectionRepository = new CollectionRepository();
//# sourceMappingURL=collection.repository.js.map