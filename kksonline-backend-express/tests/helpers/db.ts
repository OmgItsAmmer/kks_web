import { disconnectDatabase } from '../../src/config/database.config';

export async function teardownDatabase(): Promise<void> {
  await disconnectDatabase();
}

export async function isDatabaseAvailable(): Promise<boolean> {
  try {
    const { checkDatabaseConnection } = await import('../../src/config/database.config');
    return await checkDatabaseConnection();
  } catch {
    return false;
  }
}

export const systemTestTimeout = 30_000;
