import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger.ts';

// Singleton instance
let prisma: PrismaClient;

// Create and configure Prisma client
const createPrismaClient = (): PrismaClient => {
  const client = new PrismaClient({
    log: [
      { emit: 'event', level: 'query' },
      { emit: 'event', level: 'error' },
      { emit: 'event', level: 'warn' },
    ],
  });

  // Log queries in development
  if (process.env.NODE_ENV === 'development') {
    client.$on('query', (e) => {
      logger.debug(`Query: ${e.query}`);
      logger.debug(`Duration: ${e.duration}ms`);
    });
  }

  client.$on('error', (e) => {
    logger.error('Prisma error:', e);
  });

  client.$on('warn', (e) => {
    logger.warn('Prisma warning:', e);
  });

  return client;
};

// Get or create the Prisma client instance
export const getPrismaClient = (): PrismaClient => {
  if (!prisma) {
    prisma = createPrismaClient();
  }
  return prisma;
};

// Export singleton for direct use
export const db = getPrismaClient();

// Graceful shutdown
export const disconnectDatabase = async (): Promise<void> => {
  if (prisma) {
    await prisma.$disconnect();
    logger.info('Database connection closed');
  }
};

// Health check
export const checkDatabaseConnection = async (): Promise<boolean> => {
  try {
    await db.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    logger.error('Database connection check failed:', error);
    return false;
  }
};

// Export types for convenience
export type { PrismaClient };
export * from '@prisma/client';

