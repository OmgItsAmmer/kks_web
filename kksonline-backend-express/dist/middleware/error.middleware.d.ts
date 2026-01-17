import type { Request, Response, NextFunction } from 'express';
/**
 * Global error handling middleware
 */
export declare const errorHandler: (err: Error, req: Request, res: Response, _next: NextFunction) => Response;
/**
 * 404 Not Found handler
 */
export declare const notFoundHandler: (req: Request, res: Response, _next: NextFunction) => Response;
/**
 * Async handler wrapper to catch errors in async route handlers
 */
export declare const asyncHandler: <T>(fn: (req: Request, res: Response, next: NextFunction) => Promise<T>) => (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=error.middleware.d.ts.map