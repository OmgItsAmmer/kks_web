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
// Create and configure Prisma client
const createPrismaClient = () => {
    const client = new client_1.PrismaClient({
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
        return true;
    }
    catch (error) {
        logger_1.logger.error('Database connection check failed:', error);
        return false;
    }
};
exports.checkDatabaseConnection = checkDatabaseConnection;
__exportStar(require("@prisma/client"), exports);
//# sourceMappingURL=database.config.js.map