import { setTimeout } from 'node:timers';

import { config } from './config/env.config';
import { logger } from './utils/logger';
import { checkDatabaseConnection } from './config/database.config';
import { createApp } from './app';

const app = createApp();

const startServer = async () => {
  try {
    await checkDatabaseConnection();

    const server = app.listen(config.server.port, '0.0.0.0', () => {
      logger.info(`🚀 Server started in ${config.server.nodeEnv} mode`);
      logger.info(`📍 Listening on port ${config.server.port}`);
      logger.info(`🔗 API URL: http://localhost:${config.server.port}/api/${config.server.apiVersion}`);
      logger.info(`❤️  Health check: http://localhost:${config.server.port}/api/${config.server.apiVersion}/health`);
    });

    const gracefulShutdown = (signal: string) => {
      logger.info(`${signal} received. Starting graceful shutdown...`);
      server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
      });

      setTimeout(() => {
        logger.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      gracefulShutdown('UNCAUGHT_EXCEPTION');
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export default app;
