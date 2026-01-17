"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.asyncHandler = exports.notFoundHandler = exports.errorHandler = void 0;
const errors_1 = require("../utils/errors");
const logger_1 = require("../utils/logger");
const env_config_1 = require("../config/env.config");
/**
 * Global error handling middleware
 */
const errorHandler = (err, req, res, _next) => {
    // Log the error
    if ((0, errors_1.isOperationalError)(err)) {
        logger_1.logger.warn('Operational error', {
            error: err.message,
            path: req.path,
            method: req.method,
        });
    }
    else {
        logger_1.logger.error('Unexpected error', {
            error: err.message,
            stack: err.stack,
            path: req.path,
            method: req.method,
        });
    }
    // Handle API errors
    if (err instanceof errors_1.ApiError) {
        const response = {
            success: false,
            error: err.message,
            errorCode: err.errorCode,
        };
        // Add validation errors if present
        if (err instanceof errors_1.ValidationError) {
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
    if ('code' in err && typeof err.code === 'string') {
        const pgError = err;
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
    const message = env_config_1.config.server.isProduction
        ? 'Internal server error'
        : err.message;
    return res.status(statusCode).json({
        success: false,
        error: message,
        errorCode: 'INTERNAL_ERROR',
        ...(env_config_1.config.server.isDevelopment && { stack: err.stack }),
    });
};
exports.errorHandler = errorHandler;
/**
 * 404 Not Found handler
 */
const notFoundHandler = (req, res, _next) => {
    return res.status(404).json({
        success: false,
        error: `Route ${req.method} ${req.path} not found`,
        errorCode: 'NOT_FOUND',
    });
};
exports.notFoundHandler = notFoundHandler;
/**
 * Async handler wrapper to catch errors in async route handlers
 */
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
exports.asyncHandler = asyncHandler;
//# sourceMappingURL=error.middleware.js.map