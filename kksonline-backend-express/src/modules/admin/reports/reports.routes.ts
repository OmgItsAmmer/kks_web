import { Router, type Response } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { db } from '../../../config/database.config';
import { asyncHandler } from '../../../middleware/error.middleware';
import { validate } from '../../../middleware/validation.middleware';
import { imageService } from '../../../services/image.service';
import { sendSuccess } from '../../../utils/response';
import { can } from '../common/middleware';
import { adminOf } from '../common/types';
import { roleCan } from '../permissions';

const router = Router();
const D = (v: Prisma.Decimal | number | string | null | undefined): Prisma.Decimal => new Prisma.Decimal(v ?? 0);

/** Order value: subtotal + tax + shipping - discount. Cancelled orders never count. */
const ORDER_TOTAL = Prisma.sql`(o.sub_total + COALESCE(o.tax,0) + COALESCE(o.shipping_fee,0) - COALESCE(o.discount,0))`;

const dayStart = (offsetDays: number): Date => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d;
};

// ---------------------------------------------------------------------------
// Dashboard (home page)
// ---------------------------------------------------------------------------

router.get(
  '/dashboard',
  can('dashboard.view'),
  asyncHandler(async (req, res) => {
    const revenueAllowed = roleCan(adminOf(req).role, 'dashboard.revenue');
    const today = dayStart(0);
    const d7 = dayStart(-6);
    const d30 = dayStart(-29);

    const [byStatus, lowStock, outOfStock, recent, ordersToday, revenue, series, top] = await Promise.all([
      db.order.groupBy({ by: ['status'], _count: { _all: true } }),
      db.$queryRaw<{ n: bigint }[]>`SELECT COUNT(*) AS n FROM product_variants WHERE alert_stock > 0 AND COALESCE(stock,0) <= alert_stock AND COALESCE(stock,0) > 0`,
      db.$queryRaw<{ n: bigint }[]>`SELECT COUNT(*) AS n FROM product_variants WHERE COALESCE(stock,0) = 0 AND is_visible IS NOT FALSE`,
      db.order.findMany({ orderBy: { order_id: 'desc' }, take: 8, include: { customer: { select: { first_name: true, last_name: true } } } }),
      db.order.count({ where: { order_date: { gte: today }, status: { not: 'cancelled' } } }),
      revenueAllowed
        ? db.$queryRaw<{ today: Prisma.Decimal | null; d7: Prisma.Decimal | null; d30: Prisma.Decimal | null }[]>(Prisma.sql`
            SELECT
              SUM(${ORDER_TOTAL}) FILTER (WHERE o.order_date >= ${today}) AS today,
              SUM(${ORDER_TOTAL}) FILTER (WHERE o.order_date >= ${d7}) AS d7,
              SUM(${ORDER_TOTAL}) AS d30
            FROM orders o WHERE o.status <> 'cancelled' AND o.order_date >= ${d30}`)
        : Promise.resolve([]),
      revenueAllowed
        ? db.$queryRaw<{ day: Date; orders: bigint; revenue: Prisma.Decimal }[]>(Prisma.sql`
            SELECT o.order_date AS day, COUNT(*) AS orders, SUM(${ORDER_TOTAL}) AS revenue
            FROM orders o WHERE o.status <> 'cancelled' AND o.order_date >= ${d30}
            GROUP BY o.order_date ORDER BY o.order_date`)
        : Promise.resolve([]),
      db.$queryRaw<{ product_id: number; name: string; units: bigint }[]>`
        SELECT oi.product_id, p.name, SUM(oi.quantity) AS units
        FROM order_items oi JOIN orders o ON o.order_id = oi.order_id JOIN products p ON p.product_id = oi.product_id
        WHERE o.status <> 'cancelled' AND o.order_date >= ${d30}
        GROUP BY oi.product_id, p.name ORDER BY units DESC LIMIT 5`,
    ]);

    const counts = Object.fromEntries(byStatus.map((s) => [s.status, s._count._all]));
    const thumbs = await imageService.getMainImagesForEntities(
      top.map((t) => t.product_id),
      'products'
    );
    return sendSuccess(res, {
      ordersByStatus: counts,
      openOrders: ['pending', 'confirmed', 'processing', 'ready'].reduce((n, s) => n + (counts[s] ?? 0), 0),
      ordersToday,
      lowStockVariants: Number(lowStock[0]?.n ?? 0),
      outOfStockVariants: Number(outOfStock[0]?.n ?? 0),
      revenue: revenueAllowed ? { today: D(revenue[0]?.today), last7Days: D(revenue[0]?.d7), last30Days: D(revenue[0]?.d30) } : null,
      salesSeries: revenueAllowed ? series.map((s) => ({ day: s.day, orders: Number(s.orders), revenue: s.revenue })) : null,
      topProducts: top.map((t) => ({ productId: t.product_id, name: t.name, units: Number(t.units), imageUrl: thumbs.get(t.product_id) ?? null })),
      recentOrders: recent.map((o) => ({
        id: o.order_id,
        status: o.status,
        date: o.order_date,
        customerName: o.customer ? `${o.customer.first_name} ${o.customer.last_name ?? ''}`.trim() : 'Guest',
        total: D(o.sub_total).plus(D(o.tax)).plus(D(o.shipping_fee)).minus(D(o.discount)),
      })),
    });
  })
);

// ---------------------------------------------------------------------------
// Reports (JSON or CSV)
// ---------------------------------------------------------------------------

const range = z.object({
  from: z.string().date(),
  to: z.string().date(),
  format: z.enum(['json', 'csv']).default('json'),
  interval: z.enum(['day', 'week', 'month']).default('day'),
});

const csvEscape = (v: unknown): string => {
  const s = v === null || v === undefined ? '' : String(v);
  // Neutralise spreadsheet formulas
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

const sendRows = (res: Response, name: string, format: 'json' | 'csv', rows: Record<string, unknown>[]) => {
  if (format === 'csv') {
    const cols = rows[0] ? Object.keys(rows[0]) : [];
    const csv = [cols.join(','), ...rows.map((r) => cols.map((c) => csvEscape(r[c])).join(','))].join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${name}.csv"`);
    return res.send(`﻿${csv}`);
  }
  return sendSuccess(res, rows);
};

router.get(
  '/reports/sales',
  can('reports.view'),
  validate({ query: range }),
  asyncHandler(async (req, res) => {
    const q = req.query as unknown as z.infer<typeof range>;
    const trunc = Prisma.raw(`'${q.interval}'`);
    const rows = await db.$queryRaw<{ period: Date; orders: bigint; revenue: Prisma.Decimal; cost: Prisma.Decimal | null; shipping: Prisma.Decimal | null }[]>(Prisma.sql`
      SELECT date_trunc(${trunc}, o.order_date)::date AS period, COUNT(*) AS orders, SUM(${ORDER_TOTAL}) AS revenue,
             SUM(COALESCE(o.buying_price,0)) AS cost, SUM(COALESCE(o.shipping_fee,0)) AS shipping
      FROM orders o
      WHERE o.status <> 'cancelled' AND o.order_date BETWEEN ${new Date(q.from)} AND ${new Date(q.to)}
      GROUP BY 1 ORDER BY 1`);
    return sendRows(
      res,
      `sales-${q.from}-to-${q.to}`,
      q.format,
      rows.map((r) => ({
        period: r.period.toISOString().slice(0, 10),
        orders: Number(r.orders),
        revenue: D(r.revenue).toFixed(2),
        cost: D(r.cost).toFixed(2),
        profit: D(r.revenue).minus(D(r.shipping)).minus(D(r.cost)).toFixed(2),
      }))
    );
  })
);

router.get(
  '/reports/products',
  can('reports.view'),
  validate({ query: range }),
  asyncHandler(async (req, res) => {
    const q = req.query as unknown as z.infer<typeof range>;
    const rows = await db.$queryRaw<{ product_id: number; name: string; units: bigint; revenue: Prisma.Decimal; cost: Prisma.Decimal | null }[]>`
      SELECT oi.product_id, p.name, SUM(oi.quantity) AS units, SUM(oi.price * oi.quantity) AS revenue, SUM(COALESCE(oi.total_buy_price,0)) AS cost
      FROM order_items oi JOIN orders o ON o.order_id = oi.order_id JOIN products p ON p.product_id = oi.product_id
      WHERE o.status <> 'cancelled' AND o.order_date BETWEEN ${new Date(q.from)} AND ${new Date(q.to)}
      GROUP BY oi.product_id, p.name ORDER BY revenue DESC LIMIT 500`;
    return sendRows(
      res,
      `products-${q.from}-to-${q.to}`,
      q.format,
      rows.map((r) => ({
        product_id: r.product_id,
        product: r.name,
        units_sold: Number(r.units),
        revenue: D(r.revenue).toFixed(2),
        cost: D(r.cost).toFixed(2),
        profit: D(r.revenue).minus(D(r.cost)).toFixed(2),
      }))
    );
  })
);

router.get(
  '/reports/stock-valuation',
  can('reports.view'),
  validate({ query: z.object({ format: z.enum(['json', 'csv']).default('json') }) }),
  asyncHandler(async (req, res) => {
    const { format } = req.query as { format: 'json' | 'csv' };
    const rows = await db.$queryRaw<{ product: string; variant_name: string; sku: string | null; stock: number | null; buy_price: Prisma.Decimal; sell_price: Prisma.Decimal }[]>`
      SELECT p.name AS product, v.variant_name, v.sku, v.stock, v.buy_price, v.sell_price
      FROM product_variants v JOIN products p ON p.product_id = v.product_id ORDER BY p.name, v.variant_id`;
    return sendRows(
      res,
      'stock-valuation',
      format,
      rows.map((r) => ({
        product: r.product,
        variant: r.variant_name,
        sku: r.sku ?? '',
        stock: r.stock ?? 0,
        unit_cost: D(r.buy_price).toFixed(2),
        stock_value: D(r.buy_price).times(r.stock ?? 0).toFixed(2),
        unit_price: D(r.sell_price).toFixed(2),
      }))
    );
  })
);

router.get(
  '/reports/orders',
  can('reports.view'),
  validate({ query: range }),
  asyncHandler(async (req, res) => {
    const q = req.query as unknown as z.infer<typeof range>;
    const rows = await db.order.findMany({
      where: { order_date: { gte: new Date(q.from), lte: new Date(q.to) } },
      orderBy: { order_id: 'asc' },
      take: 20000,
      include: { customer: { select: { first_name: true, last_name: true, phone_number: true } } },
    });
    return sendRows(
      res,
      `orders-${q.from}-to-${q.to}`,
      q.format,
      rows.map((o) => ({
        order_id: o.order_id,
        date: o.order_date.toISOString().slice(0, 10),
        status: o.status,
        customer: o.customer ? `${o.customer.first_name} ${o.customer.last_name ?? ''}`.trim() : '',
        phone: o.customer?.phone_number ?? '',
        payment_method: o.payment_method ?? '',
        subtotal: D(o.sub_total).toFixed(2),
        tax: D(o.tax).toFixed(2),
        shipping: D(o.shipping_fee).toFixed(2),
        discount: D(o.discount).toFixed(2),
        total: D(o.sub_total).plus(D(o.tax)).plus(D(o.shipping_fee)).minus(D(o.discount)).toFixed(2),
      }))
    );
  })
);

export default router;
