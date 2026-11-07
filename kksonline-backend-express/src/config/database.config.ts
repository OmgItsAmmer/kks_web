import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

// Singleton instance
let prisma: ReturnType<typeof createPrismaClient> | undefined;

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

/**
 * Neon tuning (plan 4.2): the pooled endpoint speaks pgbouncer, Prisma's engine does not
 * support `channel_binding`, and a sleeping database needs a long first-connection timeout.
 */
export const tuneDatabaseUrl = (url: string): string => {
  try {
    const u = new URL(url);
    u.searchParams.delete('channel_binding');
    if (u.hostname.includes('-pooler') && !u.searchParams.has('pgbouncer')) u.searchParams.set('pgbouncer', 'true');
    if (!u.searchParams.has('connect_timeout')) u.searchParams.set('connect_timeout', '20');
    if (!u.searchParams.has('pool_timeout')) u.searchParams.set('pool_timeout', '20');
    // A connection that went silent (idle socket dropped by a network device) fails after 20 s instead of hanging;
    // the retry wrapper below then reconnects (P1008 is retryable).
    if (!u.searchParams.has('socket_timeout')) u.searchParams.set('socket_timeout', '20');
    if (!u.searchParams.has('connection_limit')) u.searchParams.set('connection_limit', process.env.DB_POOL_SIZE || '8');
    return u.toString();
  } catch {
    return url;
  }
};

// Errors that mean "the database is waking up or the connection dropped": safe to retry reads and writes
// that never reached the server (P1001/P1002/P1008/P1017).
const RETRYABLE_CODES = new Set(['P1001', 'P1002', 'P1008', 'P1017']);
const RETRY_DELAYS_MS = [400, 1200, 2500];
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

// Create and configure Prisma client
const createPrismaClient = () => {
  // Log database connection info (sanitized) at startup
  const dbUrl = process.env.DATABASE_URL || '';
  const sanitizedUrl = sanitizeDatabaseUrl(dbUrl);
  logger.info(`Database URL: ${sanitizedUrl}`);
  
  const client = new PrismaClient({
    datasources: { db: { url: tuneDatabaseUrl(dbUrl) } },
    // Multi-step stock changes run many small queries; give them room (the default is 5 s)
    transactionOptions: { maxWait: 10_000, timeout: 30_000 },
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

  return client.$extends({
    query: {
      async $allOperations({ args, query }) {
        for (let attempt = 0; ; attempt++) {
          try {
            return await query(args);
          } catch (error) {
            const code = (error as { code?: string }).code;
            if (!code || !RETRYABLE_CODES.has(code) || attempt >= RETRY_DELAYS_MS.length) throw error;
            logger.warn('Database not reachable, retrying (sleeping Neon compute?)', { code, attempt: attempt + 1 });
            await sleep(RETRY_DELAYS_MS[attempt] as number);
          }
        }
      },
    },
  });
};

type ExtendedClient = ReturnType<typeof createPrismaClient>;

/** The client handed to `db.$transaction(async (tx) => ...)`. */
export type DbTx = Omit<ExtendedClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;

// Get or create the Prisma client instance
export const getPrismaClient = (): ExtendedClient => {
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

// Health check (/health/db and startup only; the plain /health never touches the database)
export const checkDatabaseConnection = async (): Promise<boolean> => {
  try {
    await db.$queryRaw`SELECT 1`;
    logger.debug('Database connection successful');
    return true;
  } catch (error) {
    logger.error('❌ Database connection check failed:', error);
    const dbUrl = process.env.DATABASE_URL || '';
    const sanitizedUrl = sanitizeDatabaseUrl(dbUrl);
    logger.error(`Current DATABASE_URL: ${sanitizedUrl}`);
    logger.error('Tip: check DATABASE_URL (pooled Neon URL) in the host environment settings');
    return false;
  }
};

// Export types for convenience
export type { PrismaClient };
export * from '@prisma/client';

