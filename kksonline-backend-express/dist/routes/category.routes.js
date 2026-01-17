"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const category_repository_1 = require("../repositories/category.repository");
const image_service_1 = require("../services/image.service");
const validation_middleware_1 = require("../middleware/validation.middleware");
const error_middleware_1 = require("../middleware/error.middleware");
const response_1 = require("../utils/response");
const router = (0, express_1.Router)();
/**
 * @route   GET /api/v1/categories
 * @desc    Get all categories
 * @access  Public
 */
router.get('/', (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const categories = await category_repository_1.categoryRepository.findAll();
    // Fetch images
    const categoryIds = categories.map((c) => c.category_id);
    const images = await image_service_1.imageService.getMainImagesForEntities(categoryIds, 'categories');
    const categoriesWithImages = categories.map((category) => ({
        ...category,
        imageUrl: images.get(category.category_id) || null,
    }));
    return (0, response_1.sendSuccess)(res, categoriesWithImages);
}));
/**
 * @route   GET /api/v1/categories/featured
 * @desc    Get featured categories
 * @access  Public
 */
router.get('/featured', (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const categories = await category_repository_1.categoryRepository.findFeatured();
    // Fetch images
    const categoryIds = categories.map((c) => c.category_id);
    const images = await image_service_1.imageService.getMainImagesForEntities(categoryIds, 'categories');
    const categoriesWithImages = categories.map((category) => ({
        ...category,
        imageUrl: images.get(category.category_id) || null,
    }));
    return (0, response_1.sendSuccess)(res, categoriesWithImages);
}));
/**
 * @route   GET /api/v1/categories/:id
 * @desc    Get category by ID
 * @access  Public
 */
router.get('/:id', (0, validation_middleware_1.validate)({ params: validation_middleware_1.schemas.idParam }), (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const categoryId = parseInt(req.params.id, 10);
    const category = await category_repository_1.categoryRepository.findById(categoryId);
    if (!category) {
        return (0, response_1.sendNotFound)(res, 'Category not found');
    }
    const imageUrl = await image_service_1.imageService.getMainImageUrl(categoryId, 'categories');
    return (0, response_1.sendSuccess)(res, {
        ...category,
        imageUrl,
    });
}));
exports.default = router;
//# sourceMappingURL=category.routes.js.map