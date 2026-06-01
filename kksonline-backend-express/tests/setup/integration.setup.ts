import { vi } from 'vitest';

/**
 * Prevent integration tests from opening real DB connections.
 * System tests use the real Prisma client instead.
 */
vi.mock('../../src/config/database.config', () => ({
  db: {
    $queryRaw: vi.fn().mockResolvedValue([{ '?column?': 1 }]),
    $disconnect: vi.fn().mockResolvedValue(undefined),
    $transaction: vi.fn(),
  },
  checkDatabaseConnection: vi.fn().mockResolvedValue(true),
  disconnectDatabase: vi.fn().mockResolvedValue(undefined),
  getPrismaClient: vi.fn(),
}));
