"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkDatabaseConnection = exports.disconnectDatabase = exports.db = exports.getPrismaClient = void 0;
const client_1 = require("@prisma/client");
const logger_1 = require("../utils/logger");
// Singleton instance
let prisma;
// Sanitize DATABASE_URL for logging (hide password)
const sanitizeDatabaseUrl = (url) => {
    if (!url)
        return 'NOT SET';
    try {
        const urlObj = new URL(url);
        if (urlObj.password) {
            urlObj.password = '***';
        }
        return urlObj.toString();
    }
    catch {
        return 'INVALID FORMAT';
    }
};
// Enhance DATABASE_URL with connection parameters for better reliability
const enhanceDatabaseUrl = (url) => {
    if (!url)
        return url;
    try {
        const urlObj = new URL(url);
        const params = new URLSearchParams(urlObj.search);
        // Add connection parameters if not already present
        if (!params.has('connect_timeout')) {
            params.set('connect_timeout', '30'); // Increase timeout to 30 seconds
        }
        if (!params.has('pool_timeout')) {
            params.set('pool_timeout', '30');
        }
        if (!params.has('connection_limit')) {
            params.set('connection_limit', '10');
        }
        // Force SSL with less strict certificate validation (helps with ISP SSL inspection)
        if (!params.has('sslmode')) {
            params.set('sslmode', 'require');
        }
        urlObj.search = params.toString();
        const enhancedUrl = urlObj.toString();
        logger_1.logger.info('Enhanced DATABASE_URL with connection parameters');
        return enhancedUrl;
    }
    catch (error) {
        logger_1.logger.warn('Could not enhance DATABASE_URL, using original', { error });
        return url;
    }
};
// Create and configure Prisma client
const createPrismaClient = () => {
    // Log database connection info (sanitized) at startup
    let dbUrl = process.env.DATABASE_URL || '';
    const sanitizedUrl = sanitizeDatabaseUrl(dbUrl);
    logger_1.logger.info(`Database URL: ${sanitizedUrl}`);
    // Enhance the connection URL with better parameters
    dbUrl = enhanceDatabaseUrl(dbUrl);
    const client = new client_1.PrismaClient({
        datasources: {
            db: {
                url: dbUrl,
            },
        },
        log: [
            { emit: 'event', level: 'query' },
            { emit: 'event', level: 'error' },
            { emit: 'event', level: 'warn' },
        ],
    });
    // Log queries in development
    if (process.env.NODE_ENV === 'development') {
        client.$on('query', (e) => {
            logger_1.logger.debug(`Query: ${e.query}`);
            logger_1.logger.debug(`Duration: ${e.duration}ms`);
        });
    }
    client.$on('error', (e) => {
        logger_1.logger.error('Prisma error:', e);
    });
    client.$on('warn', (e) => {
        logger_1.logger.warn('Prisma warning:', e);
    });
    return client;
};
// Get or create the Prisma client instance
const getPrismaClient = () => {
    if (!prisma) {
        prisma = createPrismaClient();
    }
    return prisma;
};
exports.getPrismaClient = getPrismaClient;
// Export singleton for direct use
exports.db = (0, exports.getPrismaClient)();
// Graceful shutdown
const disconnectDatabase = async () => {
    if (prisma) {
        await prisma.$disconnect();
        logger_1.logger.info('Database connection closed');
    }
};
exports.disconnectDatabase = disconnectDatabase;
// Health check
const checkDatabaseConnection = async () => {
    try {
        await exports.db.$queryRaw `SELECT 1`;
        logger_1.logger.info('✅ Database connection successful');
        return true;
    }
    catch (error) {
        logger_1.logger.error('❌ Database connection check failed:', error);
        const dbUrl = process.env.DATABASE_URL || '';
        const sanitizedUrl = sanitizeDatabaseUrl(dbUrl);
        logger_1.logger.error(`Current DATABASE_URL: ${sanitizedUrl}`);
        logger_1.logger.error('💡 Tip: Ensure DATABASE_URL is set correctly in Render Dashboard → Environment');
        return false;
    }
};
exports.checkDatabaseConnection = checkDatabaseConnection;
__exportStar(require("@prisma/client"), exports);
//# sourceMappingURL=database.config.js.map