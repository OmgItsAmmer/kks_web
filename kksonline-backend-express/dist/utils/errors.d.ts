import type { ErrorCode } from '../types/api.types.js';
export declare class ApiError extends Error {
    readonly statusCode: number;
    readonly errorCode: ErrorCode;
    readonly isOperational: boolean;
    constructor(message: string, statusCode: number, errorCode?: ErrorCode, isOperational?: boolean);
}
export declare class BadRequestError extends ApiError {
    constructor(message?: string, errorCode?: ErrorCode);
}
export declare class UnauthorizedError extends ApiError {
    constructor(message?: string, errorCode?: ErrorCode);
}
export declare class ForbiddenError extends ApiError {
    constructor(message?: string);
}
export declare class NotFoundError extends ApiError {
    constructor(message?: string);
}
export declare class ConflictError extends ApiError {
    constructor(message?: string, errorCode?: ErrorCode);
}
export declare class ValidationError extends ApiError {
    readonly errors: Record<string, string[]>;
    constructor(message?: string, errors?: Record<string, string[]>);
}
export declare class TooManyRequestsError extends ApiError {
    constructor(message?: string);
}
export declare class InternalServerError extends ApiError {
    constructor(message?: string);
}
export declare class DatabaseError extends ApiError {
    constructor(message?: string);
}
export declare class ExternalServiceError extends ApiError {
    constructor(message?: string);
}
export declare class CartEmptyError extends BadRequestError {
    constructor();
}
export declare class DuplicateOrderError extends ConflictError {
    constructor();
}
export declare class InventoryUnavailableError extends BadRequestError {
    constructor(message?: string);
}
export declare class PriceMismatchError extends BadRequestError {
    constructor();
}
export declare class SecurityViolationError extends BadRequestError {
    constructor(message?: string);
}
export declare class ShippingMethodInvalidError extends BadRequestError {
    constructor(message?: string);
}
export declare class PhoneNumberRequiredError extends BadRequestError {
    constructor();
}
export declare class PaymentFailedError extends BadRequestError {
    constructor(message?: string);
}
export declare class PaymentReceiptRequiredError extends BadRequestError {
    constructor(message?: string);
}
export declare class OrderCreationFailedError extends ApiError {
    constructor(message?: string);
}
export declare const isOperationalError: (error: Error) => boolean;
//# sourceMappingURL=errors.d.ts.map