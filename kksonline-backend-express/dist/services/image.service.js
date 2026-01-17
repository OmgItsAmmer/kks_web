"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.imageService = exports.ImageService = void 0;
const cloudinary_config_1 = require("../config/cloudinary.config");
const database_config_1 = require("../config/database.config");
const logger_1 = require("../utils/logger");
const errors_1 = require("../utils/errors");
const cache_1 = require("../utils/cache");
class ImageService {
    /**
     * Upload image from buffer (for multipart uploads)
     */
    async uploadFromBuffer(buffer, entityCategory, entityId, isFeatured = true, filename) {
        try {
            const folder = cloudinary_config_1.CLOUDINARY_FOLDERS[entityCategory] || cloudinary_config_1.CLOUDINARY_FOLDERS.misc;
            const preset = this.getPresetForEntity(entityCategory);
            // Generate unique public ID
            const publicId = `${entityCategory}_${entityId}_${Date.now()}`;
            // Upload to Cloudinary
            const result = await new Promise((resolve, reject) => {
                cloudinary_config_1.cloudinary.uploader
                    .upload_stream({
                    folder,
                    public_id: publicId,
                    transformation: preset.transformation,
                    format: preset.format,
                    resource_type: 'image',
                }, (error, result) => {
                    if (error)
                        reject(error);
                    else if (result)
                        resolve(result);
                    else
                        reject(new Error('No result from Cloudinary'));
                })
                    .end(buffer);
            });
            // Save to database
            const imageId = await this.saveImageToDatabase(result.secure_url, result.public_id, entityCategory, entityId, isFeatured, filename || result.public_id);
            // Invalidate cache
            this.invalidateImageCache(entityCategory, entityId);
            return {
                imageId,
                url: result.secure_url,
                publicId: result.public_id,
                width: result.width,
                height: result.height,
            };
        }
        catch (error) {
            logger_1.logger.error('Image upload failed', { error, entityCategory, entityId });
            throw new errors_1.InternalServerError('Failed to upload image');
        }
    }
    /**
     * Upload image from URL (e.g., Google profile picture)
     */
    async uploadFromUrl(imageUrl, entityCategory, entityId, isFeatured = true) {
        try {
            const folder = cloudinary_config_1.CLOUDINARY_FOLDERS[entityCategory] || cloudinary_config_1.CLOUDINARY_FOLDERS.misc;
            const preset = this.getPresetForEntity(entityCategory);
            const publicId = `${entityCategory}_${entityId}_${Date.now()}`;
            const result = await cloudinary_config_1.cloudinary.uploader.upload(imageUrl, {
                folder,
                public_id: publicId,
                transformation: preset.transformation,
                format: preset.format,
                resource_type: 'image',
            });
            const imageId = await this.saveImageToDatabase(result.secure_url, result.public_id, entityCategory, entityId, isFeatured, result.public_id);
            this.invalidateImageCache(entityCategory, entityId);
            return {
                imageId,
                url: result.secure_url,
                publicId: result.public_id,
                width: result.width,
                height: result.height,
            };
        }
        catch (error) {
            logger_1.logger.error('Image upload from URL failed', { error, imageUrl, entityCategory, entityId });
            throw new errors_1.InternalServerError('Failed to upload image from URL');
        }
    }
    /**
     * Get featured/main image URL for an entity
     */
    async getMainImageUrl(entityId, entityCategory) {
        const cacheKey = (0, cache_1.generateCacheKey)(cache_1.CacheKeys.PRODUCT_IMAGES, { entityId, entityCategory, featured: true });
        const cached = (0, cache_1.getFromCache)(cacheKey);
        if (cached !== undefined)
            return cached;
        try {
            const imageEntity = await database_config_1.db.imageEntity.findFirst({
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
            (0, cache_1.setInCache)(cacheKey, url);
            return url;
        }
        catch (error) {
            (0, cache_1.setInCache)(cacheKey, null);
            return null;
        }
    }
    /**
     * Get all image URLs for an entity
     */
    async getAllImagesForEntity(entityId, entityCategory) {
        const cacheKey = (0, cache_1.generateCacheKey)(cache_1.CacheKeys.PRODUCT_IMAGES, { entityId, entityCategory, all: true });
        const cached = (0, cache_1.getFromCache)(cacheKey);
        if (cached !== undefined)
            return cached;
        try {
            const imageEntities = await database_config_1.db.imageEntity.findMany({
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
                .filter((url) => !!url);
            (0, cache_1.setInCache)(cacheKey, urls);
            return urls;
        }
        catch (error) {
            (0, cache_1.setInCache)(cacheKey, []);
            return [];
        }
    }
    /**
     * Get main images for multiple entities (batch operation)
     */
    async getMainImagesForEntities(entityIds, entityCategory) {
        const result = new Map();
        const uncachedIds = [];
        // Check cache first
        for (const id of entityIds) {
            const cacheKey = (0, cache_1.generateCacheKey)(cache_1.CacheKeys.PRODUCT_IMAGES, { entityId: id, entityCategory, featured: true });
            const cached = (0, cache_1.getFromCache)(cacheKey);
            if (cached !== undefined && cached !== null) {
                result.set(id, cached);
            }
            else if (cached === undefined) {
                uncachedIds.push(id);
            }
        }
        // Fetch uncached from database
        if (uncachedIds.length > 0) {
            try {
                const imageEntities = await database_config_1.db.imageEntity.findMany({
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
                        const cacheKey = (0, cache_1.generateCacheKey)(cache_1.CacheKeys.PRODUCT_IMAGES, {
                            entityId: item.entity_id,
                            entityCategory,
                            featured: true
                        });
                        (0, cache_1.setInCache)(cacheKey, url);
                    }
                }
            }
            catch (error) {
                logger_1.logger.error('Error fetching main images for entities', { error });
            }
        }
        return result;
    }
    /**
     * Update/replace main image for an entity
     */
    async updateMainImage(buffer, entityCategory, entityId, filename) {
        // Delete existing featured image
        await this.deleteMainImage(entityId, entityCategory);
        // Upload new image
        return this.uploadFromBuffer(buffer, entityCategory, entityId, true, filename);
    }
    /**
     * Delete main/featured image for an entity
     */
    async deleteMainImage(entityId, entityCategory) {
        try {
            // Get current featured image
            const imageEntity = await database_config_1.db.imageEntity.findFirst({
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
                await cloudinary_config_1.cloudinary.uploader.destroy(imageEntity.image.filename);
            }
            // Delete from database
            await database_config_1.db.image.delete({
                where: { image_id: imageEntity.image.image_id },
            });
            this.invalidateImageCache(entityCategory, entityId);
            return true;
        }
        catch (error) {
            logger_1.logger.error('Failed to delete main image', { error, entityId, entityCategory });
            return false;
        }
    }
    /**
     * Delete all images for an entity
     */
    async deleteAllImagesForEntity(entityId, entityCategory) {
        try {
            // Get all images
            const imageEntities = await database_config_1.db.imageEntity.findMany({
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
                .filter((id) => !!id);
            if (publicIds.length > 0) {
                await cloudinary_config_1.cloudinary.api.delete_resources(publicIds);
            }
            // Delete from database
            const imageIds = imageEntities
                .map((item) => item.image?.image_id)
                .filter((id) => id !== null && id !== undefined);
            if (imageIds.length > 0) {
                await database_config_1.db.image.deleteMany({
                    where: { image_id: { in: imageIds } },
                });
            }
            this.invalidateImageCache(entityCategory, entityId);
            return true;
        }
        catch (error) {
            logger_1.logger.error('Failed to delete all images', { error, entityId, entityCategory });
            return false;
        }
    }
    /**
     * Set an existing image as featured
     */
    async setFeaturedImage(imageEntityId, entityId, entityCategory) {
        try {
            // Unset current featured
            await database_config_1.db.imageEntity.updateMany({
                where: {
                    entity_id: entityId,
                    entity_category: entityCategory,
                    isFeatured: true,
                },
                data: { isFeatured: false },
            });
            // Set new featured
            await database_config_1.db.imageEntity.update({
                where: { image_entity_id: imageEntityId },
                data: { isFeatured: true },
            });
            this.invalidateImageCache(entityCategory, entityId);
            return true;
        }
        catch (error) {
            logger_1.logger.error('Failed to set featured image', { error, imageEntityId, entityId });
            return false;
        }
    }
    /**
     * Delete a specific image by image_entity_id
     */
    async deleteImage(imageEntityId) {
        try {
            // Get image details
            const imageEntity = await database_config_1.db.imageEntity.findUnique({
                where: { image_entity_id: imageEntityId },
                include: {
                    image: {
                        select: { image_id: true, filename: true },
                    },
                },
            });
            if (!imageEntity || !imageEntity.image) {
                throw new errors_1.NotFoundError('Image not found');
            }
            // Delete from Cloudinary
            if (imageEntity.image.filename) {
                await cloudinary_config_1.cloudinary.uploader.destroy(imageEntity.image.filename);
            }
            // Delete from database
            await database_config_1.db.image.delete({
                where: { image_id: imageEntity.image.image_id },
            });
            if (imageEntity.entity_id && imageEntity.entity_category) {
                this.invalidateImageCache(imageEntity.entity_category, imageEntity.entity_id);
            }
            return true;
        }
        catch (error) {
            if (error instanceof errors_1.NotFoundError)
                throw error;
            logger_1.logger.error('Failed to delete image', { error, imageEntityId });
            return false;
        }
    }
    /**
     * Add additional image (not featured) to an entity
     */
    async addImage(buffer, entityCategory, entityId, filename) {
        return this.uploadFromBuffer(buffer, entityCategory, entityId, false, filename);
    }
    // Private helper methods
    getPresetForEntity(entityCategory) {
        switch (entityCategory) {
            case 'products':
                return cloudinary_config_1.UPLOAD_PRESETS.product;
            case 'brands':
                return cloudinary_config_1.UPLOAD_PRESETS.brand;
            case 'categories':
                return cloudinary_config_1.UPLOAD_PRESETS.category;
            case 'customers':
                return cloudinary_config_1.UPLOAD_PRESETS.profile;
            default:
                return cloudinary_config_1.UPLOAD_PRESETS.product;
        }
    }
    async saveImageToDatabase(imageUrl, publicId, entityCategory, entityId, isFeatured, filename) {
        // Insert into images table
        const image = await database_config_1.db.image.create({
            data: {
                filename: publicId,
                image_url: imageUrl,
                folderType: entityCategory,
            },
        });
        // If setting as featured, unset existing featured
        if (isFeatured) {
            await database_config_1.db.imageEntity.updateMany({
                where: {
                    entity_id: entityId,
                    entity_category: entityCategory,
                    isFeatured: true,
                },
                data: { isFeatured: false },
            });
        }
        // Insert into image_entity table
        await database_config_1.db.imageEntity.create({
            data: {
                image_id: image.image_id,
                entity_id: entityId,
                entity_category: entityCategory,
                isFeatured,
            },
        });
        return image.image_id;
    }
    invalidateImageCache(entityCategory, entityId) {
        (0, cache_1.deleteByPattern)(`${cache_1.CacheKeys.PRODUCT_IMAGES}_entityId:${entityId}`);
    }
}
exports.ImageService = ImageService;
// Export singleton
exports.imageService = new ImageService();
//# sourceMappingURL=image.service.js.map