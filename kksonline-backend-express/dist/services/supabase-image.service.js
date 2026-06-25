"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabaseImageService = exports.SupabaseImageService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const database_config_1 = require("../config/database.config");
const supabase_config_1 = require("../config/supabase.config");
const logger_1 = require("../utils/logger");
const errors_1 = require("../utils/errors");
const cache_1 = require("../utils/cache");
const feature_flags_1 = require("../config/feature-flags");
const PAYMENT_RECEIPT_BUCKET = supabase_config_1.SUPABASE_BUCKETS.paymentReceipts;
const SIGNED_URL_TTL_SECONDS = 60 * 60;
const PRIVATE_BUCKETS = new Set([
    supabase_config_1.SUPABASE_BUCKETS.customers,
    supabase_config_1.SUPABASE_BUCKETS.paymentReceipts,
    supabase_config_1.SUPABASE_BUCKETS.vendors,
    supabase_config_1.SUPABASE_BUCKETS.guarantors,
    supabase_config_1.SUPABASE_BUCKETS.salesman,
    supabase_config_1.SUPABASE_BUCKETS.users,
]);
const RECEIPT_ALLOWED_MIME_TYPES = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
]);
const UPLOAD_ALLOWED_MIME_TYPES = new Set([
    ...RECEIPT_ALLOWED_MIME_TYPES,
    'image/jpg',
]);
/**
 * Unified Supabase Storage image service (catalog images + payment receipts).
 * Cloudinary is disabled; all uploads and reads go through Supabase.
 */
class SupabaseImageService {
    // ---------------------------------------------------------------------------
    // Read helpers
    // ---------------------------------------------------------------------------
    async getMainImageUrl(entityId, entityCategory) {
        try {
            const imageEntity = await database_config_1.db.imageEntity.findFirst({
                where: {
                    entity_id: entityId,
                    entity_category: entityCategory,
                },
                orderBy: { isFeatured: 'desc' },
                include: {
                    image: {
                        select: {
                            filename: true,
                            folderType: true,
                        },
                    },
                },
            });
            if (!imageEntity?.image?.folderType || !imageEntity.image.filename) {
                return null;
            }
            return this.resolveImageUrl(imageEntity.image.folderType, imageEntity.image.filename);
        }
        catch (error) {
            logger_1.logger.error('Error fetching main image', { error, entityId, entityCategory });
            return null;
        }
    }
    async getAllImagesForEntity(entityId, entityCategory) {
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
            const urls = [];
            for (const item of imageEntities) {
                if (item.image?.folderType && item.image.filename) {
                    const url = await this.resolveImageUrl(item.image.folderType, item.image.filename);
                    if (url) {
                        urls.push(url);
                    }
                }
            }
            return urls;
        }
        catch (error) {
            logger_1.logger.error('Error fetching all images', { error, entityId, entityCategory });
            return [];
        }
    }
    async getMainImagesForEntities(entityIds, entityCategory) {
        const result = new Map();
        if (entityIds.length === 0) {
            return result;
        }
        try {
            const imageEntities = await database_config_1.db.imageEntity.findMany({
                where: {
                    entity_id: { in: entityIds },
                    entity_category: entityCategory,
                },
                orderBy: [{ entity_id: 'asc' }, { isFeatured: 'desc' }, { created_at: 'desc' }],
                include: {
                    image: {
                        select: {
                            filename: true,
                            folderType: true,
                        },
                    },
                },
            });
            const processedIds = new Set();
            for (const item of imageEntities) {
                if (!item.entity_id || processedIds.has(item.entity_id)) {
                    continue;
                }
                if (item.image?.folderType && item.image.filename) {
                    const url = await this.resolveImageUrl(item.image.folderType, item.image.filename);
                    if (url) {
                        result.set(item.entity_id, url);
                        processedIds.add(item.entity_id);
                    }
                }
            }
        }
        catch (error) {
            logger_1.logger.error('Error fetching main images for entities', { error, entityCategory, entityIds });
        }
        return result;
    }
    // ---------------------------------------------------------------------------
    // Catalog upload / delete
    // ---------------------------------------------------------------------------
    async uploadFromBuffer(buffer, entityCategory, entityId, isFeatured = true, filename, mimeType = 'image/jpeg') {
        try {
            const bucket = this.getBucketForEntity(entityCategory);
            const extension = this.getExtension(mimeType, filename);
            const storagePath = `${entityId}/${Date.now()}-${crypto_1.default.randomUUID()}.${extension}`;
            const { error: uploadError } = await supabase_config_1.supabase.storage.from(bucket).upload(storagePath, buffer, {
                contentType: mimeType,
                upsert: false,
            });
            if (uploadError) {
                logger_1.logger.error('Supabase image upload failed', { uploadError, entityCategory, entityId, storagePath });
                throw new errors_1.InternalServerError('Failed to upload image');
            }
            const url = await this.resolveImageUrl(bucket, storagePath);
            const imageId = await this.saveImageToDatabase(url ?? '', storagePath, bucket, entityCategory, entityId, isFeatured);
            this.invalidateImageCache(entityCategory, entityId);
            return {
                imageId,
                url: url ?? (0, supabase_config_1.getSupabasePublicUrl)(bucket, storagePath),
                publicId: storagePath,
                width: 0,
                height: 0,
            };
        }
        catch (error) {
            if (error instanceof errors_1.InternalServerError) {
                throw error;
            }
            logger_1.logger.error('Image upload failed', { error, entityCategory, entityId });
            throw new errors_1.InternalServerError('Failed to upload image');
        }
    }
    async uploadFromUrl(imageUrl, entityCategory, entityId, isFeatured = true) {
        try {
            const response = await fetch(imageUrl);
            if (!response.ok) {
                throw new errors_1.InternalServerError('Failed to fetch image from URL');
            }
            const buffer = Buffer.from(await response.arrayBuffer());
            const mimeType = response.headers.get('content-type') || 'image/jpeg';
            return this.uploadFromBuffer(buffer, entityCategory, entityId, isFeatured, undefined, mimeType);
        }
        catch (error) {
            if (error instanceof errors_1.InternalServerError) {
                throw error;
            }
            logger_1.logger.error('Image upload from URL failed', { error, imageUrl, entityCategory, entityId });
            throw new errors_1.InternalServerError('Failed to upload image from URL');
        }
    }
    async updateMainImage(buffer, entityCategory, entityId, filename, mimeType = 'image/jpeg') {
        await this.deleteMainImage(entityId, entityCategory);
        return this.uploadFromBuffer(buffer, entityCategory, entityId, true, filename, mimeType);
    }
    async deleteMainImage(entityId, entityCategory) {
        try {
            const imageEntity = await database_config_1.db.imageEntity.findFirst({
                where: {
                    entity_id: entityId,
                    entity_category: entityCategory,
                    isFeatured: true,
                },
                include: {
                    image: {
                        select: { image_id: true, filename: true, folderType: true },
                    },
                },
            });
            if (!imageEntity?.image) {
                return false;
            }
            await this.deleteFromStorage(imageEntity.image.folderType, imageEntity.image.filename);
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
    async deleteAllImagesForEntity(entityId, entityCategory) {
        try {
            const imageEntities = await database_config_1.db.imageEntity.findMany({
                where: {
                    entity_id: entityId,
                    entity_category: entityCategory,
                },
                include: {
                    image: {
                        select: { image_id: true, filename: true, folderType: true },
                    },
                },
            });
            if (imageEntities.length === 0) {
                return false;
            }
            for (const item of imageEntities) {
                if (item.image?.folderType && item.image.filename) {
                    await this.deleteFromStorage(item.image.folderType, item.image.filename);
                }
            }
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
    async setFeaturedImage(imageEntityId, entityId, entityCategory) {
        try {
            await database_config_1.db.imageEntity.updateMany({
                where: {
                    entity_id: entityId,
                    entity_category: entityCategory,
                    isFeatured: true,
                },
                data: { isFeatured: false },
            });
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
    async deleteImage(imageEntityId) {
        try {
            const imageEntity = await database_config_1.db.imageEntity.findUnique({
                where: { image_entity_id: imageEntityId },
                include: {
                    image: {
                        select: { image_id: true, filename: true, folderType: true },
                    },
                },
            });
            if (!imageEntity?.image) {
                throw new errors_1.NotFoundError('Image not found');
            }
            if (imageEntity.image.folderType && imageEntity.image.filename) {
                await this.deleteFromStorage(imageEntity.image.folderType, imageEntity.image.filename);
            }
            await database_config_1.db.image.delete({
                where: { image_id: imageEntity.image.image_id },
            });
            if (imageEntity.entity_id && imageEntity.entity_category) {
                this.invalidateImageCache(imageEntity.entity_category, imageEntity.entity_id);
            }
            return true;
        }
        catch (error) {
            if (error instanceof errors_1.NotFoundError) {
                throw error;
            }
            logger_1.logger.error('Failed to delete image', { error, imageEntityId });
            return false;
        }
    }
    async addImage(buffer, entityCategory, entityId, filename, mimeType = 'image/jpeg') {
        return this.uploadFromBuffer(buffer, entityCategory, entityId, false, filename, mimeType);
    }
    // ---------------------------------------------------------------------------
    // Payment receipts (private bucket) — TEMP disabled via feature flag
    // ---------------------------------------------------------------------------
    assertReceiptFeatureEnabled() {
        if (!feature_flags_1.ADVANCE_PAYMENT_RECEIPT_ENABLED) {
            throw new errors_1.BadRequestError('Advance payment receipt upload is temporarily disabled');
        }
    }
    async uploadReceipt(customerId, buffer, mimeType, originalFilename) {
        this.assertReceiptFeatureEnabled();
        if (!UPLOAD_ALLOWED_MIME_TYPES.has(mimeType)) {
            throw new errors_1.BadRequestError('Only JPEG, PNG, WebP, or GIF receipt images are allowed');
        }
        const extension = this.getExtension(mimeType, originalFilename);
        const receiptPath = `${customerId}/pending/${Date.now()}-${crypto_1.default.randomUUID()}.${extension}`;
        const { error: uploadError } = await supabase_config_1.supabase.storage.from(PAYMENT_RECEIPT_BUCKET).upload(receiptPath, buffer, {
            contentType: mimeType,
            upsert: false,
        });
        if (uploadError) {
            logger_1.logger.error('Payment receipt upload failed', { uploadError, customerId, receiptPath });
            throw new errors_1.InternalServerError('Failed to upload payment receipt');
        }
        const receiptUrl = await this.createReceiptSignedUrl(receiptPath);
        return { receiptPath, receiptUrl };
    }
    async verifyReceiptOwnership(customerId, receiptPath) {
        if (!feature_flags_1.ADVANCE_PAYMENT_RECEIPT_ENABLED) {
            return false;
        }
        if (!this.isValidReceiptPath(customerId, receiptPath)) {
            return false;
        }
        try {
            const folderPath = receiptPath.split('/').slice(0, -1).join('/');
            const fileName = receiptPath.split('/').pop();
            if (!fileName) {
                return false;
            }
            const { data, error } = await supabase_config_1.supabase.storage.from(PAYMENT_RECEIPT_BUCKET).list(folderPath, {
                search: fileName,
                limit: 1,
            });
            if (error) {
                logger_1.logger.error('Payment receipt verification failed', { error, customerId, receiptPath });
                return false;
            }
            return (data ?? []).some((item) => item.name === fileName);
        }
        catch (error) {
            logger_1.logger.error('Payment receipt verification error', { error, customerId, receiptPath });
            return false;
        }
    }
    async createReceiptSignedUrl(receiptPath) {
        this.assertReceiptFeatureEnabled();
        const { data, error } = await supabase_config_1.supabase.storage
            .from(PAYMENT_RECEIPT_BUCKET)
            .createSignedUrl(receiptPath, SIGNED_URL_TTL_SECONDS);
        if (error || !data?.signedUrl) {
            logger_1.logger.error('Failed to create signed URL for payment receipt', { error, receiptPath });
            throw new errors_1.InternalServerError('Failed to generate receipt preview URL');
        }
        return data.signedUrl;
    }
    isValidReceiptPath(customerId, receiptPath) {
        const normalized = receiptPath.trim().replace(/^\/+/, '');
        const expectedPrefix = `${customerId}/`;
        if (!normalized.startsWith(expectedPrefix)) {
            return false;
        }
        if (normalized.includes('..')) {
            return false;
        }
        return /^[\w./-]+$/.test(normalized);
    }
    // ---------------------------------------------------------------------------
    // Private helpers
    // ---------------------------------------------------------------------------
    getBucketForEntity(entityCategory) {
        const bucketMap = {
            products: supabase_config_1.SUPABASE_BUCKETS.products,
            brands: supabase_config_1.SUPABASE_BUCKETS.brands,
            categories: supabase_config_1.SUPABASE_BUCKETS.categories,
            customers: supabase_config_1.SUPABASE_BUCKETS.customers,
            vendors: supabase_config_1.SUPABASE_BUCKETS.vendors,
            salesman: supabase_config_1.SUPABASE_BUCKETS.salesman,
            shop: supabase_config_1.SUPABASE_BUCKETS.shop,
            collections: supabase_config_1.SUPABASE_BUCKETS.collections,
        };
        return bucketMap[entityCategory];
    }
    async resolveImageUrl(bucket, filePath) {
        if (PRIVATE_BUCKETS.has(bucket)) {
            const { data, error } = await supabase_config_1.supabase.storage
                .from(bucket)
                .createSignedUrl(filePath, SIGNED_URL_TTL_SECONDS);
            if (error || !data?.signedUrl) {
                logger_1.logger.error('Failed to create signed URL for image', { error, bucket, filePath });
                return null;
            }
            return data.signedUrl;
        }
        return (0, supabase_config_1.getSupabasePublicUrl)(bucket, filePath);
    }
    async deleteFromStorage(bucket, filePath) {
        if (!bucket || !filePath) {
            return;
        }
        const { error } = await supabase_config_1.supabase.storage.from(bucket).remove([filePath]);
        if (error) {
            logger_1.logger.error('Failed to delete file from Supabase storage', { error, bucket, filePath });
        }
    }
    async saveImageToDatabase(imageUrl, storagePath, bucket, entityCategory, entityId, isFeatured) {
        const image = await database_config_1.db.image.create({
            data: {
                filename: storagePath,
                image_url: imageUrl,
                folderType: bucket,
            },
        });
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
    getExtension(mimeType, originalFilename) {
        const fromMime = {
            'image/jpeg': 'jpg',
            'image/jpg': 'jpg',
            'image/png': 'png',
            'image/webp': 'webp',
            'image/gif': 'gif',
        };
        if (fromMime[mimeType]) {
            return fromMime[mimeType];
        }
        const ext = originalFilename?.split('.').pop()?.toLowerCase();
        if (ext && ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) {
            return ext === 'jpeg' ? 'jpg' : ext;
        }
        return 'jpg';
    }
    invalidateImageCache(entityCategory, entityId) {
        (0, cache_1.deleteByPattern)(`${cache_1.CacheKeys.PRODUCT_IMAGES}_entityId:${entityId}`);
        logger_1.logger.debug('Invalidated image cache', { entityCategory, entityId });
    }
}
exports.SupabaseImageService = SupabaseImageService;
exports.supabaseImageService = new SupabaseImageService();
//# sourceMappingURL=supabase-image.service.js.map