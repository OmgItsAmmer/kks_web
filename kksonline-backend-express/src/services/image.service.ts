import crypto from 'node:crypto';
import { db } from '../config/database.config';
import { logger } from '../utils/logger';
import { BadRequestError, InternalServerError, NotFoundError } from '../utils/errors';
import { CacheKeys, deleteByPattern } from '../utils/cache';
import { ADVANCE_PAYMENT_RECEIPT_ENABLED } from '../config/feature-flags';
import {
  PRIVATE_FOLDERS,
  assetUrl,
  deleteObject,
  deleteObjects,
  objectExists,
  processImage,
  putObject,
  randomImageName,
  signedUrl,
  thumbFilename,
} from './storage.service';

export type EntityCategory = 'products' | 'brands' | 'categories' | 'customers' | 'shop' | 'collections';

export interface ImageUploadResponse {
  imageId: number;
  imageEntityId?: number;
  url: string;
  thumbUrl: string;
  publicId: string;
  width: number;
  height: number;
}

export interface PaymentReceiptUploadResult {
  receiptPath: string;
  receiptUrl: string;
}

export const RECEIPT_FOLDER = 'payment-receipts';
const RECEIPT_ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']);

/**
 * Catalog images and payment receipts, stored in Cloudflare R2 (plan 4.3).
 * The `images` table keeps `folderType` + `filename`; the public URL is built from them at read time.
 */
export class ImageService {
  // ---------------------------------------------------------------------------
  // Read helpers
  // ---------------------------------------------------------------------------

  async getMainImageUrl(entityId: number, entityCategory: EntityCategory): Promise<string | null> {
    try {
      const imageEntity = await db.imageEntity.findFirst({
        where: { entity_id: entityId, entity_category: entityCategory },
        orderBy: { isFeatured: 'desc' },
        include: { image: { select: { filename: true, folderType: true } } },
      });
      if (!imageEntity?.image?.folderType || !imageEntity.image.filename) return null;
      return this.resolveImageUrl(imageEntity.image.folderType, imageEntity.image.filename);
    } catch (error) {
      logger.error('Error fetching main image', { error, entityId, entityCategory });
      return null;
    }
  }

  async getAllImagesForEntity(entityId: number, entityCategory: EntityCategory): Promise<string[]> {
    try {
      const imageEntities = await db.imageEntity.findMany({
        where: { entity_id: entityId, entity_category: entityCategory },
        include: { image: { select: { filename: true, folderType: true } } },
        orderBy: [{ isFeatured: 'desc' }, { image_entity_id: 'asc' }],
      });
      const urls: string[] = [];
      for (const item of imageEntities) {
        if (item.image?.folderType && item.image.filename) {
          const url = await this.resolveImageUrl(item.image.folderType, item.image.filename);
          if (url) urls.push(url);
        }
      }
      return urls;
    } catch (error) {
      logger.error('Error fetching all images', { error, entityId, entityCategory });
      return [];
    }
  }

  /** Admin view: every image of an entity with ids, so it can be reordered, featured or deleted. */
  async listImages(entityId: number, entityCategory: EntityCategory) {
    const rows = await db.imageEntity.findMany({
      where: { entity_id: entityId, entity_category: entityCategory },
      include: { image: true },
      orderBy: [{ isFeatured: 'desc' }, { image_entity_id: 'asc' }],
    });
    const out = [];
    for (const row of rows) {
      if (!row.image?.folderType || !row.image.filename) continue;
      out.push({
        imageEntityId: row.image_entity_id,
        imageId: row.image_id as number,
        isFeatured: Boolean(row.isFeatured),
        url: await this.resolveImageUrl(row.image.folderType, row.image.filename),
        thumbUrl: await this.resolveThumbUrl(row.image.folderType, row.image.filename),
      });
    }
    return out;
  }

  async getMainImagesForEntities(entityIds: number[], entityCategory: EntityCategory): Promise<Map<number, string>> {
    const result = new Map<number, string>();
    if (entityIds.length === 0) return result;
    try {
      const imageEntities = await db.imageEntity.findMany({
        where: { entity_id: { in: entityIds }, entity_category: entityCategory },
        orderBy: [{ entity_id: 'asc' }, { isFeatured: 'desc' }, { created_at: 'desc' }],
        include: { image: { select: { filename: true, folderType: true } } },
      });
      for (const item of imageEntities) {
        if (!item.entity_id || result.has(item.entity_id)) continue;
        if (item.image?.folderType && item.image.filename) {
          const url = await this.resolveImageUrl(item.image.folderType, item.image.filename);
          if (url) result.set(item.entity_id, url);
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
    _filename?: string,
    _mimeType?: string
  ): Promise<ImageUploadResponse> {
    const processed = await processImage(buffer);
    const filename = randomImageName(entityId);
    await putObject(entityCategory, filename, processed.main, 'image/webp');
    await putObject(entityCategory, thumbFilename(filename), processed.thumb, 'image/webp');

    try {
      const { imageId, imageEntityId } = await this.saveImageToDatabase(
        filename,
        entityCategory,
        entityCategory,
        entityId,
        isFeatured
      );
      this.invalidateImageCache(entityCategory, entityId);
      return {
        imageId,
        imageEntityId,
        url: assetUrl(entityCategory, filename),
        thumbUrl: assetUrl(entityCategory, thumbFilename(filename)),
        publicId: filename,
        width: processed.width,
        height: processed.height,
      };
    } catch (error) {
      // Do not leave orphan files if the database write fails.
      await deleteObjects(entityCategory, [filename, thumbFilename(filename)]);
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
    const parsed = new URL(imageUrl);
    if (parsed.protocol !== 'https:') throw new BadRequestError('Only https image URLs are allowed');
    const response = await fetch(imageUrl);
    if (!response.ok) throw new InternalServerError('Failed to fetch image from URL');
    const buffer = Buffer.from(await response.arrayBuffer());
    return this.uploadFromBuffer(buffer, entityCategory, entityId, isFeatured);
  }

  async updateMainImage(
    buffer: Buffer,
    entityCategory: EntityCategory,
    entityId: number,
    filename?: string,
    mimeType?: string
  ): Promise<ImageUploadResponse> {
    const uploaded = await this.uploadFromBuffer(buffer, entityCategory, entityId, true, filename, mimeType);
    // Remove the previous main image(s) only after the new one is safely stored.
    const others = await db.imageEntity.findMany({
      where: {
        entity_id: entityId,
        entity_category: entityCategory,
        image_entity_id: { not: uploaded.imageEntityId },
      },
      include: { image: true },
    });
    for (const other of others) {
      if (other.image) await this.removeImageRow(other.image.image_id, other.image.folderType, other.image.filename);
    }
    return uploaded;
  }

  async deleteMainImage(entityId: number, entityCategory: EntityCategory): Promise<boolean> {
    try {
      const imageEntity = await db.imageEntity.findFirst({
        where: { entity_id: entityId, entity_category: entityCategory, isFeatured: true },
        include: { image: true },
      });
      if (!imageEntity?.image) return false;
      await this.removeImageRow(imageEntity.image.image_id, imageEntity.image.folderType, imageEntity.image.filename);
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
        where: { entity_id: entityId, entity_category: entityCategory },
        include: { image: true },
      });
      if (imageEntities.length === 0) return false;
      for (const item of imageEntities) {
        if (item.image) await this.removeImageRow(item.image.image_id, item.image.folderType, item.image.filename);
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
      await db.$transaction([
        db.imageEntity.updateMany({
          where: { entity_id: entityId, entity_category: entityCategory, isFeatured: true },
          data: { isFeatured: false },
        }),
        db.imageEntity.update({ where: { image_entity_id: imageEntityId }, data: { isFeatured: true } }),
      ]);
      this.invalidateImageCache(entityCategory, entityId);
      return true;
    } catch (error) {
      logger.error('Failed to set featured image', { error, imageEntityId, entityId });
      return false;
    }
  }

  async deleteImage(imageEntityId: number): Promise<boolean> {
    const imageEntity = await db.imageEntity.findUnique({
      where: { image_entity_id: imageEntityId },
      include: { image: true },
    });
    if (!imageEntity?.image) throw new NotFoundError('Image not found');

    await this.removeImageRow(imageEntity.image.image_id, imageEntity.image.folderType, imageEntity.image.filename);

    // If the featured image was deleted, promote the oldest remaining one.
    if (imageEntity.entity_id && imageEntity.entity_category) {
      if (imageEntity.isFeatured) {
        const next = await db.imageEntity.findFirst({
          where: { entity_id: imageEntity.entity_id, entity_category: imageEntity.entity_category },
          orderBy: { image_entity_id: 'asc' },
        });
        if (next) await db.imageEntity.update({ where: { image_entity_id: next.image_entity_id }, data: { isFeatured: true } });
      }
      this.invalidateImageCache(imageEntity.entity_category as EntityCategory, imageEntity.entity_id);
    }
    return true;
  }

  async addImage(
    buffer: Buffer,
    entityCategory: EntityCategory,
    entityId: number,
    filename?: string,
    mimeType?: string
  ): Promise<ImageUploadResponse> {
    const existing = await db.imageEntity.count({ where: { entity_id: entityId, entity_category: entityCategory } });
    return this.uploadFromBuffer(buffer, entityCategory, entityId, existing === 0, filename, mimeType);
  }

  // ---------------------------------------------------------------------------
  // Payment receipts (private bucket)
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
    _originalFilename?: string
  ): Promise<PaymentReceiptUploadResult> {
    this.assertReceiptFeatureEnabled();
    if (!RECEIPT_ALLOWED_MIME_TYPES.has(mimeType)) {
      throw new BadRequestError('Only JPEG, PNG, WebP, or GIF receipt images are allowed');
    }
    const processed = await processImage(buffer);
    const receiptPath = `${customerId}/pending/${Date.now()}-${crypto.randomUUID()}.webp`;
    await putObject(RECEIPT_FOLDER, receiptPath, processed.main, 'image/webp');
    const receiptUrl = await this.createReceiptSignedUrl(receiptPath);
    return { receiptPath, receiptUrl };
  }

  async verifyReceiptOwnership(customerId: number, receiptPath: string): Promise<boolean> {
    if (!ADVANCE_PAYMENT_RECEIPT_ENABLED) return false;
    if (!this.isValidReceiptPath(customerId, receiptPath)) return false;
    return objectExists(RECEIPT_FOLDER, receiptPath);
  }

  async createReceiptSignedUrl(receiptPath: string): Promise<string> {
    this.assertReceiptFeatureEnabled();
    return signedUrl(RECEIPT_FOLDER, receiptPath);
  }

  /** Admin: a short-lived link to a receipt, with no customer-ownership check. */
  async createAdminReceiptUrl(receiptPath: string): Promise<string> {
    if (receiptPath.includes('..') || !/^[\w./-]+$/.test(receiptPath)) throw new BadRequestError('Invalid receipt path');
    return signedUrl(RECEIPT_FOLDER, receiptPath);
  }

  isValidReceiptPath(customerId: number, receiptPath: string): boolean {
    const normalized = receiptPath.trim().replace(/^\/+/, '');
    if (!normalized.startsWith(`${customerId}/`)) return false;
    if (normalized.includes('..')) return false;
    return /^[\w./-]+$/.test(normalized);
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private async resolveImageUrl(folder: string, filename: string): Promise<string | null> {
    if (PRIVATE_FOLDERS.has(folder)) {
      try {
        return await signedUrl(folder, filename);
      } catch {
        return null;
      }
    }
    return assetUrl(folder, filename);
  }

  private async resolveThumbUrl(folder: string, filename: string): Promise<string | null> {
    // Older (pre-migration) files have no thumbnail; callers fall back to the main URL.
    if (PRIVATE_FOLDERS.has(folder) || !filename.endsWith('.webp')) return this.resolveImageUrl(folder, filename);
    return assetUrl(folder, thumbFilename(filename));
  }

  private async removeImageRow(imageId: number, folder: string | null, filename: string | null): Promise<void> {
    await db.imageEntity.deleteMany({ where: { image_id: imageId } });
    await db.image.delete({ where: { image_id: imageId } });
    await deleteObject(folder, filename);
    if (folder && filename && !PRIVATE_FOLDERS.has(folder)) await deleteObject(folder, thumbFilename(filename));
  }

  private async saveImageToDatabase(
    filename: string,
    folderType: string,
    entityCategory: EntityCategory,
    entityId: number,
    isFeatured: boolean
  ): Promise<{ imageId: number; imageEntityId: number }> {
    return db.$transaction(async (tx) => {
      const image = await tx.image.create({
        data: { filename, folderType, image_url: assetUrl(folderType, filename) },
      });
      if (isFeatured) {
        await tx.imageEntity.updateMany({
          where: { entity_id: entityId, entity_category: entityCategory, isFeatured: true },
          data: { isFeatured: false },
        });
      }
      const entity = await tx.imageEntity.create({
        data: { image_id: image.image_id, entity_id: entityId, entity_category: entityCategory, isFeatured },
      });
      return { imageId: image.image_id, imageEntityId: entity.image_entity_id };
    });
  }

  private invalidateImageCache(entityCategory: EntityCategory, entityId: number): void {
    deleteByPattern(`${CacheKeys.PRODUCT_IMAGES}_entityId:${entityId}`);
    logger.debug('Invalidated image cache', { entityCategory, entityId });
  }
}

export const imageService = new ImageService();
/** @deprecated kept so existing imports keep working; use `imageService`. */
export const supabaseImageService = imageService;
