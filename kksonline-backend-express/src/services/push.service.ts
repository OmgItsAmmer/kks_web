import webpush, { type PushSubscription, WebPushError } from 'web-push';
import { db } from '../config/database.config';
import { config } from '../config/env.config';
import { loadAdminAccounts } from '../modules/admin/auth/accounts';
import { logger } from '../utils/logger';

/**
 * Admin desktop alerts (Web Push). The admin panel is often minimised, and the polling bell only
 * runs while its tab is visible, so urgent events (a new order, stock running out, a customer
 * cancelling) are also pushed through the browser's push service. The service worker in the admin
 * app (admin-frontend/public/sw.js) shows them as normal Windows/macOS notifications even when the
 * tab is in the background.
 *
 * Every function here is fire-and-forget: a push failure is logged and never fails the request
 * that caused it. With no VAPID keys configured, nothing is sent.
 */

export type AdminPushKind = 'new_order' | 'order_cancelled' | 'low_stock' | 'usage_warning' | 'test';

export interface AdminPushMessage {
  kind: AdminPushKind;
  title: string;
  body?: string;
  /** Admin app path to open when the notification is clicked, e.g. `/orders/42`. */
  url?: string;
  /** Notifications with the same tag replace each other instead of stacking. */
  tag?: string;
}

/** Orders stay on screen until the admin reacts; the rest fade like normal notifications. */
const STICKY: ReadonlySet<AdminPushKind> = new Set(['new_order', 'order_cancelled', 'test']);

let configured = false;
export const pushEnabled = (): boolean => {
  const { publicKey, privateKey, subject } = config.push;
  if (!publicKey || !privateKey) return false;
  if (!configured) {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    configured = true;
  }
  return true;
};

export const pushPublicKey = (): string | null => (pushEnabled() ? (config.push.publicKey ?? null) : null);

/** Sends to every subscribed admin browser and returns how many accepted it. Never throws. */
export const sendAdminPush = async (msg: AdminPushMessage, onlyEmail?: string): Promise<number> => {
  if (!pushEnabled()) return 0;
  try {
    const all = await db.adminPushSubscription.findMany({ where: onlyEmail ? { admin_email: onlyEmail } : undefined });
    // A removed admin account stops getting alerts at once. (Skipped if no accounts load at all, so a
    // broken ADMIN_ACCOUNTS value never wipes everyone's subscriptions.)
    const accounts = new Set(loadAdminAccounts().map((a) => a.email));
    const removed = accounts.size > 0 ? all.filter((s) => !accounts.has(s.admin_email.toLowerCase())) : [];
    const subs = all.filter((s) => !removed.includes(s));
    if (removed.length > 0) {
      await db.adminPushSubscription.deleteMany({ where: { subscription_id: { in: removed.map((s) => s.subscription_id) } } });
    }
    if (subs.length === 0) return 0;

    const payload = JSON.stringify({ ...msg, url: msg.url ?? '/', sticky: STICKY.has(msg.kind), sentAt: Date.now() });
    const urgent = msg.kind === 'new_order' || msg.kind === 'order_cancelled';
    const delivered: number[] = [];
    const gone: number[] = [];

    await Promise.all(
      subs.map(async (s) => {
        const sub: PushSubscription = { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } };
        try {
          // TTL: if the PC is off, the push service holds it this long and delivers it on wake-up.
          await webpush.sendNotification(sub, payload, { TTL: 24 * 3600, urgency: urgent ? 'high' : 'normal', timeout: 10_000 });
          delivered.push(s.subscription_id);
        } catch (error) {
          // 404/410: the browser dropped this subscription (cleared data, revoked permission). Forget it.
          if (error instanceof WebPushError && (error.statusCode === 404 || error.statusCode === 410)) {
            gone.push(s.subscription_id);
          } else {
            logger.warn('Admin push failed', { subscriptionId: s.subscription_id, status: (error as WebPushError).statusCode, error: (error as Error).message });
          }
        }
      })
    );

    await Promise.all([
      gone.length ? db.adminPushSubscription.deleteMany({ where: { subscription_id: { in: gone } } }) : null,
      delivered.length ? db.adminPushSubscription.updateMany({ where: { subscription_id: { in: delivered } }, data: { last_success_at: new Date() } }) : null,
    ]);
    return delivered.length;
  } catch (error) {
    logger.warn('Admin push error', { kind: msg.kind, error: (error as Error).message });
    return 0;
  }
};

/** Fire and forget, for use right after the change has been committed. */
export const notifyAdmins = (msg: AdminPushMessage): void => {
  void sendAdminPush(msg);
};

/**
 * For notifications written inside a caller's transaction (low stock): the transaction may still
 * roll back, so wait until the rows are visible from outside it, then push. Gives up quietly if they
 * never appear (the transaction was rolled back). The last check is after the 30 s transaction timeout.
 */
const COMMIT_CHECKS_MS = [500, 3_000, 10_000, 32_000];

export const notifyAdminsAfterCommit = (notificationIds: number[], msg: AdminPushMessage): void => {
  if (notificationIds.length === 0 || !pushEnabled()) return;
  const check = (attempt: number): void => {
    const timer = setTimeout(() => {
      db.notification
        .count({ where: { notification_id: { in: notificationIds } } })
        .then((found) => {
          if (found > 0) notifyAdmins(msg);
          else if (attempt + 1 < COMMIT_CHECKS_MS.length) check(attempt + 1);
        })
        .catch((error: Error) => logger.warn('Admin push commit check failed', { error: error.message }));
    }, (COMMIT_CHECKS_MS[attempt] as number) - (attempt > 0 ? (COMMIT_CHECKS_MS[attempt - 1] as number) : 0));
    timer.unref?.();
  };
  check(0);
};
