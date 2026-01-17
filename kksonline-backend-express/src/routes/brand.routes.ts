import { Router, type Request, type Response } from 'express';
import { brandRepository } from '../repositories/brand.repository';
import { imageService } from '../services/image.service';
import { validate, schemas } from '../middleware/validation.middleware';
import { asyncHandler } from '../middleware/error.middleware';
import { sendSuccess, sendNotFound } from '../utils/response';

const router = Router();

/**
 * @route   GET /api/v1/brands
 * @desc    Get all brands
 * @access  Public
 */
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const brands = await brandRepository.findAll();

    // Fetch images
    const brandIds = brands.map((b) => b.brandID);
    const images = await imageService.getMainImagesForEntities(brandIds, 'brands');

    const brandsWithImages = brands.map((brand) => ({
      ...brand,
      imageUrl: images.get(brand.brandID) || null,
    }));

    return sendSuccess(res, brandsWithImages);
  })
);

/**
 * @route   GET /api/v1/brands/featured
 * @desc    Get featured brands
 * @access  Public
 */
router.get(
  '/featured',
  asyncHandler(async (req: Request, res: Response) => {
    const brands = await brandRepository.findFeatured();

    // Fetch images
    const brandIds = brands.map((b) => b.brandID);
    const images = await imageService.getMainImagesForEntities(brandIds, 'brands');

    const brandsWithImages = brands.map((brand) => ({
      ...brand,
      imageUrl: images.get(brand.brandID) || null,
    }));

    return sendSuccess(res, brandsWithImages);
  })
);

/**
 * @route   GET /api/v1/brands/verified
 * @desc    Get verified brands
 * @access  Public
 */
router.get(
  '/verified',
  asyncHandler(async (req: Request, res: Response) => {
    const brands = await brandRepository.findVerified();

    // Fetch images
    const brandIds = brands.map((b) => b.brandID);
    const images = await imageService.getMainImagesForEntities(brandIds, 'brands');

    const brandsWithImages = brands.map((brand) => ({
      ...brand,
      imageUrl: images.get(brand.brandID) || null,
    }));

    return sendSuccess(res, brandsWithImages);
  })
);

/**
 * @route   GET /api/v1/brands/:id
 * @desc    Get brand by ID
 * @access  Public
 */
router.get(
  '/:id',
  validate({ params: schemas.idParam }),
  asyncHandler(async (req: Request, res: Response) => {
    const brandId = parseInt(req.params.id!, 10);

    const brand = await brandRepository.findById(brandId);
    if (!brand) {
      return sendNotFound(res, 'Brand not found');
    }

    const imageUrl = await imageService.getMainImageUrl(brandId, 'brands');

    return sendSuccess(res, {
      ...brand,
      imageUrl,
    });
  })
);

export default router;

