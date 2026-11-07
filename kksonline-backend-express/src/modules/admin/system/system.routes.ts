import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { db } from '../../../config/database.config';
import { asyncHandler } from '../../../middleware/error.middleware';
import { validate } from '../../../middleware/validation.middleware';
import { getNotificationState, markNotificationsDirty } from '../../../services/notification-state';
import { NotFoundError } from '../../../utils/errors';
import { sendCreated, sendPaginated, sendSuccess } from '../../../utils/response';
import { invalidateCatalog } from '../common/after-write';
import { audit } from '../common/audit';
import { boolQuery, idParams, nonNegativeMoney, paging, skipTake } from '../common/http';
import { can } from '../common/middleware';

const router = Router();

// ---------------------------------------------------------------------------
// Shop settings (owner)
// ---------------------------------------------------------------------------

const shopBody = z.object({
  shopname: z.string().trim().min(1).max(120),
  taxrate: nonNegativeMoney.refine((d) => d.lessThanOrEqualTo(100), 'Tax rate must be between 0 and 100'),
  shipping_price: nonNegativeMoney,
  threshold_free_shipping: nonNegativeMoney.nullable().optional(),
  is_shipping_enable: z.boolean(),
  max_allowed_item_quantity: z.number().int().min(1).max(10_000),
  is_advance_payment_receipt_mandatory: z.boolean(),
});

const shopView = (s: NonNullable<Awaited<ReturnType<typeof db.shop.findFirst>>>) => ({
  shopId: s.shop_id,
  shopname: s.shopname,
  taxrate: s.taxrate,
  shipping_price: s.shipping_price,
  threshold_free_shipping: s.threshold_free_shipping,
  is_shipping_enable: s.is_shipping_enable,
  max_allowed_item_quantity: Number(s.max_allowed_item_quantity),
  is_advance_payment_receipt_mandatory: s.is_advance_payment_receipt_mandatory,
});

router.get(
  '/settings/shop',
  can('settings.manage'),
  asyncHandler(async (_req, res) => {
    const shop = await db.shop.findFirst({ orderBy: { shop_id: 'asc' } });
    return sendSuccess(res, shop ? shopView(shop) : null);
  })
);

router.put(
  '/settings/shop',
  can('settings.manage'),
  validate({ body: shopBody }),
  asyncHandler(async (req, res) => {
    const b = req.body as z.infer<typeof shopBody>;
    const data = {
      shopname: b.shopname,
      taxrate: b.taxrate,
      shipping_price: b.shipping_price,
      threshold_free_shipping: b.threshold_free_shipping ?? null,
      is_shipping_enable: b.is_shipping_enable,
      max_allowed_item_quantity: BigInt(b.max_allowed_item_quantity),
      is_advance_payment_receipt_mandatory: b.is_advance_payment_receipt_mandatory,
    };
    const before = await db.shop.findFirst({ orderBy: { shop_id: 'asc' } });
    const after = before
      ? await db.shop.update({ where: { shop_id: before.shop_id }, data })
      : await db.shop.create({ data });
    await audit(req, { action: 'settings.shop', entityType: 'shop', entityId: after.shop_id, before, after });
    invalidateCatalog();
    return sendSuccess(res, shopView(after));
  })
);

// ---------------------------------------------------------------------------
// App versions (owner)
// ---------------------------------------------------------------------------

const versionBody = z.object({
  version: z.string().trim().min(1).max(40),
  force_update: z.boolean().default(false),
  app_locked: z.boolean().default(false),
  redirect_url: z.string().trim().url(),
  description: z.string().trim().max(1000).optional().nullable(),
});

router.get(
  '/settings/app-versions',
  can('settings.manage'),
  asyncHandler(async (_req, res) => {
    const rows = await db.appVersion.findMany({ orderBy: { id: 'desc' }, take: 50 });
    return sendSuccess(res, rows.map((v) => ({ ...v, id: Number(v.id) })));
  })
);

router.post(
  '/settings/app-versions',
  can('settings.manage'),
  validate({ body: versionBody }),
  asyncHandler(async (req, res) => {
    const row = await db.appVersion.create({ data: req.body });
    await audit(req, { action: 'settings.app-version.create', entityType: 'app_version', entityId: row.id, after: row });
    invalidateCatalog();
    return sendCreated(res, { ...row, id: Number(row.id) });
  })
);

router.patch(
  '/settings/app-versions/:id',
  can('settings.manage'),
  validate({ params: idParams, body: versionBody.partial() }),
  asyncHandler(async (req, res) => {
    const id = BigInt(req.params.id as string);
    const row = await db.appVersion.update({ where: { id }, data: req.body }).catch(() => null);
    if (!row) throw new NotFoundError('Version not found');
    await audit(req, { action: 'settings.app-version.update', entityType: 'app_version', entityId: id, after: row });
    invalidateCatalog();
    return sendSuccess(res, { ...row, id: Number(row.id) });
  })
);

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

/** Cheap poll (answered from memory, see notification-state.ts). */
router.get(
  '/notifications/latest',
  can('dashboard.view'),
  asyncHandler(async (_req, res) => sendSuccess(res, await getNotificationState()))
);

const notifQuery = paging.extend({ unread: boolQuery });

router.get(
  '/notifications',
  can('dashboard.view'),
  validate({ query: notifQuery }),
  asyncHandler(async (req, res) => {
    const q = req.query as unknown as z.infer<typeof notifQuery>;
    const where: Prisma.NotificationWhereInput = q.unread ? { isRead: false } : {};
    const [rows, total] = await Promise.all([
      db.notification.findMany({ where, orderBy: { notification_id: 'desc' }, ...skipTake(q.page, q.pageSize) }),
      db.notification.count({ where }),
    ]);
    return sendPaginated(
      res,
      rows.map((n) => ({
        id: n.notification_id,
        type: n.NotificationType,
        title: n.description,
        detail: n.sub_description,
        isRead: Boolean(n.isRead),
        createdAt: n.created_at,
        orderId: n.order_id,
        productId: n.product_id,
      })),
      { page: q.page, pageSize: q.pageSize, total }
    );
  })
);

router.post(
  '/notifications/read',
  can('dashboard.view'),
  validate({ body: z.object({ ids: z.array(z.number().int().positive()).max(500).optional(), all: z.boolean().optional() }) }),
  asyncHandler(async (req, res) => {
    const { ids, all } = req.body as { ids?: number[]; all?: boolean };
    const result = await db.notification.updateMany({
      where: all ? { isRead: false } : { notification_id: { in: ids ?? [] } },
      data: { isRead: true },
    });
    markNotificationsDirty();
    return sendSuccess(res, { updated: result.count });
  })
);

// ---------------------------------------------------------------------------
// Audit log (owner)
// ---------------------------------------------------------------------------

const auditQuery = paging.extend({
  actor: z.string().trim().max(200).optional(),
  action: z.string().trim().max(100).optional(),
  entityType: z.string().trim().max(60).optional(),
  entityId: z.string().trim().max(60).optional(),
  from: z.string().date().optional(),
  to: z.string().date().optional(),
});

router.get(
  '/audit',
  can('audit.view'),
  validate({ query: auditQuery }),
  asyncHandler(async (req, res) => {
    const q = req.query as unknown as z.infer<typeof auditQuery>;
    const where: Prisma.AdminAuditLogWhereInput = {};
    if (q.actor) where.actor_admin_id = { contains: q.actor, mode: 'insensitive' };
    if (q.action) where.action = { startsWith: q.action };
    if (q.entityType) where.entity_type = q.entityType;
    if (q.entityId) where.entity_id = q.entityId;
    if (q.from || q.to) {
      where.created_at = {};
      if (q.from) where.created_at.gte = new Date(q.from);
      if (q.to) where.created_at.lte = new Date(`${q.to}T23:59:59.999Z`);
    }
    const [rows, total] = await Promise.all([
      db.adminAuditLog.findMany({ where, orderBy: { log_id: 'desc' }, ...skipTake(q.page, q.pageSize) }),
      db.adminAuditLog.count({ where }),
    ]);
    return sendPaginated(
      res,
      rows.map((r) => ({
        id: Number(r.log_id),
        actor: r.actor_admin_id,
        action: r.action,
        entityType: r.entity_type,
        entityId: r.entity_id,
        before: r.before,
        after: r.after,
        ip: r.ip_address,
        requestId: r.request_id,
        createdAt: r.created_at,
      })),
      { page: q.page, pageSize: q.pageSize, total }
    );
  })
);

// ---------------------------------------------------------------------------
// Usage against the free plans (owner)
// ---------------------------------------------------------------------------

const FREE_DB_BYTES = 0.5 * 1024 * 1024 * 1024;

router.get(
  '/settings/usage',
  can('usage.view'),
  asyncHandler(async (_req, res) => {
    const [size, tables] = await Promise.all([
      db.$queryRaw<{ bytes: bigint }[]>`SELECT pg_database_size(current_database()) AS bytes`,
      db.$queryRaw<{ table_name: string; bytes: bigint; rows: bigint }[]>`
        SELECT relname AS table_name, pg_total_relation_size(relid) AS bytes, n_live_tup AS rows
        FROM pg_stat_user_tables ORDER BY pg_total_relation_size(relid) DESC LIMIT 12`,
    ]);
    const bytes = Number(size[0]?.bytes ?? 0);
    return sendSuccess(res, {
      database: { bytes, limitBytes: FREE_DB_BYTES, percent: Math.round((bytes / FREE_DB_BYTES) * 1000) / 10 },
      largestTables: tables.map((t) => ({ name: t.table_name, bytes: Number(t.bytes), rows: Number(t.rows) })),
    });
  })
);

export default router;
