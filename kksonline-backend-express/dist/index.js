"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_timers_1 = require("node:timers");
const env_config_1 = require("./config/env.config");
const logger_1 = require("./utils/logger");
const database_config_1 = require("./config/database.config");
const app_1 = require("./app");
const app = (0, app_1.createApp)();
const startServer = async () => {
    try {
        await (0, database_config_1.checkDatabaseConnection)();
        const server = app.listen(env_config_1.config.server.port, '0.0.0.0', () => {
            logger_1.logger.info(`🚀 Server started in ${env_config_1.config.server.nodeEnv} mode`);
            logger_1.logger.info(`📍 Listening on port ${env_config_1.config.server.port}`);
            logger_1.logger.info(`🔗 API URL: http://localhost:${env_config_1.config.server.port}/api/${env_config_1.config.server.apiVersion}`);
            logger_1.logger.info(`❤️  Health check: http://localhost:${env_config_1.config.server.port}/api/${env_config_1.config.server.apiVersion}/health`);
        });
        const gracefulShutdown = (signal) => {
            logger_1.logger.info(`${signal} received. Starting graceful shutdown...`);
            server.close(() => {
                logger_1.logger.info('HTTP server closed');
                process.exit(0);
            });
            (0, node_timers_1.setTimeout)(() => {
                logger_1.logger.error('Could not close connections in time, forcefully shutting down');
                process.exit(1);
            }, 10000);
        };
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));
        process.on('uncaughtException', (error) => {
            logger_1.logger.error('Uncaught Exception:', error);
            gracefulShutdown('UNCAUGHT_EXCEPTION');
        });
        process.on('unhandledRejection', (reason, promise) => {
            logger_1.logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to start server:', error);
        process.exit(1);
    }
};
if (process.env.NODE_ENV !== 'test') {
    startServer();
}
exports.default = app;
//# sourceMappingURL=index.js.map