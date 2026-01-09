// Success response helper
export const sendSuccess = (res, data, message, statusCode = 200) => {
    const response = {
        success: true,
        data,
        message,
    };
    return res.status(statusCode).json(response);
};
// Created response helper (201)
export const sendCreated = (res, data, message = 'Resource created successfully') => {
    return sendSuccess(res, data, message, 201);
};
// No content response helper (204)
export const sendNoContent = (res) => {
    return res.status(204).send();
};
// Paginated response helper
export const sendPaginated = (res, data, pagination, message) => {
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
    return res.status(200).json(response);
};
// Error response helper
export const sendError = (res, message, statusCode = 500, errorCode) => {
    const response = {
        success: false,
        error: message,
        errorCode,
    };
    return res.status(statusCode).json(response);
};
// Validation error response helper
export const sendValidationError = (res, errors, message = 'Validation failed') => {
    return res.status(422).json({
        success: false,
        error: message,
        errorCode: 'VALIDATION_ERROR',
        errors,
    });
};
// Not found response helper
export const sendNotFound = (res, message = 'Resource not found') => {
    return sendError(res, message, 404, 'NOT_FOUND');
};
// Unauthorized response helper
export const sendUnauthorized = (res, message = 'Unauthorized') => {
    return sendError(res, message, 401, 'UNAUTHORIZED');
};
// Forbidden response helper
export const sendForbidden = (res, message = 'Forbidden') => {
    return sendError(res, message, 403, 'UNAUTHORIZED');
};
// Conflict response helper
export const sendConflict = (res, message = 'Resource already exists') => {
    return sendError(res, message, 409, 'ALREADY_EXISTS');
};
//# sourceMappingURL=response.js.map