import crypto from 'node:crypto';
import { Router, type RequestHandler } from 'express';
import { config } from '../../config/env.config';
import { db } from '../../config/database.config';
import { asyncHandler } from '../../middleware/error.middleware';
import { applyStockChanges } from '../../services/inventory.service';
import { markNotificationsDirty } from '../../services/notification-state';
import { notifyAdmins } from '../../services/push.service';
import { markReservationsClear, reservationsMayExist } from '../../services/reservation-state';
import { logger } from '../../utils/logger';
import { sendError, sendSuccess } from '../../utils/response';

/**
 * Scheduled jobs (plan 4.5). Called by GitHub Actions on a schedule with `X-Jobs-Secret`.
 * They never run on a timer inside the API, so the free database can sleep between calls.
 */
const router = Router();

const requireJobsSecret: RequestHandler = (req, res, next) => {
  const expected = config.jobs.secret;
  const given = req.headers['x-jobs-secret'];
  if (!expected || typeof given !== 'string') {
    sendError(res, 'Not found', 404);
    return;
  }
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    sendError(res, 'Not found', 404);
    return;
  }
  next();
};

router.use(requireJobsSecret);

/** Gives back stock held by checkouts that never finished (reservations older than their expiry). */
router.post(
  '/release-reservations',
  asyncHandler(async (_req, res) => {
    // No checkout since the last clean run: answer without touching the database
    if (!reservationsMayExist()) return sendSuccess(res, { released: 0, skipped: true });
    const expired = await db.inventoryReservation.findMany({ where: { expires_at: { lt: new Date() } } });
    const groups = new Map<string, typeof expired>();
    for (const r of expired) groups.set(r.reservation_id, [...(groups.get(r.reservation_id) ?? []), r]);

    let released = 0;
    for (const [reservationId, rows] of groups) {
      // A reservation that already became an order has its ledger rows relinked to the order: skip those.
      const order = await db.order.findUnique({ where: { idempotency_key: reservationId }, select: { order_id: true } });
      await db.$transaction(async (tx) => {
        if (!order) {
          await applyStockChanges(
            tx,
            rows.map((r) => ({
              variantId: r.variant_id,
              delta: r.quantity,
              reason: 'correction' as const,
              refType: 'reservation',
              refId: reservationId,
              note: 'Reservation expired',
            })),
            'job'
          );
          released += rows.length;
        }
        await tx.inventoryReservation.deleteMany({ where: { reservation_id: reservationId } });
      });
    }
    const stillHeld = await db.inventoryReservation.count();
    if (stillHeld === 0) markReservationsClear();
    logger.info('Released expired reservations', { released, stillHeld });
    return sendSuccess(res, { released, stillHeld });
  })
);

/** Keeps the free database small: old read notifications, old security log rows, expired notifications. */
router.post(
  '/retention',
  asyncHandler(async (_req, res) => {
    const monthsAgo = (m: number) => new Date(Date.now() - m * 30 * 24 * 3600 * 1000);
    const [notifications, security] = await Promise.all([
      db.notification.deleteMany({ where: { OR: [{ isRead: true, created_at: { lt: monthsAgo(3) } }, { created_at: { lt: monthsAgo(12) } }] } }),
      db.securityAuditLog.deleteMany({ where: { timestamp: { lt: monthsAgo(6) } } }),
    ]);
    markNotificationsDirty();
    return sendSuccess(res, { notificationsDeleted: notifications.count, securityLogDeleted: security.count });
  })
);

/** Daily check against the free-plan limits. Posts a notification at 80%. */
router.post(
  '/usage-check',
  asyncHandler(async (_req, res) => {
    const size = await db.$queryRaw<{ bytes: bigint }[]>`SELECT pg_database_size(current_database()) AS bytes`;
    const bytes = Number(size[0]?.bytes ?? 0);
    const limit = 0.5 * 1024 * 1024 * 1024;
    const percent = (bytes / limit) * 100;
    let notified = false;
    if (percent >= 80) {
      const since = new Date(Date.now() - 7 * 24 * 3600 * 1000);
      const already = await db.notification.count({ where: { NotificationType: 'usage_warning', created_at: { gte: since } } });
      if (already === 0) {
        await db.notification.create({
          data: {
            NotificationType: 'usage_warning',
            description: `Database is ${percent.toFixed(0)}% of the free plan`,
            sub_description: 'Plan an upgrade or remove old data (Settings, Usage).',
            isRead: false,
          },
        });
        markNotificationsDirty();
        notifyAdmins({
          kind: 'usage_warning',
          title: `Database is ${percent.toFixed(0)}% of the free plan`,
          body: 'Plan an upgrade or remove old data (Settings, Usage).',
          url: '/settings',
          tag: 'usage-warning',
        });
        notified = true;
      }
    }
    return sendSuccess(res, { databaseBytes: bytes, percent: Math.round(percent * 10) / 10, notified });
  })
);

export default router;
