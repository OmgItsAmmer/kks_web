import type { Request, Response, NextFunction } from 'express';
import { ApiError, ValidationError, isOperationalError } from "../utils/errors";
import { logger } from "../utils/logger";
import { config } from "../config/env.config";
import type { ApiResponse } from "../types/api.types";

/**
 * Global error handling middleware
 */
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): Response => {
  // Log the error
  if (isOperationalError(err)) {
    logger.warn('Operational error', {
      error: err.message,
      path: req.path,
      method: req.method,
    });
  } else {
    logger.error('Unexpected error', {
      error: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
    });
  }

  // Handle API errors
  if (err instanceof ApiError) {
    const response: ApiResponse & { errors?: Record<string, string[]> } = {
      success: false,
      error: err.message,
      errorCode: err.errorCode,
    };

    // Add validation errors if present
    if (err instanceof ValidationError) {
      response.errors = err.errors;
    }

    return res.status(err.statusCode).json(response);
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: 'Invalid token',
      errorCode: 'INVALID_TOKEN',
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: 'Token expired',
      errorCode: 'TOKEN_EXPIRED',
    });
  }

  // Handle Prisma/Postgres errors
  if ('code' in err && typeof (err as { code: string }).code === 'string') {
    const pgError = err as { code: string; message: string; detail?: string };
    
    // Common Postgres error codes
    switch (pgError.code) {
      case '23505': // unique_violation
        return res.status(409).json({
          success: false,
          error: 'Resource already exists',
          errorCode: 'ALREADY_EXISTS',
        });
      case '23503': // foreign_key_violation
        return res.status(400).json({
          success: false,
          error: 'Referenced resource not found',
          errorCode: 'INVALID_INPUT',
        });
      case '23514': // check_violation
        return res.status(400).json({
          success: false,
          error: 'Validation constraint violated',
          errorCode: 'VALIDATION_ERROR',
        });
      case 'PGRST116': // Row not found (PostgREST)
        return res.status(404).json({
          success: false,
          error: 'Resource not found',
          errorCode: 'NOT_FOUND',
        });
    }
  }

  // Default error response
  const statusCode = 500;
  const message = config.server.isProduction
    ? 'Internal server error'
    : err.message;

  return res.status(statusCode).json({
    success: false,
    error: message,
    errorCode: 'INTERNAL_ERROR',
    ...(config.server.isDevelopment && { stack: err.stack }),
  });
};

/**
 * 404 Not Found handler
 */
export const notFoundHandler = (
  req: Request,
  res: Response,
  _next: NextFunction
): Response => {
  return res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.path} not found`,
    errorCode: 'NOT_FOUND',
  });
};

/**
 * Async handler wrapper to catch errors in async route handlers
 */
export const asyncHandler = <T>(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<T>
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

