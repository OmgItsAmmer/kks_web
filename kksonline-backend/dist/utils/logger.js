import winston from 'winston';
import { config } from '../config/env.config.js';
const { combine, timestamp, printf, colorize, errors } = winston.format;
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
export const logger = winston.createLogger({
    level: config.server.isDevelopment ? 'debug' : 'info',
    format: combine(errors({ stack: true }), timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), logFormat),
    transports: [
        // Console transport
        new winston.transports.Console({
            format: combine(colorize({ all: true }), errors({ stack: true }), timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), logFormat),
        }),
    ],
    // Don't exit on handled exceptions
    exitOnError: false,
});
// Add file transports in production
if (config.server.isProduction) {
    logger.add(new winston.transports.File({
        filename: 'logs/error.log',
        level: 'error',
        maxsize: 5242880, // 5MB
        maxFiles: 5,
    }));
    logger.add(new winston.transports.File({
        filename: 'logs/combined.log',
        maxsize: 5242880, // 5MB
        maxFiles: 5,
    }));
}
// Create a stream object for morgan HTTP logging
export const morganStream = {
    write: (message) => {
        logger.http(message.trim());
    },
};
// Utility functions for structured logging
export const logRequest = (method, path, statusCode, duration) => {
    logger.http(`${method} ${path} ${statusCode} - ${duration}ms`);
};
export const logError = (error, context) => {
    logger.error(error.message, { stack: error.stack, ...context });
};
export const logInfo = (message, metadata) => {
    logger.info(message, metadata);
};
export const logDebug = (message, metadata) => {
    logger.debug(message, metadata);
};
export const logWarn = (message, metadata) => {
    logger.warn(message, metadata);
};
//# sourceMappingURL=logger.js.map