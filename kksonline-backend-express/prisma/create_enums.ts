import { db } from '../src/config/database.config.ts';
import { logger } from '../src/utils/logger.ts';

/**
 * Create missing enum types in the database
 * Run this script once to fix the enum type errors
 */
async function createEnums() {
  try {
    logger.info('Creating enum types...');

    // Create OrderStatus enum
    await db.$executeRawUnsafe(`
      DO $$ 
      BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OrderStatus') THEN
              CREATE TYPE "OrderStatus" AS ENUM (
                  'pending',
                  'ready',
                  'confirmed',
                  'cancelled',
                  'delivered',
                  'processing',
                  'completed'
              );
              RAISE NOTICE 'OrderStatus enum created';
          ELSE
              RAISE NOTICE 'OrderStatus enum already exists';
          END IF;
      END $$;
    `);

    // Create SeverityLevel enum
    await db.$executeRawUnsafe(`
      DO $$ 
      BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SeverityLevel') THEN
              CREATE TYPE "SeverityLevel" AS ENUM (
                  'info',
                  'warning',
                  'error',
                  'critical'
              );
              RAISE NOTICE 'SeverityLevel enum created';
          ELSE
              RAISE NOTICE 'SeverityLevel enum already exists';
          END IF;
      END $$;
    `);

    logger.info('✅ Enum types created successfully!');
    
    // Verify enums exist
    const enums = await db.$queryRawUnsafe<Array<{ typname: string }>>(
      `SELECT typname FROM pg_type WHERE typname IN ('OrderStatus', 'SeverityLevel')`
    );
    
    logger.info('Existing enums:', enums.map(e => e.typname));
    
  } catch (error) {
    logger.error('❌ Error creating enum types:', error);
    throw error;
  } finally {
    await db.$disconnect();
  }
}

// Run the migration
createEnums()
  .then(() => {
    logger.info('Migration completed');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('Migration failed:', error);
    process.exit(1);
  });
