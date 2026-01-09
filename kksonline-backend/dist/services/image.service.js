import { cloudinary, CLOUDINARY_FOLDERS, UPLOAD_PRESETS } from '../config/cloudinary.config.js';
import { supabaseAdmin } from '../config/supabase.config.js';
import { logger } from '../utils/logger.js';
import { InternalServerError, NotFoundError } from '../utils/errors.js';
import { CacheKeys, generateCacheKey, getFromCache, setInCache, deleteByPattern } from '../utils/cache.js';
export class ImageService {
    /**
     * Upload image from buffer (for multipart uploads)
     */
    async uploadFromBuffer(buffer, entityCategory, entityId, isFeatured = true, filename) {
        try {
            const folder = CLOUDINARY_FOLDERS[entityCategory] || CLOUDINARY_FOLDERS.misc;
            const preset = this.getPresetForEntity(entityCategory);
            // Generate unique public ID
            const publicId = `${entityCategory}_${entityId}_${Date.now()}`;
            // Upload to Cloudinary
            const result = await new Promise((resolve, reject) => {
                cloudinary.uploader
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
            logger.error('Image upload failed', { error, entityCategory, entityId });
            throw new InternalServerError('Failed to upload image');
        }
    }
    /**
     * Upload image from URL (e.g., Google profile picture)
     */
    async uploadFromUrl(imageUrl, entityCategory, entityId, isFeatured = true) {
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
            logger.error('Image upload from URL failed', { error, imageUrl, entityCategory, entityId });
            throw new InternalServerError('Failed to upload image from URL');
        }
    }
    /**
     * Get featured/main image URL for an entity
     */
    async getMainImageUrl(entityId, entityCategory) {
        const cacheKey = generateCacheKey(CacheKeys.PRODUCT_IMAGES, { entityId, entityCategory, featured: true });
        const cached = getFromCache(cacheKey);
        if (cached !== undefined)
            return cached;
        const { data, error } = await supabaseAdmin
            .from('image_entity')
            .select('images(image_url)')
            .eq('entity_id', entityId)
            .eq('entity_category', entityCategory)
            .eq('isFeatured', true)
            .single();
        if (error || !data) {
            setInCache(cacheKey, null);
            return null;
        }
        const images = data.images;
        const url = images?.image_url || null;
        setInCache(cacheKey, url);
        return url;
    }
    /**
     * Get all image URLs for an entity
     */
    async getAllImagesForEntity(entityId, entityCategory) {
        const cacheKey = generateCacheKey(CacheKeys.PRODUCT_IMAGES, { entityId, entityCategory, all: true });
        const cached = getFromCache(cacheKey);
        if (cached !== undefined)
            return cached;
        const { data, error } = await supabaseAdmin
            .from('image_entity')
            .select('images(image_url), isFeatured')
            .eq('entity_id', entityId)
            .eq('entity_category', entityCategory)
            .order('isFeatured', { ascending: false });
        if (error || !data) {
            setInCache(cacheKey, []);
            return [];
        }
        const urls = data
            .map((item) => {
            const images = item.images;
            return images?.image_url;
        })
            .filter((url) => !!url);
        setInCache(cacheKey, urls);
        return urls;
    }
    /**
     * Get main images for multiple entities (batch operation)
     */
    async getMainImagesForEntities(entityIds, entityCategory) {
        const result = new Map();
        const uncachedIds = [];
        // Check cache first
        for (const id of entityIds) {
            const cacheKey = generateCacheKey(CacheKeys.PRODUCT_IMAGES, { entityId: id, entityCategory, featured: true });
            const cached = getFromCache(cacheKey);
            if (cached !== undefined && cached !== null) {
                result.set(id, cached);
            }
            else if (cached === undefined) {
                uncachedIds.push(id);
            }
        }
        // Fetch uncached from database
        if (uncachedIds.length > 0) {
            const { data, error } = await supabaseAdmin
                .from('image_entity')
                .select('entity_id, images(image_url)')
                .in('entity_id', uncachedIds)
                .eq('entity_category', entityCategory)
                .eq('isFeatured', true);
            if (!error && data) {
                for (const item of data) {
                    const images = item.images;
                    const url = images?.image_url;
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
            const { data, error } = await supabaseAdmin
                .from('image_entity')
                .select('image_id, images(filename)')
                .eq('entity_id', entityId)
                .eq('entity_category', entityCategory)
                .eq('isFeatured', true)
                .single();
            if (error || !data) {
                return false;
            }
            // Delete from Cloudinary
            const images = data.images;
            if (images?.filename) {
                await cloudinary.uploader.destroy(images.filename);
            }
            // Delete from database (cascade will handle image_entity)
            if (data.image_id !== null) {
                await supabaseAdmin
                    .from('images')
                    .delete()
                    .eq('image_id', data.image_id);
            }
            this.invalidateImageCache(entityCategory, entityId);
            return true;
        }
        catch (error) {
            logger.error('Failed to delete main image', { error, entityId, entityCategory });
            return false;
        }
    }
    /**
     * Delete all images for an entity
     */
    async deleteAllImagesForEntity(entityId, entityCategory) {
        try {
            // Get all images
            const { data, error } = await supabaseAdmin
                .from('image_entity')
                .select('image_id, images(filename)')
                .eq('entity_id', entityId)
                .eq('entity_category', entityCategory);
            if (error || !data || data.length === 0) {
                return false;
            }
            // Delete from Cloudinary
            const publicIds = data
                .map((item) => {
                const images = item.images;
                return images?.filename;
            })
                .filter((id) => !!id);
            if (publicIds.length > 0) {
                await cloudinary.api.delete_resources(publicIds);
            }
            // Delete from database
            const imageIds = data.map((item) => item.image_id).filter((id) => id !== null);
            if (imageIds.length > 0) {
                await supabaseAdmin
                    .from('images')
                    .delete()
                    .in('image_id', imageIds);
            }
            this.invalidateImageCache(entityCategory, entityId);
            return true;
        }
        catch (error) {
            logger.error('Failed to delete all images', { error, entityId, entityCategory });
            return false;
        }
    }
    /**
     * Set an existing image as featured
     */
    async setFeaturedImage(imageEntityId, entityId, entityCategory) {
        try {
            // Unset current featured
            await supabaseAdmin
                .from('image_entity')
                .update({ isFeatured: false })
                .eq('entity_id', entityId)
                .eq('entity_category', entityCategory)
                .eq('isFeatured', true);
            // Set new featured
            const { error } = await supabaseAdmin
                .from('image_entity')
                .update({ isFeatured: true })
                .eq('image_entity_id', imageEntityId);
            if (error)
                throw error;
            this.invalidateImageCache(entityCategory, entityId);
            return true;
        }
        catch (error) {
            logger.error('Failed to set featured image', { error, imageEntityId, entityId });
            return false;
        }
    }
    /**
     * Delete a specific image by image_entity_id
     */
    async deleteImage(imageEntityId) {
        try {
            // Get image details
            const { data, error } = await supabaseAdmin
                .from('image_entity')
                .select('image_id, entity_id, entity_category, images(filename)')
                .eq('image_entity_id', imageEntityId)
                .single();
            if (error || !data) {
                throw new NotFoundError('Image not found');
            }
            // Delete from Cloudinary
            const images = data.images;
            if (images?.filename) {
                await cloudinary.uploader.destroy(images.filename);
            }
            // Delete from database
            if (data.image_id !== null) {
                await supabaseAdmin
                    .from('images')
                    .delete()
                    .eq('image_id', data.image_id);
            }
            if (data.entity_id && data.entity_category) {
                this.invalidateImageCache(data.entity_category, data.entity_id);
            }
            return true;
        }
        catch (error) {
            if (error instanceof NotFoundError)
                throw error;
            logger.error('Failed to delete image', { error, imageEntityId });
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
    async saveImageToDatabase(imageUrl, publicId, entityCategory, entityId, isFeatured, filename) {
        // Insert into images table
        const { data: imageData, error: imageError } = await supabaseAdmin
            .from('images')
            .insert({
            filename: publicId,
            image_url: imageUrl,
            folderType: entityCategory,
        })
            .select('image_id')
            .single();
        if (imageError || !imageData) {
            throw new InternalServerError('Failed to save image metadata');
        }
        // If setting as featured, unset existing featured
        if (isFeatured) {
            await supabaseAdmin
                .from('image_entity')
                .update({ isFeatured: false })
                .eq('entity_id', entityId)
                .eq('entity_category', entityCategory)
                .eq('isFeatured', true);
        }
        // Insert into image_entity table
        const { error: entityError } = await supabaseAdmin
            .from('image_entity')
            .insert({
            image_id: imageData.image_id,
            entity_id: entityId,
            entity_category: entityCategory,
            isFeatured,
        });
        if (entityError) {
            // Rollback image insert
            await supabaseAdmin.from('images').delete().eq('image_id', imageData.image_id);
            throw new InternalServerError('Failed to link image to entity');
        }
        return imageData.image_id;
    }
    invalidateImageCache(entityCategory, entityId) {
        deleteByPattern(`${CacheKeys.PRODUCT_IMAGES}_entityId:${entityId}`);
    }
}
// Export singleton
export const imageService = new ImageService();
//# sourceMappingURL=image.service.js.map