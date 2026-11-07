import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { db } from '../../../config/database.config';
import { asyncHandler } from '../../../middleware/error.middleware';
import { validate } from '../../../middleware/validation.middleware';
import { NotFoundError } from '../../../utils/errors';
import { sendPaginated, sendSuccess } from '../../../utils/response';
import { invalidateCatalog } from '../common/after-write';
import { audit } from '../common/audit';
import { boolQuery, idParams, paging, skipTake } from '../common/http';
import { can } from '../common/middleware';

const router = Router();
const D = (v: Prisma.Decimal | number | string | null | undefined): Prisma.Decimal => new Prisma.Decimal(v ?? 0);

// ---------------------------------------------------------------------------
// Customers (read only)
// ---------------------------------------------------------------------------

const customerQuery = paging.extend({ q: z.string().trim().max(100).optional() });

router.get(
  '/customers',
  can('customers.view'),
  validate({ query: customerQuery }),
  asyncHandler(async (req, res) => {
    const q = req.query as unknown as z.infer<typeof customerQuery>;
    const where: Prisma.CustomerWhereInput = {};
    if (q.q) {
      const asId = Number(q.q);
      where.OR = [
        { first_name: { contains: q.q, mode: 'insensitive' } },
        { last_name: { contains: q.q, mode: 'insensitive' } },
        { email: { contains: q.q, mode: 'insensitive' } },
        { phone_number: { contains: q.q } },
        ...(Number.isInteger(asId) && asId > 0 ? [{ customer_id: asId }] : []),
      ];
    }
    const [rows, total] = await Promise.all([
      db.customer.findMany({ where, orderBy: { customer_id: 'desc' }, ...skipTake(q.page, q.pageSize) }),
      db.customer.count({ where }),
    ]);
    const ids = rows.map((r) => r.customer_id);
    const stats = ids.length
      ? await db.$queryRaw<{ customer_id: number; orders: bigint; spent: Prisma.Decimal | null; last_order: Date | null }[]>`
          SELECT customer_id, COUNT(*) AS orders,
                 SUM(sub_total + COALESCE(tax,0) + COALESCE(shipping_fee,0) - COALESCE(discount,0)) AS spent,
                 MAX(order_date) AS last_order
          FROM orders WHERE customer_id IN (${Prisma.join(ids)}) AND status <> 'cancelled' GROUP BY customer_id`
      : [];
    const by = new Map(stats.map((s) => [s.customer_id, s]));
    return sendPaginated(
      res,
      rows.map((c) => ({
        id: c.customer_id,
        name: `${c.first_name} ${c.last_name ?? ''}`.trim(),
        email: c.email,
        phone: c.phone_number,
        joinedAt: c.created_at,
        orders: Number(by.get(c.customer_id)?.orders ?? 0),
        totalSpent: D(by.get(c.customer_id)?.spent),
        lastOrder: by.get(c.customer_id)?.last_order ?? null,
      })),
      { page: q.page, pageSize: q.pageSize, total }
    );
  })
);

router.get(
  '/customers/:id',
  can('customers.view'),
  validate({ params: idParams }),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const c = await db.customer.findUnique({ where: { customer_id: id }, include: { addresses: true } });
    if (!c) throw new NotFoundError('Customer not found');
    const [orders, reviews, stats] = await Promise.all([
      db.order.findMany({ where: { customer_id: id }, orderBy: { order_id: 'desc' }, take: 20 }),
      db.review.count({ where: { customer_id: id } }),
      db.$queryRaw<{ orders: bigint; spent: Prisma.Decimal | null }[]>`
        SELECT COUNT(*) AS orders,
               SUM(sub_total + COALESCE(tax,0) + COALESCE(shipping_fee,0) - COALESCE(discount,0)) AS spent
        FROM orders WHERE customer_id = ${id} AND status <> 'cancelled'`,
    ]);
    const orderCount = Number(stats[0]?.orders ?? 0);
    const spent = D(stats[0]?.spent);
    return sendSuccess(res, {
      id: c.customer_id,
      name: `${c.first_name} ${c.last_name ?? ''}`.trim(),
      email: c.email,
      phone: c.phone_number,
      gender: c.gender,
      joinedAt: c.created_at,
      stats: { orders: orderCount, totalSpent: spent, averageOrder: orderCount ? spent.dividedBy(orderCount).toDecimalPlaces(2) : D(0), reviews },
      addresses: c.addresses.map((a) => ({
        id: a.address_id,
        fullName: a.full_name,
        phone: a.phone_number,
        address: a.shipping_address,
        city: a.city,
        postalCode: a.postal_code,
      })),
      recentOrders: orders.map((o) => ({
        id: o.order_id,
        date: o.order_date,
        status: o.status,
        total: D(o.sub_total).plus(D(o.tax)).plus(D(o.shipping_fee)).minus(D(o.discount)),
      })),
    });
  })
);

// ---------------------------------------------------------------------------
// Reviews
// ---------------------------------------------------------------------------

const reviewQuery = paging.extend({
  productId: z.coerce.number().int().positive().optional(),
  rating: z.coerce.number().int().min(1).max(5).optional(),
  hidden: boolQuery,
  q: z.string().trim().max(100).optional(),
});

router.get(
  '/reviews',
  can('reviews.view'),
  validate({ query: reviewQuery }),
  asyncHandler(async (req, res) => {
    const q = req.query as unknown as z.infer<typeof reviewQuery>;
    const where: Prisma.ReviewWhereInput = {};
    if (q.productId) where.product_id = q.productId;
    if (q.hidden !== undefined) where.is_hidden = q.hidden;
    if (q.rating) where.rating = { gte: q.rating, lt: q.rating + 1 };
    if (q.q) where.review = { contains: q.q, mode: 'insensitive' };
    const [rows, total] = await Promise.all([
      db.review.findMany({
        where,
        orderBy: { review_id: 'desc' },
        ...skipTake(q.page, q.pageSize),
        include: { product: { select: { name: true } }, customer: { select: { first_name: true, last_name: true } } },
      }),
      db.review.count({ where }),
    ]);
    return sendPaginated(
      res,
      rows.map((r) => ({
        id: r.review_id,
        productId: r.product_id,
        productName: r.product?.name ?? 'Deleted product',
        customerName: r.customer ? `${r.customer.first_name} ${r.customer.last_name ?? ''}`.trim() : 'Unknown',
        rating: r.rating ? Number(r.rating) : null,
        review: r.review ?? '',
        sentAt: r.sent_at,
        isHidden: r.is_hidden,
      })),
      { page: q.page, pageSize: q.pageSize, total }
    );
  })
);

router.patch(
  '/reviews/:id',
  can('reviews.moderate'),
  validate({ params: z.object({ id: z.coerce.bigint() }), body: z.object({ isHidden: z.boolean() }) }),
  asyncHandler(async (req, res) => {
    const id = req.params.id as unknown as bigint;
    const { isHidden } = req.body as { isHidden: boolean };
    const row = await db.review.update({ where: { review_id: id }, data: { is_hidden: isHidden } }).catch(() => null);
    if (!row) throw new NotFoundError('Review not found');
    await audit(req, { action: isHidden ? 'reviews.hide' : 'reviews.show', entityType: 'review', entityId: id });
    invalidateCatalog();
    return sendSuccess(res, { id: Number(id), isHidden });
  })
);

router.delete(
  '/reviews/:id',
  can('reviews.moderate'),
  validate({ params: z.object({ id: z.coerce.bigint() }) }),
  asyncHandler(async (req, res) => {
    const id = req.params.id as unknown as bigint;
    const row = await db.review.delete({ where: { review_id: id } }).catch(() => null);
    if (!row) throw new NotFoundError('Review not found');
    await audit(req, { action: 'reviews.delete', entityType: 'review', entityId: id, before: row });
    invalidateCatalog();
    return sendSuccess(res, { deleted: true });
  })
);

export default router;
