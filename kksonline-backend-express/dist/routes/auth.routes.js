"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_service_ts_1 = require("../services/auth.service.ts");
const validation_middleware_ts_1 = require("../middleware/validation.middleware.ts");
const error_middleware_ts_1 = require("../middleware/error.middleware.ts");
const auth_middleware_ts_1 = require("../middleware/auth.middleware.ts");
const response_ts_1 = require("../utils/response.ts");
const logger_ts_1 = require("../utils/logger.ts");
const router = (0, express_1.Router)();
/**
 * @route   POST /api/v1/auth/google
 * @desc    Authenticate with Google OAuth
 * @access  Public
 */
router.post('/google', (0, validation_middleware_ts_1.validate)({ body: validation_middleware_ts_1.schemas.googleAuth }), (0, error_middleware_ts_1.asyncHandler)(async (req, res) => {
    const { idToken, fcmToken } = req.body;
    logger_ts_1.logger.info('Google OAuth authentication attempt');
    const authResponse = await auth_service_ts_1.authService.authenticateWithGoogle(idToken, fcmToken);
    return (0, response_ts_1.sendSuccess)(res, authResponse, 'Authentication successful');
}));
/**
 * @route   POST /api/v1/auth/refresh
 * @desc    Refresh access token
 * @access  Public
 */
router.post('/refresh', (0, validation_middleware_ts_1.validate)({ body: validation_middleware_ts_1.schemas.refreshToken }), (0, error_middleware_ts_1.asyncHandler)(async (req, res) => {
    const { refreshToken } = req.body;
    const result = await auth_service_ts_1.authService.refreshAccessToken(refreshToken);
    return (0, response_ts_1.sendSuccess)(res, result, 'Token refreshed successfully');
}));
/**
 * @route   GET /api/v1/auth/me
 * @desc    Get current user info
 * @access  Private
 */
router.get('/me', auth_middleware_ts_1.authenticate, (0, error_middleware_ts_1.asyncHandler)(async (req, res) => {
    if (!req.user || !req.customerId) {
        return (0, response_ts_1.sendError)(res, 'Unauthorized', 401);
    }
    const customer = await auth_service_ts_1.authService.findCustomerById(req.customerId);
    if (!customer) {
        return (0, response_ts_1.sendError)(res, 'Customer not found', 404);
    }
    const profilePicture = await auth_service_ts_1.authService.getCustomerProfilePicture(req.customerId);
    return (0, response_ts_1.sendSuccess)(res, {
        id: req.user.id,
        email: customer.email,
        customerId: customer.customer_id,
        firstName: customer.first_name,
        lastName: customer.last_name,
        phoneNumber: customer.phone_number,
        gender: customer.gender,
        dob: customer.dob,
        profilePicture,
    });
}));
/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logout user (client should clear tokens)
 * @access  Private
 */
router.post('/logout', auth_middleware_ts_1.authenticate, (0, error_middleware_ts_1.asyncHandler)(async (req, res) => {
    // Server-side logout is mainly for logging purposes
    // Actual token invalidation happens client-side
    logger_ts_1.logger.info('User logged out', { customerId: req.customerId });
    return (0, response_ts_1.sendSuccess)(res, null, 'Logged out successfully');
}));
/**
 * @route   POST /api/v1/auth/fcm-token
 * @desc    Update FCM token for push notifications
 * @access  Private
 */
router.post('/fcm-token', auth_middleware_ts_1.authenticate, (0, error_middleware_ts_1.asyncHandler)(async (req, res) => {
    const { fcmToken } = req.body;
    if (!fcmToken || typeof fcmToken !== 'string') {
        return (0, response_ts_1.sendError)(res, 'FCM token is required', 400);
    }
    if (!req.customerId) {
        return (0, response_ts_1.sendError)(res, 'Unauthorized', 401);
    }
    await auth_service_ts_1.authService.updateFcmToken(req.customerId, fcmToken);
    return (0, response_ts_1.sendSuccess)(res, null, 'FCM token updated');
}));
exports.default = router;
//# sourceMappingURL=auth.routes.js.map