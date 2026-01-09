import { authService } from '../services/auth.service.js';
import { UnauthorizedError, ForbiddenError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
/**
 * Authentication middleware - Verifies JWT token and attaches user to request
 */
export const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            throw new UnauthorizedError('Authorization header required');
        }
        if (!authHeader.startsWith('Bearer ')) {
            throw new UnauthorizedError('Invalid authorization format. Use Bearer token');
        }
        const token = authHeader.substring(7);
        if (!token) {
            throw new UnauthorizedError('Token required');
        }
        // Verify token
        const payload = authService.verifyAccessToken(token);
        // Attach user to request
        req.user = authService.tokenPayloadToAuthUser(payload);
        req.customerId = payload.customerId;
        logger.debug('User authenticated', {
            customerId: payload.customerId,
            email: payload.email
        });
        next();
    }
    catch (error) {
        next(error);
    }
};
/**
 * Optional authentication middleware - Attaches user if token present, continues otherwise
 */
export const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return next();
        }
        const token = authHeader.substring(7);
        if (!token) {
            return next();
        }
        try {
            const payload = authService.verifyAccessToken(token);
            req.user = authService.tokenPayloadToAuthUser(payload);
            req.customerId = payload.customerId;
        }
        catch {
            // Token invalid, but that's okay for optional auth
            logger.debug('Optional auth token invalid, continuing without auth');
        }
        next();
    }
    catch (error) {
        next(error);
    }
};
/**
 * Admin authentication middleware - Requires admin role
 */
export const requireAdmin = async (req, res, next) => {
    try {
        // First authenticate
        await new Promise((resolve, reject) => {
            authenticate(req, res, (err) => {
                if (err)
                    reject(err);
                else
                    resolve();
            });
        });
        // Check admin role
        if (!req.user || req.user.role !== 'admin') {
            throw new ForbiddenError('Admin access required');
        }
        next();
    }
    catch (error) {
        next(error);
    }
};
/**
 * Rate limiting helper for authenticated requests
 * Tracks requests per customer
 */
export const getCustomerIdentifier = (req) => {
    if (req.user) {
        return `customer_${req.user.customerId}`;
    }
    // Fall back to IP for unauthenticated requests
    return req.ip || 'unknown';
};
/**
 * Ensure customer owns the resource
 */
export const ensureOwnership = (req, resourceCustomerId) => {
    if (!req.user) {
        throw new UnauthorizedError('Authentication required');
    }
    if (req.user.customerId !== resourceCustomerId && req.user.role !== 'admin') {
        throw new ForbiddenError('Access denied to this resource');
    }
};
//# sourceMappingURL=auth.middleware.js.map