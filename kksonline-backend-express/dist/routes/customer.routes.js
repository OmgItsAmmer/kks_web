"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const customer_repository_1 = require("../repositories/customer.repository");
const image_service_1 = require("../services/image.service");
const validation_middleware_1 = require("../middleware/validation.middleware");
const error_middleware_1 = require("../middleware/error.middleware");
const customer_middleware_1 = require("../middleware/customer.middleware");
const response_1 = require("../utils/response");
const multer_1 = __importDefault(require("multer"));
const router = (0, express_1.Router)();
// Configure multer for file uploads
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        }
        else {
            cb(new Error('Only image files are allowed'));
        }
    },
});
/**
 * @route   GET /api/v1/customers/profile
 * @desc    Get current customer profile
 * @access  Private
 */
router.get('/profile', customer_middleware_1.requireCustomer, (0, error_middleware_1.asyncHandler)(async (req, res) => {
    if (!req.customerId) {
        return (0, response_1.sendError)(res, 'Unauthorized', 401);
    }
    const customer = await customer_repository_1.customerRepository.findById(req.customerId);
    if (!customer) {
        return (0, response_1.sendNotFound)(res, 'Customer not found');
    }
    const profilePicture = await image_service_1.imageService.getMainImageUrl(req.customerId, 'customers');
    return (0, response_1.sendSuccess)(res, {
        customerId: customer.customer_id,
        email: customer.email,
        firstName: customer.first_name,
        lastName: customer.last_name,
        phoneNumber: customer.phone_number,
        cnic: customer.cnic,
        gender: customer.gender,
        dob: customer.dob,
        createdAt: customer.created_at,
        profilePicture,
    });
}));
/**
 * @route   PUT /api/v1/customers/profile
 * @desc    Update customer profile
 * @access  Private
 */
router.put('/profile', customer_middleware_1.requireCustomer, (0, validation_middleware_1.validate)({ body: validation_middleware_1.schemas.customerUpdate }), (0, error_middleware_1.asyncHandler)(async (req, res) => {
    if (!req.customerId) {
        return (0, response_1.sendError)(res, 'Unauthorized', 401);
    }
    const { firstName, lastName, phoneNumber, cnic, gender, dob } = req.body;
    const updated = await customer_repository_1.customerRepository.updateProfile(req.customerId, {
        firstName,
        lastName,
        phoneNumber,
        cnic,
        gender,
        dob,
    });
    return (0, response_1.sendSuccess)(res, {
        customerId: updated.customer_id,
        email: updated.email,
        firstName: updated.first_name,
        lastName: updated.last_name,
        phoneNumber: updated.phone_number,
        cnic: updated.cnic,
        gender: updated.gender,
        dob: updated.dob,
    }, 'Profile updated successfully');
}));
/**
 * @route   POST /api/v1/customers/profile-picture
 * @desc    Upload/update profile picture
 * @access  Private
 */
router.post('/profile-picture', customer_middleware_1.requireCustomer, upload.single('image'), (0, error_middleware_1.asyncHandler)(async (req, res) => {
    if (!req.customerId) {
        return (0, response_1.sendError)(res, 'Unauthorized', 401);
    }
    if (!req.file) {
        return (0, response_1.sendError)(res, 'No image file provided', 400);
    }
    const result = await image_service_1.imageService.updateMainImage(req.file.buffer, 'customers', req.customerId, req.file.originalname, req.file.mimetype);
    return (0, response_1.sendSuccess)(res, {
        imageUrl: result.url,
        imageId: result.imageId,
    }, 'Profile picture updated');
}));
/**
 * @route   DELETE /api/v1/customers/profile-picture
 * @desc    Delete profile picture
 * @access  Private
 */
router.delete('/profile-picture', customer_middleware_1.requireCustomer, (0, error_middleware_1.asyncHandler)(async (req, res) => {
    if (!req.customerId) {
        return (0, response_1.sendError)(res, 'Unauthorized', 401);
    }
    await image_service_1.imageService.deleteMainImage(req.customerId, 'customers');
    return (0, response_1.sendSuccess)(res, null, 'Profile picture deleted');
}));
/**
 * @route   DELETE /api/v1/customers/account
 * @desc    Delete customer account
 * @access  Private
 */
router.delete('/account', customer_middleware_1.requireCustomer, (0, error_middleware_1.asyncHandler)(async (req, res) => {
    if (!req.customerId) {
        return (0, response_1.sendError)(res, 'Unauthorized', 401);
    }
    // Delete all related data first
    await image_service_1.imageService.deleteAllImagesForEntity(req.customerId, 'customers');
    // Delete customer record
    await customer_repository_1.customerRepository.delete(req.customerId);
    return (0, response_1.sendSuccess)(res, null, 'Account deleted successfully');
}));
exports.default = router;
//# sourceMappingURL=customer.routes.js.map