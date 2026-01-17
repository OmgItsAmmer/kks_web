"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const env_config_1 = require("./config/env.config");
const logger_1 = require("./utils/logger");
const database_config_1 = require("./config/database.config");
const error_middleware_1 = require("./middleware/error.middleware");
const customer_middleware_1 = require("./middleware/customer.middleware");
const index_1 = __importDefault(require("./routes/index"));
const node_timers_1 = require("node:timers");
const network_config_1 = require("./utils/network.config");
// Configure networking BEFORE any network operations
(0, network_config_1.configureNetworking)();
(0, network_config_1.logNetworkInfo)();
// Create Express app
const app = (0, express_1.default)();
// Trust proxy (for rate limiting behind reverse proxy)
app.set('trust proxy', 1);
// Security middleware
app.use((0, helmet_1.default)({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: env_config_1.config.server.isProduction ? undefined : false,
}));
// CORS configuration
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, etc.)
        if (!origin) {
            callback(null, true);
            return;
        }
        if (env_config_1.config.cors.allowedOrigins.includes(origin) || env_config_1.config.server.isDevelopment) {
            callback(null, true);
        }
        else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-client-info', 'apikey', 'X-Customer-Id'],
}));
// Extract customer ID from header for all requests
app.use(customer_middleware_1.extractCustomerId);
// Compression
app.use((0, compression_1.default)());
// Body parsers
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// Cookie parser
app.use((0, cookie_parser_1.default)());
// Rate limiting
const limiter = (0, express_rate_limit_1.default)({
    windowMs: env_config_1.config.rateLimit.windowMs,
    max: env_config_1.config.rateLimit.maxRequests,
    message: {
        success: false,
        error: 'Too many requests, please try again later.',
        errorCode: 'RATE_LIMIT_EXCEEDED',
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        // Skip rate limiting for health checks
        return req.path === `/api/${env_config_1.config.server.apiVersion}/health`;
    },
});
app.use(limiter);
// Request logging in development
if (env_config_1.config.server.isDevelopment) {
    app.use((req, res, next) => {
        const start = Date.now();
        res.on('finish', () => {
            const duration = Date.now() - start;
            logger_1.logger.http(`${req.method} ${req.path} ${res.statusCode} - ${duration}ms`);
        });
        next();
    });
}
// API routes
app.use(`/api/${env_config_1.config.server.apiVersion}`, index_1.default);
// Root endpoint
app.get('/', (req, res) => {
    res.json({
        name: 'KKS Online Backend API',
        version: '1.0.0',
        status: 'running',
        documentation: `/api/${env_config_1.config.server.apiVersion}/docs`,
        healthCheck: `/api/${env_config_1.config.server.apiVersion}/health`,
    });
});
// 404 handler
app.use(error_middleware_1.notFoundHandler);
// Global error handler
app.use(error_middleware_1.errorHandler);
// Start server
const startServer = async () => {
    try {
        // Test Supabase connectivity first
        const supabaseConnected = await (0, network_config_1.testSupabaseConnectivity)(env_config_1.config.supabase.url);
        if (!supabaseConnected) {
            logger_1.logger.warn('⚠️ Supabase connectivity issues detected. Storage features may not work properly.');
            logger_1.logger.warn('💡 If you are experiencing connection issues, try:');
            logger_1.logger.warn('   1. Change your system DNS to 8.8.8.8 and 8.8.4.4 (Google DNS)');
            logger_1.logger.warn('   2. Use a VPN like Warp or ProtonVPN');
            logger_1.logger.warn('   3. Check if your ISP is blocking Supabase domains');
        }
        // Test database connection on startup
        await (0, database_config_1.checkDatabaseConnection)();
        const server = app.listen(env_config_1.config.server.port, '0.0.0.0', () => {
            logger_1.logger.info(`🚀 Server started in ${env_config_1.config.server.nodeEnv} mode`);
            logger_1.logger.info(`📍 Listening on port ${env_config_1.config.server.port}`);
            logger_1.logger.info(`🔗 API URL: http://localhost:${env_config_1.config.server.port}/api/${env_config_1.config.server.apiVersion}`);
            logger_1.logger.info(`❤️  Health check: http://localhost:${env_config_1.config.server.port}/api/${env_config_1.config.server.apiVersion}/health`);
        });
        // Graceful shutdown
        const gracefulShutdown = (signal) => {
            logger_1.logger.info(`${signal} received. Starting graceful shutdown...`);
            server.close(() => {
                logger_1.logger.info('HTTP server closed');
                process.exit(0);
            });
            // Force close after 10 seconds
            (0, node_timers_1.setTimeout)(() => {
                logger_1.logger.error('Could not close connections in time, forcefully shutting down');
                process.exit(1);
            }, 10000);
        };
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));
        // Handle uncaught exceptions
        process.on('uncaughtException', (error) => {
            logger_1.logger.error('Uncaught Exception:', error);
            gracefulShutdown('UNCAUGHT_EXCEPTION');
        });
        // Handle unhandled promise rejections
        process.on('unhandledRejection', (reason, promise) => {
            logger_1.logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to start server:', error);
        process.exit(1);
    }
};
startServer();
exports.default = app;
//# sourceMappingURL=index.js.map