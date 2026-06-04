import crypto from 'crypto';
import { db } from '../config/database.config';
import { supabase, getSupabasePublicUrl, SUPABASE_BUCKETS } from '../config/supabase.config';
import { logger } from '../utils/logger';
import { BadRequestError, InternalServerError, NotFoundError } from '../utils/errors';
import { CacheKeys, deleteByPattern } from '../utils/cache';
import { ADVANCE_PAYMENT_RECEIPT_ENABLED } from '../config/feature-flags';

export type EntityCategory =
  | 'products'
  | 'brands'
  | 'categories'
  | 'customers'
  | 'vendors'
  | 'salesman'
  | 'shop'
  | 'collections';

export interface ImageUploadResponse {
  imageId: number;
  url: string;
  publicId: string;
  width: number;
  height: number;
}

export interface PaymentReceiptUploadResult {
  receiptPath: string;
  receiptUrl: string;
}

const PAYMENT_RECEIPT_BUCKET = SUPABASE_BUCKETS.paymentReceipts;
const SIGNED_URL_TTL_SECONDS = 60 * 60;

const PRIVATE_BUCKETS = new Set<string>([
  SUPABASE_BUCKETS.customers,
  SUPABASE_BUCKETS.paymentReceipts,
  SUPABASE_BUCKETS.vendors,
  SUPABASE_BUCKETS.guarantors,
  SUPABASE_BUCKETS.salesman,
  SUPABASE_BUCKETS.users,
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
export class SupabaseImageService {
  // ---------------------------------------------------------------------------
  // Read helpers
  // ---------------------------------------------------------------------------

  async getMainImageUrl(entityId: number, entityCategory: EntityCategory): Promise<string | null> {
    try {
      const imageEntity = await db.imageEntity.findFirst({
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
    } catch (error) {
      logger.error('Error fetching main image', { error, entityId, entityCategory });
      return null;
    }
  }

  async getAllImagesForEntity(entityId: number, entityCategory: EntityCategory): Promise<string[]> {
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

      const urls: string[] = [];
      for (const item of imageEntities) {
        if (item.image?.folderType && item.image.filename) {
          const url = await this.resolveImageUrl(item.image.folderType, item.image.filename);
          if (url) {
            urls.push(url);
          }
        }
      }

      return urls;
    } catch (error) {
      logger.error('Error fetching all images', { error, entityId, entityCategory });
      return [];
    }
  }

  async getMainImagesForEntities(
    entityIds: number[],
    entityCategory: EntityCategory
  ): Promise<Map<number, string>> {
    const result = new Map<number, string>();

    if (entityIds.length === 0) {
      return result;
    }

    try {
      const imageEntities = await db.imageEntity.findMany({
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

      const processedIds = new Set<number>();
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
    } catch (error) {
      logger.error('Error fetching main images for entities', { error, entityCategory, entityIds });
    }

    return result;
  }

  // ---------------------------------------------------------------------------
  // Catalog upload / delete
  // ---------------------------------------------------------------------------

  async uploadFromBuffer(
    buffer: Buffer,
    entityCategory: EntityCategory,
    entityId: number,
    isFeatured = true,
    filename?: string,
    mimeType = 'image/jpeg'
  ): Promise<ImageUploadResponse> {
    try {
      const bucket = this.getBucketForEntity(entityCategory);
      const extension = this.getExtension(mimeType, filename);
      const storagePath = `${entityId}/${Date.now()}-${crypto.randomUUID()}.${extension}`;

      const { error: uploadError } = await supabase.storage.from(bucket).upload(storagePath, buffer, {
        contentType: mimeType,
        upsert: false,
      });

      if (uploadError) {
        logger.error('Supabase image upload failed', { uploadError, entityCategory, entityId, storagePath });
        throw new InternalServerError('Failed to upload image');
      }

      const url = await this.resolveImageUrl(bucket, storagePath);
      const imageId = await this.saveImageToDatabase(
        url ?? '',
        storagePath,
        bucket,
        entityCategory,
        entityId,
        isFeatured
      );

      this.invalidateImageCache(entityCategory, entityId);

      return {
        imageId,
        url: url ?? getSupabasePublicUrl(bucket, storagePath),
        publicId: storagePath,
        width: 0,
        height: 0,
      };
    } catch (error) {
      if (error instanceof InternalServerError) {
        throw error;
      }
      logger.error('Image upload failed', { error, entityCategory, entityId });
      throw new InternalServerError('Failed to upload image');
    }
  }

  async uploadFromUrl(
    imageUrl: string,
    entityCategory: EntityCategory,
    entityId: number,
    isFeatured = true
  ): Promise<ImageUploadResponse> {
    try {
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new InternalServerError('Failed to fetch image from URL');
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      const mimeType = response.headers.get('content-type') || 'image/jpeg';

      return this.uploadFromBuffer(buffer, entityCategory, entityId, isFeatured, undefined, mimeType);
    } catch (error) {
      if (error instanceof InternalServerError) {
        throw error;
      }
      logger.error('Image upload from URL failed', { error, imageUrl, entityCategory, entityId });
      throw new InternalServerError('Failed to upload image from URL');
    }
  }

  async updateMainImage(
    buffer: Buffer,
    entityCategory: EntityCategory,
    entityId: number,
    filename?: string,
    mimeType = 'image/jpeg'
  ): Promise<ImageUploadResponse> {
    await this.deleteMainImage(entityId, entityCategory);
    return this.uploadFromBuffer(buffer, entityCategory, entityId, true, filename, mimeType);
  }

  async deleteMainImage(entityId: number, entityCategory: EntityCategory): Promise<boolean> {
    try {
      const imageEntity = await db.imageEntity.findFirst({
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

  async deleteAllImagesForEntity(entityId: number, entityCategory: EntityCategory): Promise<boolean> {
    try {
      const imageEntities = await db.imageEntity.findMany({
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

  async setFeaturedImage(imageEntityId: number, entityId: number, entityCategory: EntityCategory): Promise<boolean> {
    try {
      await db.imageEntity.updateMany({
        where: {
          entity_id: entityId,
          entity_category: entityCategory,
          isFeatured: true,
        },
        data: { isFeatured: false },
      });

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

  async deleteImage(imageEntityId: number): Promise<boolean> {
    try {
      const imageEntity = await db.imageEntity.findUnique({
        where: { image_entity_id: imageEntityId },
        include: {
          image: {
            select: { image_id: true, filename: true, folderType: true },
          },
        },
      });

      if (!imageEntity?.image) {
        throw new NotFoundError('Image not found');
      }

      if (imageEntity.image.folderType && imageEntity.image.filename) {
        await this.deleteFromStorage(imageEntity.image.folderType, imageEntity.image.filename);
      }

      await db.image.delete({
        where: { image_id: imageEntity.image.image_id },
      });

      if (imageEntity.entity_id && imageEntity.entity_category) {
        this.invalidateImageCache(imageEntity.entity_category as EntityCategory, imageEntity.entity_id);
      }

      return true;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error('Failed to delete image', { error, imageEntityId });
      return false;
    }
  }

  async addImage(
    buffer: Buffer,
    entityCategory: EntityCategory,
    entityId: number,
    filename?: string,
    mimeType = 'image/jpeg'
  ): Promise<ImageUploadResponse> {
    return this.uploadFromBuffer(buffer, entityCategory, entityId, false, filename, mimeType);
  }

  // ---------------------------------------------------------------------------
  // Payment receipts (private bucket) — TEMP disabled via feature flag
  // ---------------------------------------------------------------------------

  private assertReceiptFeatureEnabled(): void {
    if (!ADVANCE_PAYMENT_RECEIPT_ENABLED) {
      throw new BadRequestError('Advance payment receipt upload is temporarily disabled');
    }
  }

  async uploadReceipt(
    customerId: number,
    buffer: Buffer,
    mimeType: string,
    originalFilename?: string
  ): Promise<PaymentReceiptUploadResult> {
    this.assertReceiptFeatureEnabled();

    if (!UPLOAD_ALLOWED_MIME_TYPES.has(mimeType)) {
      throw new BadRequestError('Only JPEG, PNG, WebP, or GIF receipt images are allowed');
    }

    const extension = this.getExtension(mimeType, originalFilename);
    const receiptPath = `${customerId}/pending/${Date.now()}-${crypto.randomUUID()}.${extension}`;

    const { error: uploadError } = await supabase.storage.from(PAYMENT_RECEIPT_BUCKET).upload(receiptPath, buffer, {
      contentType: mimeType,
      upsert: false,
    });

    if (uploadError) {
      logger.error('Payment receipt upload failed', { uploadError, customerId, receiptPath });
      throw new InternalServerError('Failed to upload payment receipt');
    }

    const receiptUrl = await this.createReceiptSignedUrl(receiptPath);
    return { receiptPath, receiptUrl };
  }

  async verifyReceiptOwnership(customerId: number, receiptPath: string): Promise<boolean> {
    if (!ADVANCE_PAYMENT_RECEIPT_ENABLED) {
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

      const { data, error } = await supabase.storage.from(PAYMENT_RECEIPT_BUCKET).list(folderPath, {
        search: fileName,
        limit: 1,
      });

      if (error) {
        logger.error('Payment receipt verification failed', { error, customerId, receiptPath });
        return false;
      }

      return (data ?? []).some((item) => item.name === fileName);
    } catch (error) {
      logger.error('Payment receipt verification error', { error, customerId, receiptPath });
      return false;
    }
  }

  async createReceiptSignedUrl(receiptPath: string): Promise<string> {
    this.assertReceiptFeatureEnabled();

    const { data, error } = await supabase.storage
      .from(PAYMENT_RECEIPT_BUCKET)
      .createSignedUrl(receiptPath, SIGNED_URL_TTL_SECONDS);

    if (error || !data?.signedUrl) {
      logger.error('Failed to create signed URL for payment receipt', { error, receiptPath });
      throw new InternalServerError('Failed to generate receipt preview URL');
    }

    return data.signedUrl;
  }

  isValidReceiptPath(customerId: number, receiptPath: string): boolean {
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

  private getBucketForEntity(entityCategory: EntityCategory): string {
    const bucketMap: Record<EntityCategory, string> = {
      products: SUPABASE_BUCKETS.products,
      brands: SUPABASE_BUCKETS.brands,
      categories: SUPABASE_BUCKETS.categories,
      customers: SUPABASE_BUCKETS.customers,
      vendors: SUPABASE_BUCKETS.vendors,
      salesman: SUPABASE_BUCKETS.salesman,
      shop: SUPABASE_BUCKETS.shop,
      collections: SUPABASE_BUCKETS.collections,
    };

    return bucketMap[entityCategory];
  }

  private async resolveImageUrl(bucket: string, filePath: string): Promise<string | null> {
    if (PRIVATE_BUCKETS.has(bucket)) {
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(filePath, SIGNED_URL_TTL_SECONDS);

      if (error || !data?.signedUrl) {
        logger.error('Failed to create signed URL for image', { error, bucket, filePath });
        return null;
      }

      return data.signedUrl;
    }

    return getSupabasePublicUrl(bucket, filePath);
  }

  private async deleteFromStorage(bucket: string | null, filePath: string | null): Promise<void> {
    if (!bucket || !filePath) {
      return;
    }

    const { error } = await supabase.storage.from(bucket).remove([filePath]);
    if (error) {
      logger.error('Failed to delete file from Supabase storage', { error, bucket, filePath });
    }
  }

  private async saveImageToDatabase(
    imageUrl: string,
    storagePath: string,
    bucket: string,
    entityCategory: EntityCategory,
    entityId: number,
    isFeatured: boolean
  ): Promise<number> {
    const image = await db.image.create({
      data: {
        filename: storagePath,
        image_url: imageUrl,
        folderType: bucket,
      },
    });

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

  private getExtension(mimeType: string, originalFilename?: string): string {
    const fromMime: Record<string, string> = {
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

  private invalidateImageCache(entityCategory: EntityCategory, entityId: number): void {
    deleteByPattern(`${CacheKeys.PRODUCT_IMAGES}_entityId:${entityId}`);
    logger.debug('Invalidated image cache', { entityCategory, entityId });
  }
}

export const supabaseImageService = new SupabaseImageService();
