import type { UploadApiResponse, TransformationOptions } from 'cloudinary';
import { cloudinary, CLOUDINARY_FOLDERS, UPLOAD_PRESETS } from '../config/cloudinary.config.ts';
import { db } from '../config/database.config.ts';
import { logger } from '../utils/logger.ts';
import { InternalServerError, NotFoundError } from '../utils/errors.ts';
import { CacheKeys, generateCacheKey, getFromCache, setInCache, deleteByPattern } from '../utils/cache.ts';

export type EntityCategory = 'products' | 'brands' | 'categories' | 'customers';

export interface ImageUploadResponse {
  imageId: number;
  url: string;
  publicId: string;
  width: number;
  height: number;
}

interface UploadOptions {
  folder: string;
  transformation?: TransformationOptions;
  format?: string;
}

export class ImageService {
  /**
   * Upload image from buffer (for multipart uploads)
   */
  async uploadFromBuffer(
    buffer: Buffer,
    entityCategory: EntityCategory,
    entityId: number,
    isFeatured = true,
    filename?: string
  ): Promise<ImageUploadResponse> {
    try {
      const folder = CLOUDINARY_FOLDERS[entityCategory] || CLOUDINARY_FOLDERS.misc;
      const preset = this.getPresetForEntity(entityCategory);

      // Generate unique public ID
      const publicId = `${entityCategory}_${entityId}_${Date.now()}`;

      // Upload to Cloudinary
      const result = await new Promise<UploadApiResponse>((resolve, reject) => {
        cloudinary.uploader
          .upload_stream(
            {
              folder,
              public_id: publicId,
              transformation: preset.transformation,
              format: preset.format,
              resource_type: 'image',
            },
            (error, result) => {
              if (error) reject(error);
              else if (result) resolve(result);
              else reject(new Error('No result from Cloudinary'));
            }
          )
          .end(buffer);
      });

      // Save to database
      const imageId = await this.saveImageToDatabase(
        result.secure_url,
        result.public_id,
        entityCategory,
        entityId,
        isFeatured,
        filename || result.public_id
      );

      // Invalidate cache
      this.invalidateImageCache(entityCategory, entityId);

      return {
        imageId,
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
      };
    } catch (error) {
      logger.error('Image upload failed', { error, entityCategory, entityId });
      throw new InternalServerError('Failed to upload image');
    }
  }

  /**
   * Upload image from URL (e.g., Google profile picture)
   */
  async uploadFromUrl(
    imageUrl: string,
    entityCategory: EntityCategory,
    entityId: number,
    isFeatured = true
  ): Promise<ImageUploadResponse> {
    try {
      const folder = CLOUDINARY_FOLDERS[entityCategory] || CLOUDINARY_FOLDERS.misc;
      const preset = this.getPresetForEntity(entityCategory);
      const publicId = `${entityCategory}_${entityId}_${Date.now()}`;

      const result = await cloudinary.uploader.upload(imageUrl, {
        folder,
        public_id: publicId,
        transformation: preset.transformation,
        format: preset.format,
        resource_type: 'image',
      });

      const imageId = await this.saveImageToDatabase(
        result.secure_url,
        result.public_id,
        entityCategory,
        entityId,
        isFeatured,
        result.public_id
      );

      this.invalidateImageCache(entityCategory, entityId);

      return {
        imageId,
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
      };
    } catch (error) {
      logger.error('Image upload from URL failed', { error, imageUrl, entityCategory, entityId });
      throw new InternalServerError('Failed to upload image from URL');
    }
  }

  /**
   * Get featured/main image URL for an entity
   */
  async getMainImageUrl(entityId: number, entityCategory: EntityCategory): Promise<string | null> {
    const cacheKey = generateCacheKey(CacheKeys.PRODUCT_IMAGES, { entityId, entityCategory, featured: true });
    const cached = getFromCache<string | null>(cacheKey);
    if (cached !== undefined) return cached;

    try {
      const imageEntity = await db.imageEntity.findFirst({
        where: {
          entity_id: entityId,
          entity_category: entityCategory,
          isFeatured: true,
        },
        include: {
          image: {
            select: { image_url: true },
          },
        },
      });

      const url = imageEntity?.image?.image_url || null;
      setInCache(cacheKey, url);
      return url;
    } catch (error) {
      setInCache(cacheKey, null);
      return null;
    }
  }

  /**
   * Get all image URLs for an entity
   */
  async getAllImagesForEntity(entityId: number, entityCategory: EntityCategory): Promise<string[]> {
    const cacheKey = generateCacheKey(CacheKeys.PRODUCT_IMAGES, { entityId, entityCategory, all: true });
    const cached = getFromCache<string[]>(cacheKey);
    if (cached !== undefined) return cached;

    try {
      const imageEntities = await db.imageEntity.findMany({
        where: {
          entity_id: entityId,
          entity_category: entityCategory,
        },
        include: {
          image: {
            select: { image_url: true },
          },
        },
        orderBy: { isFeatured: 'desc' },
      });

      const urls = imageEntities
        .map((item) => item.image?.image_url)
        .filter((url): url is string => !!url);

      setInCache(cacheKey, urls);
      return urls;
    } catch (error) {
      setInCache(cacheKey, []);
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
    const result = new Map<number, string>();
    const uncachedIds: number[] = [];

    // Check cache first
    for (const id of entityIds) {
      const cacheKey = generateCacheKey(CacheKeys.PRODUCT_IMAGES, { entityId: id, entityCategory, featured: true });
      const cached = getFromCache<string | null>(cacheKey);
      if (cached !== undefined && cached !== null) {
        result.set(id, cached);
      } else if (cached === undefined) {
        uncachedIds.push(id);
      }
    }

    // Fetch uncached from database
    if (uncachedIds.length > 0) {
      try {
        const imageEntities = await db.imageEntity.findMany({
          where: {
            entity_id: { in: uncachedIds },
            entity_category: entityCategory,
            isFeatured: true,
          },
          include: {
            image: {
              select: { image_url: true },
            },
          },
        });

        for (const item of imageEntities) {
          const url = item.image?.image_url;
          if (url && item.entity_id) {
            result.set(item.entity_id, url);
            const cacheKey = generateCacheKey(CacheKeys.PRODUCT_IMAGES, { 
              entityId: item.entity_id, 
              entityCategory, 
              featured: true 
            });
            setInCache(cacheKey, url);
          }
        }
      } catch (error) {
        logger.error('Error fetching main images for entities', { error });
      }
    }

    return result;
  }

  /**
   * Update/replace main image for an entity
   */
  async updateMainImage(
    buffer: Buffer,
    entityCategory: EntityCategory,
    entityId: number,
    filename?: string
  ): Promise<ImageUploadResponse> {
    // Delete existing featured image
    await this.deleteMainImage(entityId, entityCategory);

    // Upload new image
    return this.uploadFromBuffer(buffer, entityCategory, entityId, true, filename);
  }

  /**
   * Delete main/featured image for an entity
   */
  async deleteMainImage(entityId: number, entityCategory: EntityCategory): Promise<boolean> {
    try {
      // Get current featured image
      const imageEntity = await db.imageEntity.findFirst({
        where: {
          entity_id: entityId,
          entity_category: entityCategory,
          isFeatured: true,
        },
        include: {
          image: {
            select: { image_id: true, filename: true },
          },
        },
      });

      if (!imageEntity || !imageEntity.image) {
        return false;
      }

      // Delete from Cloudinary
      if (imageEntity.image.filename) {
        await cloudinary.uploader.destroy(imageEntity.image.filename);
      }

      // Delete from database
      await db.image.delete({
        where: { image_id: imageEntity.image.image_id },
      });

      this.invalidateImageCache(entityCategory, entityId);
      return true;
    } catch (error) {
      logger.error('Failed to delete main image', { error, entityId, entityCategory });
      return false;
    }
  }

  /**
   * Delete all images for an entity
   */
  async deleteAllImagesForEntity(entityId: number, entityCategory: EntityCategory): Promise<boolean> {
    try {
      // Get all images
      const imageEntities = await db.imageEntity.findMany({
        where: {
          entity_id: entityId,
          entity_category: entityCategory,
        },
        include: {
          image: {
            select: { image_id: true, filename: true },
          },
        },
      });

      if (imageEntities.length === 0) {
        return false;
      }

      // Delete from Cloudinary
      const publicIds = imageEntities
        .map((item) => item.image?.filename)
        .filter((id): id is string => !!id);

      if (publicIds.length > 0) {
        await cloudinary.api.delete_resources(publicIds);
      }

      // Delete from database
      const imageIds = imageEntities
        .map((item) => item.image?.image_id)
        .filter((id): id is number => id !== null && id !== undefined);

      if (imageIds.length > 0) {
        await db.image.deleteMany({
          where: { image_id: { in: imageIds } },
        });
      }

      this.invalidateImageCache(entityCategory, entityId);
      return true;
    } catch (error) {
      logger.error('Failed to delete all images', { error, entityId, entityCategory });
      return false;
    }
  }

  /**
   * Set an existing image as featured
   */
  async setFeaturedImage(imageEntityId: number, entityId: number, entityCategory: EntityCategory): Promise<boolean> {
    try {
      // Unset current featured
      await db.imageEntity.updateMany({
        where: {
          entity_id: entityId,
          entity_category: entityCategory,
          isFeatured: true,
        },
        data: { isFeatured: false },
      });

      // Set new featured
      await db.imageEntity.update({
        where: { image_entity_id: imageEntityId },
        data: { isFeatured: true },
      });

      this.invalidateImageCache(entityCategory, entityId);
      return true;
    } catch (error) {
      logger.error('Failed to set featured image', { error, imageEntityId, entityId });
      return false;
    }
  }

  /**
   * Delete a specific image by image_entity_id
   */
  async deleteImage(imageEntityId: number): Promise<boolean> {
    try {
      // Get image details
      const imageEntity = await db.imageEntity.findUnique({
        where: { image_entity_id: imageEntityId },
        include: {
          image: {
            select: { image_id: true, filename: true },
          },
        },
      });

      if (!imageEntity || !imageEntity.image) {
        throw new NotFoundError('Image not found');
      }

      // Delete from Cloudinary
      if (imageEntity.image.filename) {
        await cloudinary.uploader.destroy(imageEntity.image.filename);
      }

      // Delete from database
      await db.image.delete({
        where: { image_id: imageEntity.image.image_id },
      });

      if (imageEntity.entity_id && imageEntity.entity_category) {
        this.invalidateImageCache(imageEntity.entity_category as EntityCategory, imageEntity.entity_id);
      }
      
      return true;
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      logger.error('Failed to delete image', { error, imageEntityId });
      return false;
    }
  }

  /**
   * Add additional image (not featured) to an entity
   */
  async addImage(
    buffer: Buffer,
    entityCategory: EntityCategory,
    entityId: number,
    filename?: string
  ): Promise<ImageUploadResponse> {
    return this.uploadFromBuffer(buffer, entityCategory, entityId, false, filename);
  }

  // Private helper methods

  private getPresetForEntity(entityCategory: EntityCategory): UploadOptions {
    switch (entityCategory) {
      case 'products':
        return UPLOAD_PRESETS.product;
      case 'brands':
        return UPLOAD_PRESETS.brand;
      case 'categories':
        return UPLOAD_PRESETS.category;
      case 'customers':
        return UPLOAD_PRESETS.profile;
      default:
        return UPLOAD_PRESETS.product;
    }
  }

  private async saveImageToDatabase(
    imageUrl: string,
    publicId: string,
    entityCategory: EntityCategory,
    entityId: number,
    isFeatured: boolean,
    filename: string
  ): Promise<number> {
    // Insert into images table
    const image = await db.image.create({
      data: {
        filename: publicId,
        image_url: imageUrl,
        folderType: entityCategory,
      },
    });

    // If setting as featured, unset existing featured
    if (isFeatured) {
      await db.imageEntity.updateMany({
        where: {
          entity_id: entityId,
          entity_category: entityCategory,
          isFeatured: true,
        },
        data: { isFeatured: false },
      });
    }

    // Insert into image_entity table
    await db.imageEntity.create({
      data: {
        image_id: image.image_id,
        entity_id: entityId,
        entity_category: entityCategory,
        isFeatured,
      },
    });

    return image.image_id;
  }

  private invalidateImageCache(entityCategory: EntityCategory, entityId: number): void {
    deleteByPattern(`${CacheKeys.PRODUCT_IMAGES}_entityId:${entityId}`);
  }
}

// Export singleton
export const imageService = new ImageService();
