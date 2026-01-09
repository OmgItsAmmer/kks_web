import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../types/api.types.js';
/**
 * Authentication middleware - Verifies JWT token and attaches user to request
 */
export declare const authenticate: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * Optional authentication middleware - Attaches user if token present, continues otherwise
 */
export declare const optionalAuth: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * Admin authentication middleware - Requires admin role
 */
export declare const requireAdmin: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * Rate limiting helper for authenticated requests
 * Tracks requests per customer
 */
export declare const getCustomerIdentifier: (req: AuthenticatedRequest) => string;
/**
 * Ensure customer owns the resource
 */
export declare const ensureOwnership: (req: AuthenticatedRequest, resourceCustomerId: number) => void;
//# sourceMappingURL=auth.middleware.d.ts.map