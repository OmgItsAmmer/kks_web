import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

// Singleton instance
let prisma: PrismaClient;

// Sanitize DATABASE_URL for logging (hide password)
const sanitizeDatabaseUrl = (url: string): string => {
  if (!url) return 'NOT SET';
  try {
    const urlObj = new URL(url);
    if (urlObj.password) {
      urlObj.password = '***';
    }
    return urlObj.toString();
  } catch {
    return 'INVALID FORMAT';
  }
};

// Create and configure Prisma client
const createPrismaClient = (): PrismaClient => {
  // Log database connection info (sanitized) at startup
  const dbUrl = process.env.DATABASE_URL || '';
  const sanitizedUrl = sanitizeDatabaseUrl(dbUrl);
  logger.info(`Database URL: ${sanitizedUrl}`);
  
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
    logger.info('✅ Database connection successful');
    return true;
  } catch (error) {
    logger.error('❌ Database connection check failed:', error);
    const dbUrl = process.env.DATABASE_URL || '';
    const sanitizedUrl = sanitizeDatabaseUrl(dbUrl);
    logger.error(`Current DATABASE_URL: ${sanitizedUrl}`);
    logger.error('💡 Tip: Ensure DATABASE_URL is set correctly in Render Dashboard → Environment');
    return false;
  }
};

// Export types for convenience
export type { PrismaClient };
export * from '@prisma/client';

