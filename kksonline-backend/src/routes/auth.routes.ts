import { Router } from 'express';
import { authService } from '../services/auth.service.ts';
import { validate, schemas } from '../middleware/validation.middleware.ts';
import { asyncHandler } from '../middleware/error.middleware.ts';
import { authenticate } from '../middleware/auth.middleware.ts';
import { sendSuccess, sendError } from '../utils/response.ts';
import { logger } from '../utils/logger.ts';

const router = Router();

/**
 * @route   POST /api/v1/auth/google
 * @desc    Authenticate with Google OAuth
 * @access  Public
 */
router.post(
    '/google',
    validate({ body: schemas.googleAuth }),
    asyncHandler(async (req, res) => {
        const { idToken, fcmToken } = req.body;

        logger.info('Google OAuth authentication attempt');
        const authResponse = await authService.authenticateWithGoogle(idToken, fcmToken);

        return sendSuccess(res, authResponse, 'Authentication successful');
    })
);

/**
 * @route   POST /api/v1/auth/refresh
 * @desc    Refresh access token
 * @access  Public
 */
router.post(
    '/refresh',
    validate({ body: schemas.refreshToken }),
    asyncHandler(async (req, res) => {
        const { refreshToken } = req.body;

        const result = await authService.refreshAccessToken(refreshToken);

        return sendSuccess(res, result, 'Token refreshed successfully');
    })
);

/**
 * @route   GET /api/v1/auth/me
 * @desc    Get current user info
 * @access  Private
 */
router.get(
    '/me',
    authenticate,
    asyncHandler(async (req, res) => {
        if (!req.user || !req.customerId) {
            return sendError(res, 'Unauthorized', 401);
        }

        const customer = await authService.findCustomerById(req.customerId);
        if (!customer) {
            return sendError(res, 'Customer not found', 404);
        }

        const profilePicture = await authService.getCustomerProfilePicture(req.customerId);

        return sendSuccess(res, {
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
    })
);

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logout user (client should clear tokens)
 * @access  Private
 */
router.post(
    '/logout',
    authenticate,
    asyncHandler(async (req, res) => {
        // Server-side logout is mainly for logging purposes
        // Actual token invalidation happens client-side
        logger.info('User logged out', { customerId: req.customerId });

        return sendSuccess(res, null, 'Logged out successfully');
    })
);

/**
 * @route   POST /api/v1/auth/fcm-token
 * @desc    Update FCM token for push notifications
 * @access  Private
 */
router.post(
    '/fcm-token',
    authenticate,
    asyncHandler(async (req, res) => {
        const { fcmToken } = req.body;

        if (!fcmToken || typeof fcmToken !== 'string') {
            return sendError(res, 'FCM token is required', 400);
        }

        if (!req.customerId) {
            return sendError(res, 'Unauthorized', 401);
        }

        await authService.updateFcmToken(req.customerId, fcmToken);

        return sendSuccess(res, null, 'FCM token updated');
    })
);

export default router;
