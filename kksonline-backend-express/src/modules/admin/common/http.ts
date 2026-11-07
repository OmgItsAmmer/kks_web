import { z } from 'zod';
import { Prisma } from '@prisma/client';

export const paging = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

export const idParams = z.object({ id: z.coerce.number().int().positive() });

export const skipTake = (page: number, pageSize: number) => ({ skip: (page - 1) * pageSize, take: pageSize });

export const boolQuery = z
  .enum(['true', 'false'])
  .transform((v) => v === 'true')
  .optional();

/** Money arrives as a number or a numeric string and is stored as exact decimals. */
export const money = z
  .union([z.number(), z.string().regex(/^-?\d+(\.\d{1,2})?$/)])
  .transform((v) => new Prisma.Decimal(v));

export const nonNegativeMoney = money.refine((d) => d.greaterThanOrEqualTo(0), 'Must not be negative');

/** ISO timestamp of the row as the client last saw it, for optimistic concurrency. */
export const expectedUpdatedAt = z.string().datetime({ offset: true }).optional();

export const sameInstant = (a: Date | null | undefined, iso: string | undefined): boolean => {
  if (!iso) return true; // client chose not to check
  if (!a) return true;
  return a.getTime() === new Date(iso).getTime();
};
