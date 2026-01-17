import { PrismaClient } from '@prisma/client';
export declare const getPrismaClient: () => PrismaClient;
export declare const db: PrismaClient<import(".prisma/client").Prisma.PrismaClientOptions, never, import("@prisma/client/runtime/library").DefaultArgs>;
export declare const disconnectDatabase: () => Promise<void>;
export declare const checkDatabaseConnection: () => Promise<boolean>;
export type { PrismaClient };
export * from '@prisma/client';
//# sourceMappingURL=database.config.d.ts.map