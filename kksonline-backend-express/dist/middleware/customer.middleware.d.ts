import type { Response, NextFunction } from 'express';
import type { CustomerRequest } from '../types/api.types';
/**
 * Middleware to extract customer ID from request.
 * Supports both JWT token (Authorization header) and X-Customer-Id header.
 * JWT token takes precedence if both are provided.
 */
export declare const extractCustomerId: (req: CustomerRequest, res: Response, next: NextFunction) => void;
/**
 * Middleware that requires a customer ID to be present.
 * Returns 401 if no customer ID is provided.
 * Supports both JWT token and X-Customer-Id header.
 */
export declare const requireCustomer: (req: CustomerRequest, res: Response, next: NextFunction) => Response | void;
//# sourceMappingURL=customer.middleware.d.ts.map