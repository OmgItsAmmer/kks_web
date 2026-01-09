import { db, Prisma } from '../config/database.config.ts';
import { logger } from '../utils/logger.ts';
import { InternalServerError, NotFoundError } from '../utils/errors.ts';
import { CacheKeys, withCache, deleteByPattern } from '../utils/cache.ts';
import type { Category } from '@prisma/client';

export class CategoryRepository {
  /**
   * Get all categories
   */
  async findAll(): Promise<Category[]> {
    return withCache(CacheKeys.CATEGORIES, async () => {
      try {
        const categories = await db.category.findMany({
          orderBy: { category_name: 'asc' },
        });

        // Sort with "More" category last
        const sorted = categories.sort((a, b) => {
          if (a.category_name.toLowerCase() === 'more') return 1;
          if (b.category_name.toLowerCase() === 'more') return -1;
          return a.category_name.localeCompare(b.category_name);
        });

        return sorted;
      } catch (error) {
        logger.error('Error fetching categories', { error });
        throw new InternalServerError('Database error');
      }
    });
  }

  /**
   * Get featured categories
   */
  async findFeatured(): Promise<Category[]> {
    return withCache(`${CacheKeys.CATEGORIES}_featured`, async () => {
      try {
        const categories = await db.category.findMany({
          where: { isFeatured: true },
          orderBy: { category_name: 'asc' },
        });
        return categories;
      } catch (error) {
        logger.error('Error fetching featured categories', { error });
        throw new InternalServerError('Database error');
      }
    });
  }

  /**
   * Get category by ID
   */
  async findById(categoryId: number): Promise<Category | null> {
    try {
      const category = await db.category.findUnique({
        where: { category_id: categoryId },
      });
      return category;
    } catch (error) {
      logger.error('Error fetching category', { error, categoryId });
      throw new InternalServerError('Database error');
    }
  }

  /**
   * Create category (admin)
   */
  async create(category: Prisma.CategoryCreateInput): Promise<Category> {
    try {
      const newCategory = await db.category.create({
        data: category,
      });

      this.invalidateCache();
      return newCategory;
    } catch (error) {
      logger.error('Error creating category', { error });
      throw new InternalServerError('Failed to create category');
    }
  }

  /**
   * Update category (admin)
   */
  async update(categoryId: number, updates: Prisma.CategoryUpdateInput): Promise<Category> {
    try {
      const category = await db.category.update({
        where: { category_id: categoryId },
        data: updates,
      });

      this.invalidateCache();
      return category;
    } catch (error) {
      if ((error as { code?: string }).code === 'P2025') {
        throw new NotFoundError('Category not found');
      }
      logger.error('Error updating category', { error, categoryId });
      throw new InternalServerError('Failed to update category');
    }
  }

  /**
   * Delete category (admin)
   */
  async delete(categoryId: number): Promise<boolean> {
    try {
      await db.category.delete({
        where: { category_id: categoryId },
      });

      this.invalidateCache();
      return true;
    } catch (error) {
      logger.error('Error deleting category', { error, categoryId });
      throw new InternalServerError('Failed to delete category');
    }
  }

  /**
   * Update product count for a category
   */
  async updateProductCount(categoryId: number): Promise<void> {
    try {
      const count = await db.product.count({
        where: {
          category_id: categoryId,
          isVisible: true,
        },
      });

      await db.category.update({
        where: { category_id: categoryId },
        data: { product_count: count },
      });

      this.invalidateCache();
    } catch (error) {
      logger.error('Error updating category product count', { error, categoryId });
    }
  }

  private invalidateCache(): void {
    deleteByPattern(CacheKeys.CATEGORIES);
  }
}

// Export singleton
export const categoryRepository = new CategoryRepository();
