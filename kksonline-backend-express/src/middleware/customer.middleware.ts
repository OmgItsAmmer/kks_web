import type { Response, NextFunction, Request } from 'express';
import type { CustomerRequest } from '../types/api.types';
import { verifyToken } from '../utils/jwt.utils';
import { sendError } from '../utils/response';

/**
 * Middleware to extract customer ID from request.
 * Only a valid signed JWT (Authorization: Bearer) identifies a customer. The old `X-Customer-Id`
 * header fallback was removed: it let anyone act as any customer.
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
      // Invalid token: continue unauthenticated; requireCustomer will reject it
    }
  }

  next();
};

/**
 * Middleware that requires a customer ID to be present.
 * Returns 401 if no customer ID is provided.
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
      // JWT validation failed
    }
  }

  // No valid authentication found
  return sendError(res, 'Authentication required. Please login.', 401, 'UNAUTHORIZED' as const);
};

