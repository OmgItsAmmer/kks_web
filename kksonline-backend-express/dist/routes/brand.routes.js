"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const brand_repository_1 = require("../repositories/brand.repository");
const image_service_1 = require("../services/image.service");
const validation_middleware_1 = require("../middleware/validation.middleware");
const error_middleware_1 = require("../middleware/error.middleware");
const response_1 = require("../utils/response");
const router = (0, express_1.Router)();
/**
 * @route   GET /api/v1/brands
 * @desc    Get all brands
 * @access  Public
 */
router.get('/', (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const brands = await brand_repository_1.brandRepository.findAll();
    // Fetch images
    const brandIds = brands.map((b) => b.brandID);
    const images = await image_service_1.imageService.getMainImagesForEntities(brandIds, 'brands');
    const brandsWithImages = brands.map((brand) => ({
        ...brand,
        imageUrl: images.get(brand.brandID) || null,
    }));
    return (0, response_1.sendSuccess)(res, brandsWithImages);
}));
/**
 * @route   GET /api/v1/brands/featured
 * @desc    Get featured brands
 * @access  Public
 */
router.get('/featured', (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const brands = await brand_repository_1.brandRepository.findFeatured();
    // Fetch images
    const brandIds = brands.map((b) => b.brandID);
    const images = await image_service_1.imageService.getMainImagesForEntities(brandIds, 'brands');
    const brandsWithImages = brands.map((brand) => ({
        ...brand,
        imageUrl: images.get(brand.brandID) || null,
    }));
    return (0, response_1.sendSuccess)(res, brandsWithImages);
}));
/**
 * @route   GET /api/v1/brands/verified
 * @desc    Get verified brands
 * @access  Public
 */
router.get('/verified', (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const brands = await brand_repository_1.brandRepository.findVerified();
    // Fetch images
    const brandIds = brands.map((b) => b.brandID);
    const images = await image_service_1.imageService.getMainImagesForEntities(brandIds, 'brands');
    const brandsWithImages = brands.map((brand) => ({
        ...brand,
        imageUrl: images.get(brand.brandID) || null,
    }));
    return (0, response_1.sendSuccess)(res, brandsWithImages);
}));
/**
 * @route   GET /api/v1/brands/:id
 * @desc    Get brand by ID
 * @access  Public
 */
router.get('/:id', (0, validation_middleware_1.validate)({ params: validation_middleware_1.schemas.idParam }), (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const brandId = parseInt(req.params.id, 10);
    const brand = await brand_repository_1.brandRepository.findById(brandId);
    if (!brand) {
        return (0, response_1.sendNotFound)(res, 'Brand not found');
    }
    const imageUrl = await image_service_1.imageService.getMainImageUrl(brandId, 'brands');
    return (0, response_1.sendSuccess)(res, {
        ...brand,
        imageUrl,
    });
}));
exports.default = router;
//# sourceMappingURL=brand.routes.js.map