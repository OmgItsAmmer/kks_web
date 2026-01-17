"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logWarn = exports.logDebug = exports.logInfo = exports.logError = exports.logRequest = exports.morganStream = exports.logger = void 0;
const winston_1 = __importDefault(require("winston"));
const env_config_js_1 = require("../config/env.config.js");
const { combine, timestamp, printf, colorize, errors } = winston_1.default.format;
// Custom log format
const logFormat = printf(({ level, message, timestamp, stack, ...metadata }) => {
    let log = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(metadata).length > 0) {
        log += ` ${JSON.stringify(metadata)}`;
    }
    if (stack) {
        log += `\n${stack}`;
    }
    return log;
});
// Create logger instance
exports.logger = winston_1.default.createLogger({
    level: env_config_js_1.config.server.isDevelopment ? 'debug' : 'info',
    format: combine(errors({ stack: true }), timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), logFormat),
    transports: [
        // Console transport
        new winston_1.default.transports.Console({
            format: combine(colorize({ all: true }), errors({ stack: true }), timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), logFormat),
        }),
    ],
    // Don't exit on handled exceptions
    exitOnError: false,
});
// Add file transports in production
if (env_config_js_1.config.server.isProduction) {
    exports.logger.add(new winston_1.default.transports.File({
        filename: 'logs/error.log',
        level: 'error',
        maxsize: 5242880, // 5MB
        maxFiles: 5,
    }));
    exports.logger.add(new winston_1.default.transports.File({
        filename: 'logs/combined.log',
        maxsize: 5242880, // 5MB
        maxFiles: 5,
    }));
}
// Create a stream object for morgan HTTP logging
exports.morganStream = {
    write: (message) => {
        exports.logger.http(message.trim());
    },
};
// Utility functions for structured logging
const logRequest = (method, path, statusCode, duration) => {
    exports.logger.http(`${method} ${path} ${statusCode} - ${duration}ms`);
};
exports.logRequest = logRequest;
const logError = (error, context) => {
    exports.logger.error(error.message, { stack: error.stack, ...context });
};
exports.logError = logError;
const logInfo = (message, metadata) => {
    exports.logger.info(message, metadata);
};
exports.logInfo = logInfo;
const logDebug = (message, metadata) => {
    exports.logger.debug(message, metadata);
};
exports.logDebug = logDebug;
const logWarn = (message, metadata) => {
    exports.logger.warn(message, metadata);
};
exports.logWarn = logWarn;
//# sourceMappingURL=logger.js.map