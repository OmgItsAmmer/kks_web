import type { Response } from 'express';
import type { ApiResponse, PaginatedResponse, ErrorCode } from '../types/api.types.js';

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
  return res.status(statusCode).json(response);
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
  
  return res.status(200).json(response);
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
  return res.status(statusCode).json(response);
};

// Validation error response helper
export const sendValidationError = (
  res: Response,
  errors: Record<string, string[]>,
  message = 'Validation failed'
): Response => {
  return res.status(422).json({
    success: false,
    error: message,
    errorCode: 'VALIDATION_ERROR',
    errors,
  });
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

