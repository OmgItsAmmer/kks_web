import type { Response, NextFunction, Request } from 'express';
import type { CustomerRequest } from '../types/api.types.ts';
import { verifyToken } from '../utils/jwt.utils.ts';
import { sendError } from '../utils/response.ts';

/**
 * Middleware to extract customer ID from request.
 * Supports both JWT token (Authorization header) and X-Customer-Id header.
 * JWT token takes precedence if both are provided.
 */
export const extractCustomerId = (
  req: CustomerRequest,
  res: Response,
  next: NextFunction
): void => {
  // First, try to extract from JWT token
  const authHeader = req.headers.authorization;
  
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1];
      if (token) {
        const decoded = verifyToken(token);
        if (decoded.customerId) {
          req.customerId = decoded.customerId;
          req.user = decoded;
          return next();
        }
      }
    } catch (error) {
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

/**
 * Middleware that requires a customer ID to be present.
 * Returns 401 if no customer ID is provided.
 * Supports both JWT token and X-Customer-Id header.
 */
export const requireCustomer = (
  req: CustomerRequest,
  res: Response,
  next: NextFunction
): Response | void => {
  // First, try to extract from JWT token
  const authHeader = req.headers.authorization;
  
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1];
      if (token) {
        const decoded = verifyToken(token);
        if (decoded.customerId) {
          req.customerId = decoded.customerId;
          req.user = decoded;
          return next();
        }
      }
    } catch (error) {
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
  return sendError(res, 'Authentication required. Please login.', 401, 'UNAUTHORIZED' as const);
};

