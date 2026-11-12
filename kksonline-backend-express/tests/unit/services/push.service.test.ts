import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const sendNotification = vi.fn();
class FakeWebPushError extends Error {
  constructor(public statusCode: number) {
    super(`push failed ${statusCode}`);
  }
}
vi.mock('web-push', () => ({
  default: { setVapidDetails: vi.fn(), sendNotification: (...a: unknown[]) => sendNotification(...a) },
  WebPushError: FakeWebPushError,
}));

const subs = [
  { subscription_id: 1, admin_email: 'a@x.com', endpoint: 'https://push.example/1', p256dh: 'k1', auth: 'a1' },
  { subscription_id: 2, admin_email: 'b@x.com', endpoint: 'https://push.example/2', p256dh: 'k2', auth: 'a2' },
];
const db = {
  adminPushSubscription: {
    findMany: vi.fn(async ({ where }: any = {}) => (where?.admin_email ? subs.filter((s) => s.admin_email === where.admin_email) : subs)),
    deleteMany: vi.fn(async () => ({ count: 1 })),
    updateMany: vi.fn(async () => ({ count: 1 })),
  },
  notification: { count: vi.fn() },
};
vi.mock('../../../src/config/database.config', () => ({ db }));
let accountEmails = ['a@x.com', 'b@x.com'];
vi.mock('../../../src/modules/admin/auth/accounts', () => ({ loadAdminAccounts: () => accountEmails.map((email) => ({ email })) }));
vi.mock('../../../src/utils/logger', () => ({ logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() } }));

const pushConfig = { publicKey: 'pub' as string | undefined, privateKey: 'priv' as string | undefined, subject: 'mailto:t@x.com' };
vi.mock('../../../src/config/env.config', () => ({ config: { push: pushConfig } }));

const { sendAdminPush, notifyAdminsAfterCommit } = await import('../../../src/services/push.service');

beforeEach(() => {
  vi.clearAllMocks();
  pushConfig.publicKey = 'pub';
  pushConfig.privateKey = 'priv';
  accountEmails = ['a@x.com', 'b@x.com'];
});
afterEach(() => vi.useRealTimers());

describe('push.service', () => {
  it('sends nothing when VAPID keys are missing', async () => {
    pushConfig.privateKey = undefined;
    expect(await sendAdminPush({ kind: 'new_order', title: 'x' })).toBe(0);
    expect(db.adminPushSubscription.findMany).not.toHaveBeenCalled();
  });

  it('delivers to every browser and forgets ones the push service says are gone', async () => {
    sendNotification.mockResolvedValueOnce({}).mockRejectedValueOnce(new FakeWebPushError(410));
    const delivered = await sendAdminPush({ kind: 'new_order', title: 'New order #5', url: '/orders/5' });
    expect(delivered).toBe(1);
    const payload = JSON.parse(sendNotification.mock.calls[0][1]);
    expect(payload).toMatchObject({ kind: 'new_order', title: 'New order #5', url: '/orders/5', sticky: true });
    expect(sendNotification.mock.calls[0][2]).toMatchObject({ urgency: 'high' });
    expect(db.adminPushSubscription.deleteMany).toHaveBeenCalledWith({ where: { subscription_id: { in: [2] } } });
  });

  it('keeps a subscription after a temporary failure, and never throws', async () => {
    sendNotification.mockRejectedValue(new FakeWebPushError(503));
    await expect(sendAdminPush({ kind: 'low_stock', title: 'Low' })).resolves.toBe(0);
    expect(db.adminPushSubscription.deleteMany).not.toHaveBeenCalled();
  });

  it('stops alerting a removed admin account and deletes its subscription', async () => {
    accountEmails = ['a@x.com'];
    sendNotification.mockResolvedValue({});
    expect(await sendAdminPush({ kind: 'new_order', title: 'x' })).toBe(1);
    expect(db.adminPushSubscription.deleteMany).toHaveBeenCalledWith({ where: { subscription_id: { in: [2] } } });
  });

  it('never prunes anyone when no admin accounts load (misconfigured ADMIN_ACCOUNTS)', async () => {
    accountEmails = [];
    sendNotification.mockResolvedValue({});
    expect(await sendAdminPush({ kind: 'new_order', title: 'x' })).toBe(2);
    expect(db.adminPushSubscription.deleteMany).not.toHaveBeenCalled();
  });

  it('can target one admin only (test alert)', async () => {
    sendNotification.mockResolvedValue({});
    expect(await sendAdminPush({ kind: 'test', title: 't' }, 'b@x.com')).toBe(1);
    expect(sendNotification).toHaveBeenCalledTimes(1);
  });

  it('waits for the transaction to commit before pushing, and skips a rolled-back one', async () => {
    vi.useFakeTimers();
    sendNotification.mockResolvedValue({});
    db.notification.count.mockResolvedValueOnce(0).mockResolvedValueOnce(1);
    notifyAdminsAfterCommit([10], { kind: 'low_stock', title: 'Low stock' });
    await vi.advanceTimersByTimeAsync(600);
    expect(sendNotification).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(3_000);
    await vi.waitFor(() => expect(sendNotification).toHaveBeenCalledTimes(2));

    sendNotification.mockClear();
    db.notification.count.mockResolvedValue(0);
    notifyAdminsAfterCommit([11], { kind: 'low_stock', title: 'Rolled back' });
    await vi.advanceTimersByTimeAsync(40_000);
    expect(db.notification.count).toHaveBeenCalledTimes(2 + 4);
    expect(sendNotification).not.toHaveBeenCalled();
  });
});
