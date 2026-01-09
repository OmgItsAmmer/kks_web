import { db, Prisma } from '../config/database.config.ts';
import { logger } from '../utils/logger.ts';
import { InternalServerError, NotFoundError } from '../utils/errors.ts';
import { CacheKeys, withCache, deleteByPattern } from '../utils/cache.ts';
import type { Brand } from '@prisma/client';

export class BrandRepository {
  /**
   * Get all brands
   */
  async findAll(): Promise<Brand[]> {
    return withCache(CacheKeys.BRANDS, async () => {
      try {
        const brands = await db.brand.findMany({
          orderBy: { brandname: 'asc' },
        });
        return brands;
      } catch (error) {
        logger.error('Error fetching brands', { error });
        throw new InternalServerError('Database error');
      }
    });
  }

  /**
   * Get featured brands
   */
  async findFeatured(): Promise<Brand[]> {
    return withCache(`${CacheKeys.BRANDS}_featured`, async () => {
      try {
        const brands = await db.brand.findMany({
          where: { isFeatured: true },
          orderBy: { brandname: 'asc' },
        });
        return brands;
      } catch (error) {
        logger.error('Error fetching featured brands', { error });
        throw new InternalServerError('Database error');
      }
    });
  }

  /**
   * Get verified brands
   */
  async findVerified(): Promise<Brand[]> {
    return withCache(`${CacheKeys.BRANDS}_verified`, async () => {
      try {
        const brands = await db.brand.findMany({
          where: { isVerified: true },
          orderBy: { brandname: 'asc' },
        });
        return brands;
      } catch (error) {
        logger.error('Error fetching verified brands', { error });
        throw new InternalServerError('Database error');
      }
    });
  }

  /**
   * Get brand by ID
   */
  async findById(brandId: number): Promise<Brand | null> {
    try {
      const brand = await db.brand.findUnique({
        where: { brandID: brandId },
      });
      return brand;
    } catch (error) {
      logger.error('Error fetching brand', { error, brandId });
      throw new InternalServerError('Database error');
    }
  }

  /**
   * Create brand (admin)
   */
  async create(brand: Prisma.BrandCreateInput): Promise<Brand> {
    try {
      const newBrand = await db.brand.create({
        data: brand,
      });

      this.invalidateCache();
      return newBrand;
    } catch (error) {
      logger.error('Error creating brand', { error });
      throw new InternalServerError('Failed to create brand');
    }
  }

  /**
   * Update brand (admin)
   */
  async update(brandId: number, updates: Prisma.BrandUpdateInput): Promise<Brand> {
    try {
      const brand = await db.brand.update({
        where: { brandID: brandId },
        data: updates,
      });

      this.invalidateCache();
      return brand;
    } catch (error) {
      if ((error as { code?: string }).code === 'P2025') {
        throw new NotFoundError('Brand not found');
      }
      logger.error('Error updating brand', { error, brandId });
      throw new InternalServerError('Failed to update brand');
    }
  }

  /**
   * Delete brand (admin)
   */
  async delete(brandId: number): Promise<boolean> {
    try {
      await db.brand.delete({
        where: { brandID: brandId },
      });

      this.invalidateCache();
      return true;
    } catch (error) {
      logger.error('Error deleting brand', { error, brandId });
      throw new InternalServerError('Failed to delete brand');
    }
  }

  /**
   * Update product count for a brand
   */
  async updateProductCount(brandId: number): Promise<void> {
    try {
      const count = await db.product.count({
        where: {
          brandID: brandId,
          isVisible: true,
        },
      });

      await db.brand.update({
        where: { brandID: brandId },
        data: { product_count: count },
      });

      this.invalidateCache();
    } catch (error) {
      logger.error('Error updating brand product count', { error, brandId });
    }
  }

  private invalidateCache(): void {
    deleteByPattern(CacheKeys.BRANDS);
  }
}

// Export singleton
export const brandRepository = new BrandRepository();
