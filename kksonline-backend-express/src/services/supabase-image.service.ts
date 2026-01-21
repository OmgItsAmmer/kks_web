import { db } from '../config/database.config';
import { getSupabasePublicUrl } from '../config/supabase.config';
import { logger } from '../utils/logger';

export type EntityCategory =
  | 'products'
  | 'brands'
  | 'categories'
  | 'customers'
  | 'vendors'
  | 'salesman'
  | 'shop'
  | 'collections';

/**
 * Service for handling Supabase Storage images
 *
 * NOTE: All caching has been removed as requested.
 * Every call now hits the database and Supabase storage URL helper directly.
 */
export class SupabaseImageService {
  /**
   * Get featured/main image URL for an entity
   */
  async getMainImageUrl(entityId: number, entityCategory: EntityCategory): Promise<string | null> {
    logger.info(`[ImageService] (no-cache) Fetching main image for ${entityCategory} ID: ${entityId}`);
    try {
      const imageEntity = await db.imageEntity.findFirst({
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

      logger.debug(`[ImageService] (no-cache) DB result for ${entityCategory} ${entityId}:`, {
        found: !!imageEntity,
        hasImage: !!imageEntity?.image,
        filename: imageEntity?.image?.filename,
        folderType: imageEntity?.image?.folderType,
      });

      if (!imageEntity?.image) {
        logger.warn(`[ImageService] (no-cache) No image found for ${entityCategory} ID: ${entityId}`);
        return null;
      }

      if (imageEntity.image.folderType && imageEntity.image.filename) {
        const url = getSupabasePublicUrl(imageEntity.image.folderType, imageEntity.image.filename);
        logger.info(
          `[ImageService] (no-cache) Generated Supabase URL for ${entityCategory} ${entityId}: ${url} (bucket: ${imageEntity.image.folderType}, file: ${imageEntity.image.filename})`
        );
        return url;
      }

      logger.warn(
        `[ImageService] (no-cache) Image found but missing required Supabase fields for ${entityCategory} ${entityId}`,
        {
          hasFolderType: !!imageEntity.image.folderType,
          hasFilename: !!imageEntity.image.filename,
        }
      );
      return null;
    } catch (error) {
      logger.error('(no-cache) Error fetching main image', { error, entityId, entityCategory });
      return null;
    }
  }

  /**
   * Get all image URLs for an entity
   */
  async getAllImagesForEntity(entityId: number, entityCategory: EntityCategory): Promise<string[]> {
    logger.info(`[ImageService] (no-cache) Fetching ALL images for ${entityCategory} ID: ${entityId}`);
    try {
      const imageEntities = await db.imageEntity.findMany({
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
            return getSupabasePublicUrl(item.image.folderType, item.image.filename);
          }
          logger.warn('[ImageService] (no-cache) getAllImagesForEntity - missing Supabase fields for image_entity', {
            entityId: item.entity_id,
            hasImage: !!item.image,
            hasFolderType: !!item.image?.folderType,
            hasFilename: !!item.image?.filename,
          });
          return null;
        })
        .filter((url): url is string => !!url);

      logger.info(
        `[ImageService] (no-cache) getAllImagesForEntity - returning ${urls.length} URLs for ${entityCategory} ${entityId}`
      );
      return urls;
    } catch (error) {
      logger.error('(no-cache) Error fetching all images', { error, entityId, entityCategory });
      return [];
    }
  }

  /**
   * Get main images for multiple entities (batch operation)
   */
  async getMainImagesForEntities(
    entityIds: number[],
    entityCategory: EntityCategory
  ): Promise<Map<number, string>> {
    logger.info(
      `[ImageService] (no-cache) Batch fetching images for ${entityIds.length} ${entityCategory} entities:`,
      entityIds
    );

    const result = new Map<number, string>();

    try {
      const imageEntities = await db.imageEntity.findMany({
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

      logger.info(
        `[ImageService] (no-cache) Found ${imageEntities.length} image records in database for ${entityIds.length} requested entities`
      );

      for (const item of imageEntities) {
        if (!item.entity_id) {
          logger.warn('[ImageService] (no-cache) ImageEntity missing entity_id:', item);
          continue;
        }

        let url: string | null = null;

        if (item.image?.folderType && item.image?.filename) {
          url = getSupabasePublicUrl(item.image.folderType, item.image.filename);
          logger.debug(
            `[ImageService] (no-cache) Generated Supabase URL for ${entityCategory} ${item.entity_id}: ${url} (bucket: ${item.image.folderType}, file: ${item.image.filename})`
          );
        } else {
          logger.warn('[ImageService] (no-cache) ImageEntity missing Supabase image data:', {
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
        logger.warn(
          `[ImageService] (no-cache) No images found for ${missingIds.length} ${entityCategory} entities:`,
          missingIds
        );
      }
    } catch (error) {
      logger.error('(no-cache) Error fetching main images for entities', { error, entityCategory, entityIds });
    }

    logger.info(
      `[ImageService] (no-cache) Batch fetch complete: ${result.size}/${entityIds.length} images found for ${entityCategory}`
    );
    return result;
  }
}

// Export singleton
export const supabaseImageService = new SupabaseImageService();
