import type { Response, NextFunction, Request } from 'express';
import type { CustomerRequest } from '../types/api.types.ts';

/**
 * Simple middleware to extract customer ID from request header.
 * For development/testing purposes without JWT authentication.
 * 
 * The client should send the customer ID via the X-Customer-Id header.
 */
export const extractCustomerId = (
  req: CustomerRequest,
  res: Response,
  next: NextFunction
): void => {
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
 */
export const requireCustomer = (
  req: CustomerRequest,
  res: Response,
  next: NextFunction
): Response | void => {
  if (!req.customerId) {
    return res.status(401).json({
      success: false,
      error: 'Customer ID required. Please provide X-Customer-Id header.',
      errorCode: 'UNAUTHORIZED',
    });
  }

  next();
};

