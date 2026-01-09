import { Router } from 'express';
import { brandRepository } from '../repositories/brand.repository.js';
import { imageService } from '../services/image.service.js';
import { validate, schemas } from '../middleware/validation.middleware.js';
import { asyncHandler } from '../middleware/error.middleware.js';
import { sendSuccess, sendNotFound } from '../utils/response.js';
const router = Router();
/**
 * @route   GET /api/v1/brands
 * @desc    Get all brands
 * @access  Public
 */
router.get('/', asyncHandler(async (req, res) => {
    const brands = await brandRepository.findAll();
    // Fetch images
    const brandIds = brands.map((b) => b.brandID);
    const images = await imageService.getMainImagesForEntities(brandIds, 'brands');
    const brandsWithImages = brands.map((brand) => ({
        ...brand,
        imageUrl: images.get(brand.brandID) || null,
    }));
    return sendSuccess(res, brandsWithImages);
}));
/**
 * @route   GET /api/v1/brands/featured
 * @desc    Get featured brands
 * @access  Public
 */
router.get('/featured', asyncHandler(async (req, res) => {
    const brands = await brandRepository.findFeatured();
    // Fetch images
    const brandIds = brands.map((b) => b.brandID);
    const images = await imageService.getMainImagesForEntities(brandIds, 'brands');
    const brandsWithImages = brands.map((brand) => ({
        ...brand,
        imageUrl: images.get(brand.brandID) || null,
    }));
    return sendSuccess(res, brandsWithImages);
}));
/**
 * @route   GET /api/v1/brands/verified
 * @desc    Get verified brands
 * @access  Public
 */
router.get('/verified', asyncHandler(async (req, res) => {
    const brands = await brandRepository.findVerified();
    // Fetch images
    const brandIds = brands.map((b) => b.brandID);
    const images = await imageService.getMainImagesForEntities(brandIds, 'brands');
    const brandsWithImages = brands.map((brand) => ({
        ...brand,
        imageUrl: images.get(brand.brandID) || null,
    }));
    return sendSuccess(res, brandsWithImages);
}));
/**
 * @route   GET /api/v1/brands/:id
 * @desc    Get brand by ID
 * @access  Public
 */
router.get('/:id', validate({ params: schemas.idParam }), asyncHandler(async (req, res) => {
    const brandId = parseInt(req.params.id, 10);
    const brand = await brandRepository.findById(brandId);
    if (!brand) {
        return sendNotFound(res, 'Brand not found');
    }
    const imageUrl = await imageService.getMainImageUrl(brandId, 'brands');
    return sendSuccess(res, {
        ...brand,
        imageUrl,
    });
}));
export default router;
//# sourceMappingURL=brand.routes.js.map