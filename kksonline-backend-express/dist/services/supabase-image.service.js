"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabaseImageService = exports.SupabaseImageService = void 0;
const database_config_1 = require("../config/database.config");
const supabase_config_1 = require("../config/supabase.config");
const logger_1 = require("../utils/logger");
/**
 * Service for handling Supabase Storage images
 *
 * NOTE: All caching has been removed as requested.
 * Every call now hits the database and Supabase storage URL helper directly.
 */
class SupabaseImageService {
    /**
     * Get featured/main image URL for an entity
     */
    async getMainImageUrl(entityId, entityCategory) {
        logger_1.logger.info(`[ImageService] (no-cache) Fetching main image for ${entityCategory} ID: ${entityId}`);
        try {
            const imageEntity = await database_config_1.db.imageEntity.findFirst({
                where: {
                    entity_id: entityId,
                    entity_category: entityCategory,
                    isFeatured: true,
                },
                include: {
                    image: {
                        select: {
                            filename: true,
                            folderType: true,
                        },
                    },
                },
            });
            logger_1.logger.debug(`[ImageService] (no-cache) DB result for ${entityCategory} ${entityId}:`, {
                found: !!imageEntity,
                hasImage: !!imageEntity?.image,
                filename: imageEntity?.image?.filename,
                folderType: imageEntity?.image?.folderType,
            });
            if (!imageEntity?.image) {
                logger_1.logger.warn(`[ImageService] (no-cache) No image found for ${entityCategory} ID: ${entityId}`);
                return null;
            }
            if (imageEntity.image.folderType && imageEntity.image.filename) {
                const url = (0, supabase_config_1.getSupabasePublicUrl)(imageEntity.image.folderType, imageEntity.image.filename);
                logger_1.logger.info(`[ImageService] (no-cache) Generated Supabase URL for ${entityCategory} ${entityId}: ${url} (bucket: ${imageEntity.image.folderType}, file: ${imageEntity.image.filename})`);
                return url;
            }
            logger_1.logger.warn(`[ImageService] (no-cache) Image found but missing required Supabase fields for ${entityCategory} ${entityId}`, {
                hasFolderType: !!imageEntity.image.folderType,
                hasFilename: !!imageEntity.image.filename,
            });
            return null;
        }
        catch (error) {
            logger_1.logger.error('(no-cache) Error fetching main image', { error, entityId, entityCategory });
            return null;
        }
    }
    /**
     * Get all image URLs for an entity
     */
    async getAllImagesForEntity(entityId, entityCategory) {
        logger_1.logger.info(`[ImageService] (no-cache) Fetching ALL images for ${entityCategory} ID: ${entityId}`);
        try {
            const imageEntities = await database_config_1.db.imageEntity.findMany({
                where: {
                    entity_id: entityId,
                    entity_category: entityCategory,
                },
                include: {
                    image: {
                        select: {
                            filename: true,
                            folderType: true,
                        },
                    },
                },
                orderBy: { isFeatured: 'desc' },
            });
            const urls = imageEntities
                .map((item) => {
                if (item.image?.folderType && item.image?.filename) {
                    return (0, supabase_config_1.getSupabasePublicUrl)(item.image.folderType, item.image.filename);
                }
                logger_1.logger.warn('[ImageService] (no-cache) getAllImagesForEntity - missing Supabase fields for image_entity', {
                    entityId: item.entity_id,
                    hasImage: !!item.image,
                    hasFolderType: !!item.image?.folderType,
                    hasFilename: !!item.image?.filename,
                });
                return null;
            })
                .filter((url) => !!url);
            logger_1.logger.info(`[ImageService] (no-cache) getAllImagesForEntity - returning ${urls.length} URLs for ${entityCategory} ${entityId}`);
            return urls;
        }
        catch (error) {
            logger_1.logger.error('(no-cache) Error fetching all images', { error, entityId, entityCategory });
            return [];
        }
    }
    /**
     * Get main images for multiple entities (batch operation)
     */
    async getMainImagesForEntities(entityIds, entityCategory) {
        logger_1.logger.info(`[ImageService] (no-cache) Batch fetching images for ${entityIds.length} ${entityCategory} entities:`, entityIds);
        const result = new Map();
        try {
            const imageEntities = await database_config_1.db.imageEntity.findMany({
                where: {
                    entity_id: { in: entityIds },
                    entity_category: entityCategory,
                    isFeatured: true,
                },
                include: {
                    image: {
                        select: {
                            filename: true,
                            folderType: true,
                        },
                    },
                },
            });
            logger_1.logger.info(`[ImageService] (no-cache) Found ${imageEntities.length} image records in database for ${entityIds.length} requested entities`);
            for (const item of imageEntities) {
                if (!item.entity_id) {
                    logger_1.logger.warn('[ImageService] (no-cache) ImageEntity missing entity_id:', item);
                    continue;
                }
                let url = null;
                if (item.image?.folderType && item.image?.filename) {
                    url = (0, supabase_config_1.getSupabasePublicUrl)(item.image.folderType, item.image.filename);
                    logger_1.logger.debug(`[ImageService] (no-cache) Generated Supabase URL for ${entityCategory} ${item.entity_id}: ${url} (bucket: ${item.image.folderType}, file: ${item.image.filename})`);
                }
                else {
                    logger_1.logger.warn('[ImageService] (no-cache) ImageEntity missing Supabase image data:', {
                        entityId: item.entity_id,
                        hasImage: !!item.image,
                        hasFolderType: !!item.image?.folderType,
                        hasFilename: !!item.image?.filename,
                    });
                }
                if (url) {
                    result.set(item.entity_id, url);
                }
            }
            const foundIds = new Set(imageEntities.map((e) => e.entity_id).filter(Boolean));
            const missingIds = entityIds.filter((id) => !foundIds.has(id));
            if (missingIds.length > 0) {
                logger_1.logger.warn(`[ImageService] (no-cache) No images found for ${missingIds.length} ${entityCategory} entities:`, missingIds);
            }
        }
        catch (error) {
            logger_1.logger.error('(no-cache) Error fetching main images for entities', { error, entityCategory, entityIds });
        }
        logger_1.logger.info(`[ImageService] (no-cache) Batch fetch complete: ${result.size}/${entityIds.length} images found for ${entityCategory}`);
        return result;
    }
}
exports.SupabaseImageService = SupabaseImageService;
// Export singleton
exports.supabaseImageService = new SupabaseImageService();
//# sourceMappingURL=supabase-image.service.js.map