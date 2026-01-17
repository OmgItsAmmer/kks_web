"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireCustomer = exports.extractCustomerId = void 0;
const jwt_utils_1 = require("../utils/jwt.utils");
const response_1 = require("../utils/response");
/**
 * Middleware to extract customer ID from request.
 * Supports both JWT token (Authorization header) and X-Customer-Id header.
 * JWT token takes precedence if both are provided.
 */
const extractCustomerId = (req, res, next) => {
    // First, try to extract from JWT token
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
        try {
            const token = authHeader.split(' ')[1];
            if (token) {
                const decoded = (0, jwt_utils_1.verifyToken)(token);
                if (decoded.customerId) {
                    req.customerId = decoded.customerId;
                    req.user = decoded;
                    return next();
                }
            }
        }
        catch (error) {
            // If JWT validation fails, fall through to check X-Customer-Id header
            // Don't return error here, let requireCustomer handle it
        }
    }
    // Fallback to X-Customer-Id header (for development/testing)
    const customerId = req.headers['x-customer-id'];
    if (customerId && typeof customerId === 'string') {
        const parsed = parseInt(customerId, 10);
        if (!isNaN(parsed) && parsed > 0) {
            req.customerId = parsed;
        }
    }
    next();
};
exports.extractCustomerId = extractCustomerId;
/**
 * Middleware that requires a customer ID to be present.
 * Returns 401 if no customer ID is provided.
 * Supports both JWT token and X-Customer-Id header.
 */
const requireCustomer = (req, res, next) => {
    // First, try to extract from JWT token
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
        try {
            const token = authHeader.split(' ')[1];
            if (token) {
                const decoded = (0, jwt_utils_1.verifyToken)(token);
                if (decoded.customerId) {
                    req.customerId = decoded.customerId;
                    req.user = decoded;
                    return next();
                }
            }
        }
        catch (error) {
            // JWT validation failed, try X-Customer-Id header as fallback
        }
    }
    // Check X-Customer-Id header as fallback
    const customerId = req.headers['x-customer-id'];
    if (customerId && typeof customerId === 'string') {
        const parsed = parseInt(customerId, 10);
        if (!isNaN(parsed) && parsed > 0) {
            req.customerId = parsed;
            return next();
        }
    }
    // No valid authentication found
    return (0, response_1.sendError)(res, 'Authentication required. Please login.', 401, 'UNAUTHORIZED');
};
exports.requireCustomer = requireCustomer;
//# sourceMappingURL=customer.middleware.js.map