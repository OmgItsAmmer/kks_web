import { Router } from 'express';
import { MovementReason, Prisma, PurchaseReceiptStatus } from '@prisma/client';
import { z } from 'zod';
import { db } from '../../../config/database.config';
import { asyncHandler } from '../../../middleware/error.middleware';
import { validate } from '../../../middleware/validation.middleware';
import { applyStockChanges } from '../../../services/inventory.service';
import { BadRequestError, ConflictError, NotFoundError } from '../../../utils/errors';
import { sendCreated, sendPaginated, sendSuccess } from '../../../utils/response';
import { invalidateCatalog } from '../common/after-write';
import { audit } from '../common/audit';
import { idParams, nonNegativeMoney, paging, skipTake } from '../common/http';
import { can } from '../common/middleware';
import { adminOf } from '../common/types';
import { roleCan } from '../permissions';

const router = Router();
const D = (v: Prisma.Decimal | number | string | null | undefined): Prisma.Decimal => new Prisma.Decimal(v ?? 0);

// ---------------------------------------------------------------------------
// Stock list
// ---------------------------------------------------------------------------

const stockQuery = paging.extend({
  q: z.string().trim().max(100).optional(),
  filter: z.enum(['all', 'low', 'out']).default('all'),
  categoryId: z.coerce.number().int().positive().optional(),
});

router.get(
  '/inventory/stock',
  can('inventory.view'),
  validate({ query: stockQuery }),
  asyncHandler(async (req, res) => {
    const q = req.query as unknown as z.infer<typeof stockQuery>;
    const cost = roleCan(adminOf(req).role, 'cost.view');
    const conditions: Prisma.Sql[] = [Prisma.sql`TRUE`];
    if (q.q) {
      const like = `%${q.q}%`;
      conditions.push(Prisma.sql`(p.name ILIKE ${like} OR v.sku ILIKE ${like} OR v.variant_name ILIKE ${like})`);
    }
    if (q.categoryId) conditions.push(Prisma.sql`p.category_id = ${q.categoryId}`);
    if (q.filter === 'out') conditions.push(Prisma.sql`COALESCE(v.stock, 0) = 0`);
    if (q.filter === 'low') conditions.push(Prisma.sql`v.alert_stock > 0 AND COALESCE(v.stock, 0) <= v.alert_stock`);
    const whereSql = Prisma.join(conditions, ' AND ');

    const [rows, totalRows, valueRows] = await Promise.all([
      db.$queryRaw<
        {
          variant_id: number;
          product_id: number;
          product_name: string;
          variant_name: string;
          sku: string | null;
          stock: number | null;
          alert_stock: bigint;
          buy_price: Prisma.Decimal;
          sell_price: Prisma.Decimal;
          is_visible: boolean | null;
        }[]
      >(Prisma.sql`
        SELECT v.variant_id, v.product_id, p.name AS product_name, v.variant_name, v.sku, v.stock, v.alert_stock,
               v.buy_price, v.sell_price, v.is_visible
        FROM product_variants v JOIN products p ON p.product_id = v.product_id
        WHERE ${whereSql}
        ORDER BY (COALESCE(v.stock, 0) <= v.alert_stock AND v.alert_stock > 0) DESC, p.name ASC, v.variant_id ASC
        LIMIT ${q.pageSize} OFFSET ${(q.page - 1) * q.pageSize}`),
      db.$queryRaw<{ n: bigint }[]>(Prisma.sql`
        SELECT COUNT(*) AS n FROM product_variants v JOIN products p ON p.product_id = v.product_id WHERE ${whereSql}`),
      cost
        ? db.$queryRaw<{ value: Prisma.Decimal | null }[]>(Prisma.sql`
            SELECT SUM(COALESCE(v.stock, 0) * v.buy_price) AS value
            FROM product_variants v JOIN products p ON p.product_id = v.product_id WHERE ${whereSql}`)
        : Promise.resolve([]),
    ]);

    const items = rows.map((r) => ({
      variantId: r.variant_id,
      productId: r.product_id,
      productName: r.product_name,
      variantName: r.variant_name,
      sku: r.sku,
      stock: r.stock ?? 0,
      alertStock: Number(r.alert_stock),
      isLow: Number(r.alert_stock) > 0 && (r.stock ?? 0) <= Number(r.alert_stock),
      isVisible: r.is_visible !== false,
      sellPrice: r.sell_price,
      ...(cost ? { buyPrice: r.buy_price, stockValue: D(r.buy_price).times(r.stock ?? 0) } : {}),
    }));
    const total = Number(totalRows[0]?.n ?? 0);
    const totalPages = Math.ceil(total / q.pageSize);
    return res.json({
      success: true,
      data: items,
      summary: cost ? { totalValue: valueRows[0]?.value ?? 0 } : {},
      pagination: { page: q.page, pageSize: q.pageSize, total, totalPages, hasMore: q.page < totalPages },
    });
  })
);

// ---------------------------------------------------------------------------
// Movements (the ledger)
// ---------------------------------------------------------------------------

const REASONS = Object.values(MovementReason) as [MovementReason, ...MovementReason[]];

const movementQuery = paging.extend({
  variantId: z.coerce.number().int().positive().optional(),
  productId: z.coerce.number().int().positive().optional(),
  reason: z.enum(REASONS).optional(),
  from: z.string().date().optional(),
  to: z.string().date().optional(),
});

router.get(
  '/inventory/movements',
  can('inventory.view'),
  validate({ query: movementQuery }),
  asyncHandler(async (req, res) => {
    const q = req.query as unknown as z.infer<typeof movementQuery>;
    const cost = roleCan(adminOf(req).role, 'cost.view');
    const where: Prisma.InventoryMovementWhereInput = {};
    if (q.variantId) where.variant_id = q.variantId;
    if (q.productId) where.product_id = q.productId;
    if (q.reason) where.reason = q.reason;
    if (q.from || q.to) {
      where.created_at = {};
      if (q.from) where.created_at.gte = new Date(q.from);
      if (q.to) where.created_at.lte = new Date(`${q.to}T23:59:59.999Z`);
    }
    const [rows, total] = await Promise.all([
      db.inventoryMovement.findMany({
        where,
        orderBy: { movement_id: 'desc' },
        ...skipTake(q.page, q.pageSize),
        include: { variant: { select: { variant_name: true, sku: true } }, product: { select: { name: true } } },
      }),
      db.inventoryMovement.count({ where }),
    ]);
    const items = rows.map((m) => ({
      id: m.movement_id,
      createdAt: m.created_at,
      productId: m.product_id,
      productName: m.product.name,
      variantId: m.variant_id,
      variantName: m.variant.variant_name,
      sku: m.variant.sku,
      delta: m.delta,
      stockAfter: m.stock_after,
      reason: m.reason,
      refType: m.ref_type,
      refId: m.ref_id,
      note: m.note,
      actor: m.actor,
      ...(cost ? { unitCost: m.unit_cost } : {}),
    }));
    return sendPaginated(res, items, { page: q.page, pageSize: q.pageSize, total });
  })
);

// ---------------------------------------------------------------------------
// Manual adjustments
// ---------------------------------------------------------------------------

const adjustBody = z
  .object({
    variantId: z.number().int().positive(),
    mode: z.enum(['delta', 'set']),
    value: z.number().int().min(-1_000_000).max(1_000_000),
    reason: z.enum(['manual_adjustment', 'correction', 'return']).default('manual_adjustment'),
    note: z.string().trim().min(3, 'Please explain the adjustment').max(500),
  })
  .refine((b) => b.mode !== 'set' || b.value >= 0, { message: 'The new stock cannot be negative', path: ['value'] });

router.post(
  '/inventory/adjustments',
  can('inventory.adjust'),
  validate({ body: adjustBody }),
  asyncHandler(async (req, res) => {
    const b = req.body as z.infer<typeof adjustBody>;
    const admin = adminOf(req);
    const result = await db.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<{ stock: number | null }[]>`SELECT stock FROM product_variants WHERE variant_id = ${b.variantId} FOR UPDATE`;
      if (rows.length === 0) throw new NotFoundError('Variant not found');
      const current = rows[0]?.stock ?? 0;
      const delta = b.mode === 'set' ? b.value - current : b.value;
      if (delta === 0) throw new BadRequestError('That does not change the stock');
      const r = await applyStockChanges(tx, [{ variantId: b.variantId, delta, reason: b.reason, refType: 'adjustment', note: b.note }], admin.email);
      await audit(req, { action: 'inventory.adjust', entityType: 'variant', entityId: b.variantId, before: { stock: current }, after: { stock: current + delta, note: b.note } }, tx);
      return { before: current, after: current + delta, lowStock: r.lowStock.length > 0 };
    });
    invalidateCatalog();
    return sendSuccess(res, result);
  })
);

// ---------------------------------------------------------------------------
// Stock receipts (restock). Replaces vendor management: the supplier is just a name.
// ---------------------------------------------------------------------------

const itemInput = z.object({
  variantId: z.number().int().positive(),
  quantity: z.number().int().min(1).max(1_000_000),
  unitCost: nonNegativeMoney,
});

const receiptBody = z.object({
  supplierName: z.string().trim().max(120).optional().nullable(),
  reference: z.string().trim().max(120).optional().nullable(),
  note: z.string().trim().max(1000).optional().nullable(),
  purchaseDate: z.string().date().optional(),
  shippingFee: nonNegativeMoney.default(0),
  discount: nonNegativeMoney.default(0),
  items: z.array(itemInput).min(1).max(200),
});

const RECEIPT_STATUSES = Object.values(PurchaseReceiptStatus) as [PurchaseReceiptStatus, ...PurchaseReceiptStatus[]];

const loadReceipt = async (id: number, cost: boolean) => {
  const p = await db.purchase.findUnique({
    where: { purchase_id: BigInt(id) },
    include: { items: { include: { variant: { select: { variant_name: true, sku: true, stock: true } }, product: { select: { name: true } } } } },
  });
  if (!p) throw new NotFoundError('Receipt not found');
  return {
    id: Number(p.purchase_id),
    date: p.purchase_date,
    supplierName: p.supplier_name,
    reference: p.reference,
    note: p.note,
    status: p.receipt_status,
    shippingFee: p.shipping_fee,
    discount: p.discount,
    subTotal: p.sub_total,
    total: p.total,
    receivedAt: p.received_at,
    createdBy: p.created_by,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
    items: p.items.map((i) => ({
      id: Number(i.purchase_item_id),
      variantId: i.variant_id,
      productId: i.product_id,
      productName: i.product.name,
      variantName: i.variant.variant_name,
      sku: i.variant.sku,
      quantity: i.quantity,
      ...(cost ? { unitCost: i.price, lineTotal: D(i.price).times(i.quantity) } : {}),
      stockNow: i.variant.stock ?? 0,
    })),
  };
};

const totalsOf = (items: { quantity: number; unitCost: Prisma.Decimal }[], shipping: Prisma.Decimal, discount: Prisma.Decimal) => {
  const sub = items.reduce((s, i) => s.plus(i.unitCost.times(i.quantity)), new Prisma.Decimal(0));
  return { sub, total: sub.plus(shipping).minus(discount) };
};

const buildItems = async (tx: Pick<typeof db, 'productVariant'>, items: z.infer<typeof itemInput>[]) => {
  const ids = items.map((i) => i.variantId);
  if (new Set(ids).size !== ids.length) throw new BadRequestError('Each variant may appear only once on a receipt');
  const variants = await tx.productVariant.findMany({ where: { variant_id: { in: ids } }, select: { variant_id: true, product_id: true } });
  if (variants.length !== ids.length) throw new NotFoundError('A variant on this receipt no longer exists');
  const productBy = new Map(variants.map((v) => [v.variant_id, v.product_id]));
  return items.map((i) => ({ product_id: productBy.get(i.variantId) as number, variant_id: i.variantId, price: i.unitCost, quantity: i.quantity }));
};

router.get(
  '/inventory/receipts',
  can('inventory.view'),
  validate({ query: paging.extend({ status: z.enum(RECEIPT_STATUSES).optional(), q: z.string().trim().max(100).optional() }) }),
  asyncHandler(async (req, res) => {
    const q = req.query as unknown as { page: number; pageSize: number; status?: PurchaseReceiptStatus; q?: string };
    const cost = roleCan(adminOf(req).role, 'cost.view');
    const where: Prisma.PurchaseWhereInput = {};
    if (q.status) where.receipt_status = q.status;
    if (q.q) where.OR = [{ supplier_name: { contains: q.q, mode: 'insensitive' } }, { reference: { contains: q.q, mode: 'insensitive' } }];
    const [rows, total] = await Promise.all([
      db.purchase.findMany({ where, orderBy: { purchase_id: 'desc' }, ...skipTake(q.page, q.pageSize), include: { _count: { select: { items: true } } } }),
      db.purchase.count({ where }),
    ]);
    return sendPaginated(
      res,
      rows.map((p) => ({
        id: Number(p.purchase_id),
        date: p.purchase_date,
        supplierName: p.supplier_name,
        reference: p.reference,
        status: p.receipt_status,
        itemCount: p._count.items,
        ...(cost ? { total: p.total } : {}),
        receivedAt: p.received_at,
        createdBy: p.created_by,
      })),
      { page: q.page, pageSize: q.pageSize, total }
    );
  })
);

router.get(
  '/inventory/receipts/:id',
  can('inventory.view'),
  validate({ params: idParams }),
  asyncHandler(async (req, res) => sendSuccess(res, await loadReceipt(Number(req.params.id), roleCan(adminOf(req).role, 'cost.view'))))
);

router.post(
  '/inventory/receipts',
  can('inventory.receive'),
  validate({ body: receiptBody }),
  asyncHandler(async (req, res) => {
    const b = req.body as z.infer<typeof receiptBody>;
    const admin = adminOf(req);
    const id = await db.$transaction(async (tx) => {
      const rows = await buildItems(tx, b.items);
      const { sub, total } = totalsOf(b.items, b.shippingFee, b.discount);
      const purchase = await tx.purchase.create({
        data: {
          supplier_name: b.supplierName || null,
          reference: b.reference || null,
          note: b.note || null,
          purchase_date: b.purchaseDate ? new Date(b.purchaseDate) : new Date(),
          shipping_fee: b.shippingFee,
          discount: b.discount,
          sub_total: sub,
          total,
          created_by: admin.email,
          items: { create: rows },
        },
      });
      await audit(req, { action: 'receipts.create', entityType: 'receipt', entityId: purchase.purchase_id, after: b }, tx);
      return Number(purchase.purchase_id);
    });
    return sendCreated(res, await loadReceipt(id, roleCan(admin.role, 'cost.view')));
  })
);

router.put(
  '/inventory/receipts/:id',
  can('inventory.receive'),
  validate({ params: idParams, body: receiptBody }),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const b = req.body as z.infer<typeof receiptBody>;
    await db.$transaction(async (tx) => {
      const existing = await tx.purchase.findUnique({ where: { purchase_id: BigInt(id) } });
      if (!existing) throw new NotFoundError('Receipt not found');
      if (existing.receipt_status !== 'draft') throw new ConflictError('Only a draft receipt can be edited');
      const rows = await buildItems(tx, b.items);
      const { sub, total } = totalsOf(b.items, b.shippingFee, b.discount);
      await tx.purchaseItem.deleteMany({ where: { purchase_id: BigInt(id) } });
      await tx.purchase.update({
        where: { purchase_id: BigInt(id) },
        data: {
          supplier_name: b.supplierName || null,
          reference: b.reference || null,
          note: b.note || null,
          purchase_date: b.purchaseDate ? new Date(b.purchaseDate) : existing.purchase_date,
          shipping_fee: b.shippingFee,
          discount: b.discount,
          sub_total: sub,
          total,
          items: { create: rows },
        },
      });
      await audit(req, { action: 'receipts.update', entityType: 'receipt', entityId: id, after: b }, tx);
    });
    return sendSuccess(res, await loadReceipt(id, roleCan(adminOf(req).role, 'cost.view')));
  })
);

router.delete(
  '/inventory/receipts/:id',
  can('inventory.receive'),
  validate({ params: idParams }),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    await db.$transaction(async (tx) => {
      const existing = await tx.purchase.findUnique({ where: { purchase_id: BigInt(id) } });
      if (!existing) throw new NotFoundError('Receipt not found');
      if (existing.receipt_status !== 'draft') throw new ConflictError('Only a draft receipt can be deleted. Cancel it instead.');
      await tx.purchaseItem.deleteMany({ where: { purchase_id: BigInt(id) } });
      await tx.purchase.delete({ where: { purchase_id: BigInt(id) } });
      await audit(req, { action: 'receipts.delete', entityType: 'receipt', entityId: id }, tx);
    });
    return sendSuccess(res, { deleted: true });
  })
);

/**
 * Receiving adds the stock, writes the ledger and updates each variant's cost using the weighted
 * average of what was in stock and what just arrived (plan Q5 default). Calling it twice does nothing.
 */
router.post(
  '/inventory/receipts/:id/receive',
  can('inventory.receive'),
  validate({ params: idParams }),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const admin = adminOf(req);
    await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT purchase_id FROM purchases WHERE purchase_id = ${BigInt(id)} FOR UPDATE`;
      const p = await tx.purchase.findUnique({ where: { purchase_id: BigInt(id) }, include: { items: true } });
      if (!p) throw new NotFoundError('Receipt not found');
      if (p.receipt_status === 'received') return; // already done: safe to repeat
      if (p.receipt_status === 'cancelled') throw new ConflictError('A cancelled receipt cannot be received');
      if (p.items.length === 0) throw new BadRequestError('The receipt has no items');

      // Lock the variants first so the average uses the true current stock.
      const ids = p.items.map((i) => i.variant_id).sort((a, b) => a - b);
      const locked = await tx.$queryRaw<{ variant_id: number; stock: number | null; buy_price: Prisma.Decimal }[]>(Prisma.sql`
        SELECT variant_id, stock, buy_price FROM product_variants WHERE variant_id IN (${Prisma.join(ids)}) ORDER BY variant_id FOR UPDATE`);
      const before = new Map(locked.map((v) => [v.variant_id, v]));

      await applyStockChanges(
        tx,
        p.items.map((i) => ({
          variantId: i.variant_id,
          delta: i.quantity,
          reason: 'purchase_received' as const,
          refType: 'receipt',
          refId: id,
          unitCost: i.price,
        })),
        admin.email
      );
      for (const i of p.items) {
        const b = before.get(i.variant_id);
        if (!b) continue;
        const oldQty = Math.max(b.stock ?? 0, 0);
        const newCost = D(b.buy_price).times(oldQty).plus(D(i.price).times(i.quantity)).dividedBy(oldQty + i.quantity).toDecimalPlaces(2);
        await tx.productVariant.update({ where: { variant_id: i.variant_id }, data: { buy_price: newCost } });
      }
      await tx.purchase.update({ where: { purchase_id: BigInt(id) }, data: { receipt_status: 'received', received_at: new Date() } });
      await audit(req, { action: 'receipts.receive', entityType: 'receipt', entityId: id }, tx);
    });
    invalidateCatalog();
    return sendSuccess(res, await loadReceipt(id, roleCan(admin.role, 'cost.view')));
  })
);

router.post(
  '/inventory/receipts/:id/cancel',
  can('inventory.adjust'),
  validate({ params: idParams }),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const admin = adminOf(req);
    await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT purchase_id FROM purchases WHERE purchase_id = ${BigInt(id)} FOR UPDATE`;
      const p = await tx.purchase.findUnique({ where: { purchase_id: BigInt(id) }, include: { items: true } });
      if (!p) throw new NotFoundError('Receipt not found');
      if (p.receipt_status === 'cancelled') return;
      if (p.receipt_status === 'received') {
        // Reverse the stock. This fails (and changes nothing) if some of it has already been sold.
        await applyStockChanges(
          tx,
          p.items.map((i) => ({
            variantId: i.variant_id,
            delta: -i.quantity,
            reason: 'purchase_reversed' as const,
            refType: 'receipt',
            refId: id,
            note: 'Receipt cancelled',
          })),
          admin.email
        );
      }
      await tx.purchase.update({ where: { purchase_id: BigInt(id) }, data: { receipt_status: 'cancelled' } });
      await audit(req, { action: 'receipts.cancel', entityType: 'receipt', entityId: id, before: { status: p.receipt_status } }, tx);
    });
    invalidateCatalog();
    return sendSuccess(res, await loadReceipt(id, roleCan(admin.role, 'cost.view')));
  })
);

export default router;
