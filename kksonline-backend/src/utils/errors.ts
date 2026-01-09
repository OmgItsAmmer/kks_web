import type { ErrorCode } from '../types/api.types.js';
import { ErrorCodes } from '../types/api.types.js';

// Base API Error class
export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: ErrorCode;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: number,
    errorCode: ErrorCode = ErrorCodes.INTERNAL_ERROR,
    isOperational = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = isOperational;

    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, this.constructor);

    // Set the prototype explicitly
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

// Specific error classes
export class BadRequestError extends ApiError {
  constructor(message = 'Bad request', errorCode: ErrorCode = ErrorCodes.INVALID_INPUT) {
    super(message, 400, errorCode);
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message = 'Unauthorized', errorCode: ErrorCode = ErrorCodes.UNAUTHORIZED) {
    super(message, 401, errorCode);
  }
}

export class ForbiddenError extends ApiError {
  constructor(message = 'Forbidden') {
    super(message, 403, ErrorCodes.UNAUTHORIZED);
  }
}

export class NotFoundError extends ApiError {
  constructor(message = 'Resource not found') {
    super(message, 404, ErrorCodes.NOT_FOUND);
  }
}

export class ConflictError extends ApiError {
  constructor(message = 'Resource already exists', errorCode: ErrorCode = ErrorCodes.ALREADY_EXISTS) {
    super(message, 409, errorCode);
  }
}

export class ValidationError extends ApiError {
  public readonly errors: Record<string, string[]>;

  constructor(message = 'Validation failed', errors: Record<string, string[]> = {}) {
    super(message, 422, ErrorCodes.VALIDATION_ERROR);
    this.errors = errors;
  }
}

export class TooManyRequestsError extends ApiError {
  constructor(message = 'Too many requests') {
    super(message, 429, ErrorCodes.INTERNAL_ERROR);
  }
}

export class InternalServerError extends ApiError {
  constructor(message = 'Internal server error') {
    super(message, 500, ErrorCodes.INTERNAL_ERROR, false);
  }
}

export class DatabaseError extends ApiError {
  constructor(message = 'Database error') {
    super(message, 500, ErrorCodes.DATABASE_ERROR, false);
  }
}

export class ExternalServiceError extends ApiError {
  constructor(message = 'External service error') {
    super(message, 502, ErrorCodes.EXTERNAL_SERVICE_ERROR, false);
  }
}

// Checkout-specific errors
export class CartEmptyError extends BadRequestError {
  constructor() {
    super('Cart is empty', ErrorCodes.CART_EMPTY);
  }
}

export class DuplicateOrderError extends ConflictError {
  constructor() {
    super('Order already processed. Please refresh and try again.', ErrorCodes.DUPLICATE_ORDER);
  }
}

export class InventoryUnavailableError extends BadRequestError {
  constructor(message = 'Insufficient stock for some items') {
    super(message, ErrorCodes.INVENTORY_UNAVAILABLE);
  }
}

export class PriceMismatchError extends BadRequestError {
  constructor() {
    super('Price mismatch detected. Please refresh and try again.', ErrorCodes.PRICE_MISMATCH);
  }
}

export class SecurityViolationError extends BadRequestError {
  constructor(message = 'Security violation detected') {
    super(message, ErrorCodes.SECURITY_VIOLATION);
  }
}

export class ShippingMethodInvalidError extends BadRequestError {
  constructor(message = 'Invalid shipping method') {
    super(message, ErrorCodes.SHIPPING_METHOD_INVALID);
  }
}

export class PhoneNumberRequiredError extends BadRequestError {
  constructor() {
    super('Phone number required for checkout. Please add your phone number to your profile.', ErrorCodes.PHONE_NUMBER_REQUIRED);
  }
}

export class PaymentFailedError extends BadRequestError {
  constructor(message = 'Payment processing failed') {
    super(message, ErrorCodes.PAYMENT_FAILED);
  }
}

export class OrderCreationFailedError extends ApiError {
  constructor(message = 'Order creation failed') {
    super(message, 500, ErrorCodes.ORDER_CREATION_FAILED);
  }
}

// Helper function to check if error is operational
export const isOperationalError = (error: Error): boolean => {
  if (error instanceof ApiError) {
    return error.isOperational;
  }
  return false;
};

