"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isOperationalError = exports.OrderCreationFailedError = exports.PaymentFailedError = exports.PhoneNumberRequiredError = exports.ShippingMethodInvalidError = exports.SecurityViolationError = exports.PriceMismatchError = exports.InventoryUnavailableError = exports.DuplicateOrderError = exports.CartEmptyError = exports.ExternalServiceError = exports.DatabaseError = exports.InternalServerError = exports.TooManyRequestsError = exports.ValidationError = exports.ConflictError = exports.NotFoundError = exports.ForbiddenError = exports.UnauthorizedError = exports.BadRequestError = exports.ApiError = void 0;
const api_types_js_1 = require("../types/api.types.js");
// Base API Error class
class ApiError extends Error {
    statusCode;
    errorCode;
    isOperational;
    constructor(message, statusCode, errorCode = api_types_js_1.ErrorCodes.INTERNAL_ERROR, isOperational = true) {
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
exports.ApiError = ApiError;
// Specific error classes
class BadRequestError extends ApiError {
    constructor(message = 'Bad request', errorCode = api_types_js_1.ErrorCodes.INVALID_INPUT) {
        super(message, 400, errorCode);
    }
}
exports.BadRequestError = BadRequestError;
class UnauthorizedError extends ApiError {
    constructor(message = 'Unauthorized', errorCode = api_types_js_1.ErrorCodes.UNAUTHORIZED) {
        super(message, 401, errorCode);
    }
}
exports.UnauthorizedError = UnauthorizedError;
class ForbiddenError extends ApiError {
    constructor(message = 'Forbidden') {
        super(message, 403, api_types_js_1.ErrorCodes.UNAUTHORIZED);
    }
}
exports.ForbiddenError = ForbiddenError;
class NotFoundError extends ApiError {
    constructor(message = 'Resource not found') {
        super(message, 404, api_types_js_1.ErrorCodes.NOT_FOUND);
    }
}
exports.NotFoundError = NotFoundError;
class ConflictError extends ApiError {
    constructor(message = 'Resource already exists', errorCode = api_types_js_1.ErrorCodes.ALREADY_EXISTS) {
        super(message, 409, errorCode);
    }
}
exports.ConflictError = ConflictError;
class ValidationError extends ApiError {
    errors;
    constructor(message = 'Validation failed', errors = {}) {
        super(message, 422, api_types_js_1.ErrorCodes.VALIDATION_ERROR);
        this.errors = errors;
    }
}
exports.ValidationError = ValidationError;
class TooManyRequestsError extends ApiError {
    constructor(message = 'Too many requests') {
        super(message, 429, api_types_js_1.ErrorCodes.INTERNAL_ERROR);
    }
}
exports.TooManyRequestsError = TooManyRequestsError;
class InternalServerError extends ApiError {
    constructor(message = 'Internal server error') {
        super(message, 500, api_types_js_1.ErrorCodes.INTERNAL_ERROR, false);
    }
}
exports.InternalServerError = InternalServerError;
class DatabaseError extends ApiError {
    constructor(message = 'Database error') {
        super(message, 500, api_types_js_1.ErrorCodes.DATABASE_ERROR, false);
    }
}
exports.DatabaseError = DatabaseError;
class ExternalServiceError extends ApiError {
    constructor(message = 'External service error') {
        super(message, 502, api_types_js_1.ErrorCodes.EXTERNAL_SERVICE_ERROR, false);
    }
}
exports.ExternalServiceError = ExternalServiceError;
// Checkout-specific errors
class CartEmptyError extends BadRequestError {
    constructor() {
        super('Cart is empty', api_types_js_1.ErrorCodes.CART_EMPTY);
    }
}
exports.CartEmptyError = CartEmptyError;
class DuplicateOrderError extends ConflictError {
    constructor() {
        super('Order already processed. Please refresh and try again.', api_types_js_1.ErrorCodes.DUPLICATE_ORDER);
    }
}
exports.DuplicateOrderError = DuplicateOrderError;
class InventoryUnavailableError extends BadRequestError {
    constructor(message = 'Insufficient stock for some items') {
        super(message, api_types_js_1.ErrorCodes.INVENTORY_UNAVAILABLE);
    }
}
exports.InventoryUnavailableError = InventoryUnavailableError;
class PriceMismatchError extends BadRequestError {
    constructor() {
        super('Price mismatch detected. Please refresh and try again.', api_types_js_1.ErrorCodes.PRICE_MISMATCH);
    }
}
exports.PriceMismatchError = PriceMismatchError;
class SecurityViolationError extends BadRequestError {
    constructor(message = 'Security violation detected') {
        super(message, api_types_js_1.ErrorCodes.SECURITY_VIOLATION);
    }
}
exports.SecurityViolationError = SecurityViolationError;
class ShippingMethodInvalidError extends BadRequestError {
    constructor(message = 'Invalid shipping method') {
        super(message, api_types_js_1.ErrorCodes.SHIPPING_METHOD_INVALID);
    }
}
exports.ShippingMethodInvalidError = ShippingMethodInvalidError;
class PhoneNumberRequiredError extends BadRequestError {
    constructor() {
        super('Phone number required for checkout. Please add your phone number to your profile.', api_types_js_1.ErrorCodes.PHONE_NUMBER_REQUIRED);
    }
}
exports.PhoneNumberRequiredError = PhoneNumberRequiredError;
class PaymentFailedError extends BadRequestError {
    constructor(message = 'Payment processing failed') {
        super(message, api_types_js_1.ErrorCodes.PAYMENT_FAILED);
    }
}
exports.PaymentFailedError = PaymentFailedError;
class OrderCreationFailedError extends ApiError {
    constructor(message = 'Order creation failed') {
        super(message, 500, api_types_js_1.ErrorCodes.ORDER_CREATION_FAILED);
    }
}
exports.OrderCreationFailedError = OrderCreationFailedError;
// Helper function to check if error is operational
const isOperationalError = (error) => {
    if (error instanceof ApiError) {
        return error.isOperational;
    }
    return false;
};
exports.isOperationalError = isOperationalError;
//# sourceMappingURL=errors.js.map