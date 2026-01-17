import { Router, type Request, type Response } from 'express';
import { categoryRepository } from '../repositories/category.repository';
import { imageService } from '../services/image.service';
import { validate, schemas } from '../middleware/validation.middleware';
import { asyncHandler } from '../middleware/error.middleware';
import { sendSuccess, sendNotFound } from '../utils/response';

const router = Router();

/**
 * @route   GET /api/v1/categories
 * @desc    Get all categories
 * @access  Public
 */
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const categories = await categoryRepository.findAll();

    // Fetch images
    const categoryIds = categories.map((c) => c.category_id);
    const images = await imageService.getMainImagesForEntities(categoryIds, 'categories');

    const categoriesWithImages = categories.map((category) => ({
      ...category,
      imageUrl: images.get(category.category_id) || null,
    }));

    return sendSuccess(res, categoriesWithImages);
  })
);

/**
 * @route   GET /api/v1/categories/featured
 * @desc    Get featured categories
 * @access  Public
 */
router.get(
  '/featured',
  asyncHandler(async (req: Request, res: Response) => {
    const categories = await categoryRepository.findFeatured();

    // Fetch images
    const categoryIds = categories.map((c) => c.category_id);
    const images = await imageService.getMainImagesForEntities(categoryIds, 'categories');

    const categoriesWithImages = categories.map((category) => ({
      ...category,
      imageUrl: images.get(category.category_id) || null,
    }));

    return sendSuccess(res, categoriesWithImages);
  })
);

/**
 * @route   GET /api/v1/categories/:id
 * @desc    Get category by ID
 * @access  Public
 */
router.get(
  '/:id',
  validate({ params: schemas.idParam }),
  asyncHandler(async (req: Request, res: Response) => {
    const categoryId = parseInt(req.params.id!, 10);

    const category = await categoryRepository.findById(categoryId);
    if (!category) {
      return sendNotFound(res, 'Category not found');
    }

    const imageUrl = await imageService.getMainImageUrl(categoryId, 'categories');

    return sendSuccess(res, {
      ...category,
      imageUrl,
    });
  })
);

export default router;

