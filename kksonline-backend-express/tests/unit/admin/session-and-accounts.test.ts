import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { beforeAll, describe, expect, it, vi } from 'vitest';

const hash = bcrypt.hashSync('a-long-test-password', 4);

vi.mock('../../../src/config/env.config', () => ({
  config: {
    server: { isProduction: false },
    admin: {
      accountsJson: JSON.stringify([
        { email: 'Owner@Example.com', name: 'Owner', role: 'owner', passwordHash: hash },
        { email: 'staff@example.com', name: 'Staff', role: 'staff', passwordHash: hash },
      ]),
      sessionSecret: 'unit-test-session-secret-0123456789-abcdef',
      cookieDomain: undefined,
      origin: 'http://localhost:5174',
    },
  },
}));
vi.mock('../../../src/utils/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } }));

describe('fixed admin accounts', () => {
  it('finds accounts case-insensitively and keeps roles', async () => {
    const { findAdminAccount } = await import('../../../src/modules/admin/auth/accounts');
    expect(findAdminAccount('owner@example.COM')?.role).toBe('owner');
    expect(findAdminAccount('  staff@example.com ')?.role).toBe('staff');
    expect(findAdminAccount('nobody@example.com')).toBeUndefined();
  });

  it('checks passwords against the bcrypt hash', async () => {
    const { findAdminAccount } = await import('../../../src/modules/admin/auth/accounts');
    const account = findAdminAccount('owner@example.com')!;
    expect(await bcrypt.compare('a-long-test-password', account.passwordHash)).toBe(true);
    expect(await bcrypt.compare('wrong', account.passwordHash)).toBe(false);
  });

  it('reports sign-in as configured when accounts and a long secret exist', async () => {
    const { adminSignInConfigured } = await import('../../../src/modules/admin/auth/accounts');
    expect(adminSignInConfigured()).toBe(true);
  });
});

describe('admin session token', () => {
  let session: typeof import('../../../src/modules/admin/auth/session');
  beforeAll(async () => {
    session = await import('../../../src/modules/admin/auth/session');
  });

  it('round-trips email and role', () => {
    const token = session.signSession({ email: 'owner@example.com', role: 'owner' });
    expect(session.verifySession(token)).toMatchObject({ email: 'owner@example.com', role: 'owner' });
  });

  it('rejects a token signed with another secret', () => {
    const forged = jwt.sign({ email: 'owner@example.com', role: 'owner' }, 'some-other-secret-some-other-secret-1234', { issuer: 'kks-admin', audience: 'kks-admin' });
    expect(session.verifySession(forged)).toBeNull();
  });

  it('rejects a customer token (different audience) even if the secret were shared', () => {
    const customerLike = jwt.sign({ email: 'a@b.c', role: 'owner' }, 'unit-test-session-secret-0123456789-abcdef');
    expect(session.verifySession(customerLike)).toBeNull();
  });

  it('rejects an expired token', () => {
    const expired = jwt.sign({ email: 'owner@example.com', role: 'owner' }, 'unit-test-session-secret-0123456789-abcdef', { issuer: 'kks-admin', audience: 'kks-admin', expiresIn: -10 });
    expect(session.verifySession(expired)).toBeNull();
  });

  it('rejects garbage', () => {
    expect(session.verifySession('not-a-token')).toBeNull();
  });
});
