"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const env_config_1 = require("./config/env.config");
const error_middleware_1 = require("./middleware/error.middleware");
const customer_middleware_1 = require("./middleware/customer.middleware");
const index_1 = __importDefault(require("./routes/index"));
const createApp = () => {
    const app = (0, express_1.default)();
    app.set('trust proxy', 1);
    app.use((0, helmet_1.default)({
        crossOriginResourcePolicy: { policy: 'cross-origin' },
        contentSecurityPolicy: env_config_1.config.server.isProduction ? undefined : false,
    }));
    app.use((0, cors_1.default)({
        origin: (origin, callback) => {
            if (!origin) {
                callback(null, true);
                return;
            }
            if (env_config_1.config.cors.allowedOrigins.includes(origin) || env_config_1.config.server.isDevelopment || env_config_1.config.server.nodeEnv === 'test') {
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
    app.use(customer_middleware_1.extractCustomerId);
    app.use((0, compression_1.default)());
    app.use(express_1.default.json({ limit: '10mb' }));
    app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
    app.use((0, cookie_parser_1.default)());
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
        skip: (req) => req.path === `/api/${env_config_1.config.server.apiVersion}/health`,
    });
    app.use(limiter);
    app.use(`/api/${env_config_1.config.server.apiVersion}`, index_1.default);
    app.get('/', (req, res) => {
        res.json({
            name: 'KKS Online Backend API',
            version: '1.0.0',
            status: 'running',
            documentation: `/api/${env_config_1.config.server.apiVersion}/docs`,
            healthCheck: `/api/${env_config_1.config.server.apiVersion}/health`,
        });
    });
    app.use(error_middleware_1.notFoundHandler);
    app.use(error_middleware_1.errorHandler);
    return app;
};
exports.createApp = createApp;
exports.default = exports.createApp;
//# sourceMappingURL=app.js.map