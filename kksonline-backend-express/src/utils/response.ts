import type { Response } from 'express';
import type { ApiResponse, PaginatedResponse, ErrorCode } from '../types/api.types.js';

/**
 * Safely serialize data by converting BigInt values to numbers.
 *
 * NOTE:
 * - JSON.stringify cannot handle BigInt directly.
 * - This helper walks the response payload and converts all BigInt
 *   instances to regular numbers before sending the response.
 */
const serializeForJson = <T>(value: T): T => {
  return JSON.parse(
    JSON.stringify(
      value,
      (_key, val) => {
        if (typeof val === 'bigint') {
          // Convert BigInt to number. If you ever expect values
          // larger than Number.MAX_SAFE_INTEGER, consider using
          // val.toString() instead.
          return Number(val);
        }
        return val;
      }
    )
  );
};

// Success response helper
export const sendSuccess = <T>(
  res: Response,
  data: T,
  message?: string,
  statusCode = 200
): Response => {
  const response: ApiResponse<T> = {
    success: true,
    data,
    message,
  };

  const safeResponse = serializeForJson(response);
  return res.status(statusCode).json(safeResponse);
};

// Created response helper (201)
export const sendCreated = <T>(res: Response, data: T, message = 'Resource created successfully'): Response => {
  return sendSuccess(res, data, message, 201);
};

// No content response helper (204)
export const sendNoContent = (res: Response): Response => {
  return res.status(204).send();
};

// Paginated response helper
export const sendPaginated = <T>(
  res: Response,
  data: T[],
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  },
  message?: string
): Response => {
  const totalPages = Math.ceil(pagination.total / pagination.pageSize);
  
  const response: PaginatedResponse<T> = {
    success: true,
    data,
    message,
    pagination: {
      page: pagination.page,
      pageSize: pagination.pageSize,
      total: pagination.total,
      totalPages,
      hasMore: pagination.page < totalPages,
    },
  };
  
  const safeResponse = serializeForJson(response);
  return res.status(200).json(safeResponse);
};

// Error response helper
export const sendError = (
  res: Response,
  message: string,
  statusCode = 500,
  errorCode?: ErrorCode
): Response => {
  const response: ApiResponse = {
    success: false,
    error: message,
    errorCode,
  };

  const safeResponse = serializeForJson(response);
  return res.status(statusCode).json(safeResponse);
};

// Validation error response helper
export const sendValidationError = (
  res: Response,
  errors: Record<string, string[]>,
  message = 'Validation failed'
): Response => {
  const payload = {
    success: false,
    error: message,
    errorCode: 'VALIDATION_ERROR' as const,
    errors,
  };

  const safePayload = serializeForJson(payload);
  return res.status(422).json(safePayload);
};

// Not found response helper
export const sendNotFound = (res: Response, message = 'Resource not found'): Response => {
  return sendError(res, message, 404, 'NOT_FOUND');
};

// Unauthorized response helper
export const sendUnauthorized = (res: Response, message = 'Unauthorized'): Response => {
  return sendError(res, message, 401, 'UNAUTHORIZED');
};

// Forbidden response helper
export const sendForbidden = (res: Response, message = 'Forbidden'): Response => {
  return sendError(res, message, 403, 'UNAUTHORIZED');
};

// Conflict response helper
export const sendConflict = (res: Response, message = 'Resource already exists'): Response => {
  return sendError(res, message, 409, 'ALREADY_EXISTS');
};

