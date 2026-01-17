"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendConflict = exports.sendForbidden = exports.sendUnauthorized = exports.sendNotFound = exports.sendValidationError = exports.sendError = exports.sendPaginated = exports.sendNoContent = exports.sendCreated = exports.sendSuccess = void 0;
/**
 * Safely serialize data by converting BigInt values to numbers.
 *
 * NOTE:
 * - JSON.stringify cannot handle BigInt directly.
 * - This helper walks the response payload and converts all BigInt
 *   instances to regular numbers before sending the response.
 */
const serializeForJson = (value) => {
    return JSON.parse(JSON.stringify(value, (_key, val) => {
        if (typeof val === 'bigint') {
            // Convert BigInt to number. If you ever expect values
            // larger than Number.MAX_SAFE_INTEGER, consider using
            // val.toString() instead.
            return Number(val);
        }
        return val;
    }));
};
// Success response helper
const sendSuccess = (res, data, message, statusCode = 200) => {
    const response = {
        success: true,
        data,
        message,
    };
    const safeResponse = serializeForJson(response);
    return res.status(statusCode).json(safeResponse);
};
exports.sendSuccess = sendSuccess;
// Created response helper (201)
const sendCreated = (res, data, message = 'Resource created successfully') => {
    return (0, exports.sendSuccess)(res, data, message, 201);
};
exports.sendCreated = sendCreated;
// No content response helper (204)
const sendNoContent = (res) => {
    return res.status(204).send();
};
exports.sendNoContent = sendNoContent;
// Paginated response helper
const sendPaginated = (res, data, pagination, message) => {
    const totalPages = Math.ceil(pagination.total / pagination.pageSize);
    const response = {
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
exports.sendPaginated = sendPaginated;
// Error response helper
const sendError = (res, message, statusCode = 500, errorCode) => {
    const response = {
        success: false,
        error: message,
        errorCode,
    };
    const safeResponse = serializeForJson(response);
    return res.status(statusCode).json(safeResponse);
};
exports.sendError = sendError;
// Validation error response helper
const sendValidationError = (res, errors, message = 'Validation failed') => {
    const payload = {
        success: false,
        error: message,
        errorCode: 'VALIDATION_ERROR',
        errors,
    };
    const safePayload = serializeForJson(payload);
    return res.status(422).json(safePayload);
};
exports.sendValidationError = sendValidationError;
// Not found response helper
const sendNotFound = (res, message = 'Resource not found') => {
    return (0, exports.sendError)(res, message, 404, 'NOT_FOUND');
};
exports.sendNotFound = sendNotFound;
// Unauthorized response helper
const sendUnauthorized = (res, message = 'Unauthorized') => {
    return (0, exports.sendError)(res, message, 401, 'UNAUTHORIZED');
};
exports.sendUnauthorized = sendUnauthorized;
// Forbidden response helper
const sendForbidden = (res, message = 'Forbidden') => {
    return (0, exports.sendError)(res, message, 403, 'UNAUTHORIZED');
};
exports.sendForbidden = sendForbidden;
// Conflict response helper
const sendConflict = (res, message = 'Resource already exists') => {
    return (0, exports.sendError)(res, message, 409, 'ALREADY_EXISTS');
};
exports.sendConflict = sendConflict;
//# sourceMappingURL=response.js.map