import { z } from 'zod';
import { config } from '../../../config/env.config';
import { logger } from '../../../utils/logger';
import { ROLES } from '../permissions';

/**
 * Fixed admin accounts (plan 5.1). They live in the ADMIN_ACCOUNTS environment variable as JSON, with
 * bcrypt password hashes only. Nothing about them is stored in the database or in git.
 */
const accountSchema = z.object({
  email: z
    .string()
    .email()
    .transform((e) => e.toLowerCase()),
  name: z.string().min(1),
  role: z.enum(ROLES),
  passwordHash: z.string().min(20),
});
export type AdminAccount = z.infer<typeof accountSchema>;

let cached: AdminAccount[] | null = null;

export const loadAdminAccounts = (): AdminAccount[] => {
  if (cached) return cached;
  const raw = config.admin.accountsJson;
  if (!raw) {
    cached = [];
    return cached;
  }
  try {
    const parsed = z.array(accountSchema).parse(JSON.parse(raw));
    const emails = new Set(parsed.map((a) => a.email));
    if (emails.size !== parsed.length) throw new Error('Duplicate email in ADMIN_ACCOUNTS');
    cached = parsed;
  } catch (error) {
    logger.error('ADMIN_ACCOUNTS is invalid; admin sign-in is disabled', { error: (error as Error).message });
    cached = [];
  }
  return cached;
};

export const findAdminAccount = (email: string): AdminAccount | undefined =>
  loadAdminAccounts().find((a) => a.email === email.trim().toLowerCase());

export const adminSignInConfigured = (): boolean =>
  loadAdminAccounts().length > 0 && Boolean(config.admin.sessionSecret && config.admin.sessionSecret.length >= 32);

/** Test helper */
export const resetAdminAccountsCache = (): void => {
  cached = null;
};
