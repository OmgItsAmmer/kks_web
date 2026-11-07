import { Router } from 'express';
import { OrderStatus, PaymentMethod, Prisma } from '@prisma/client';
import { z } from 'zod';
import { db } from '../../../config/database.config';
import { asyncHandler } from '../../../middleware/error.middleware';
import { validate } from '../../../middleware/validation.middleware';
import { imageService } from '../../../services/image.service';
import { applyStockChanges, recalcProductAggregates } from '../../../services/inventory.service';
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from '../../../utils/errors';
import { sendPaginated, sendSuccess } from '../../../utils/response';
import { invalidateCatalog } from '../common/after-write';
import { audit } from '../common/audit';
import { expectedUpdatedAt, idParams, nonNegativeMoney, paging, sameInstant, skipTake } from '../common/http';
import { can } from '../common/middleware';
import { adminOf } from '../common/types';
import { roleCan } from '../permissions';
import { canTransition, itemsEditable, nextStatuses } from './order-state';

const router = Router();

const STATUSES = Object.values(OrderStatus) as [OrderStatus, ...OrderStatus[]];
const METHODS = Object.values(PaymentMethod) as [PaymentMethod, ...PaymentMethod[]];

const D = (v: Prisma.Decimal | number | string | null | undefined): Prisma.Decimal => new Prisma.Decimal(v ?? 0);

/** subtotal + tax + shipping - discount */
export const orderTotal = (o: {
  sub_total: Prisma.Decimal;
  tax: Prisma.Decimal | null;
  shipping_fee: Prisma.Decimal | null;
  discount: Prisma.Decimal | null;
}): Prisma.Decimal => D(o.sub_total).plus(D(o.tax)).plus(D(o.shipping_fee)).minus(D(o.discount));

const staleError = () => new ConflictError('This order was changed by someone else. Reload and try again.');

// ---------------------------------------------------------------------------
// List
// ---------------------------------------------------------------------------

const listQuery = paging.extend({
  status: z.enum(STATUSES).optional(),
  from: z.string().date().optional(),
  to: z.string().date().optional(),
  paymentMethod: z.enum(METHODS).optional(),
  customerId: z.coerce.number().int().positive().optional(),
  q: z.string().trim().max(100).optional(),
  sort: z.enum(['order_id', 'order_date', 'sub_total']).default('order_id'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

router.get(
  '/orders',
  can('orders.view'),
  validate({ query: listQuery }),
  asyncHandler(async (req, res) => {
    const q = req.query as unknown as z.infer<typeof listQuery>;
    const where: Prisma.OrderWhereInput = {};
    if (q.status) where.status = q.status;
    if (q.paymentMethod) where.payment_method = q.paymentMethod;
    if (q.customerId) where.customer_id = q.customerId;
    if (q.from || q.to) {
      where.order_date = {};
      if (q.from) where.order_date.gte = new Date(q.from);
      if (q.to) where.order_date.lte = new Date(q.to);
    }
    if (q.q) {
      const asId = Number(q.q.replace(/^#/, ''));
      where.OR = [
        ...(Number.isInteger(asId) && asId > 0 ? [{ order_id: asId }] : []),
        { customer: { first_name: { contains: q.q, mode: 'insensitive' as const } } },
        { customer: { last_name: { contains: q.q, mode: 'insensitive' as const } } },
        { customer: { phone_number: { contains: q.q } } },
      ];
    }

    const [rows, total] = await Promise.all([
      db.order.findMany({
        where,
        orderBy: { [q.sort]: q.order },
        ...skipTake(q.page, q.pageSize),
        include: { customer: true, _count: { select: { order_items: true } } },
      }),
      db.order.count({ where }),
    ]);
    const paid = await db.orderPayment.groupBy({
      by: ['order_id'],
      where: { order_id: { in: rows.map((r) => r.order_id) } },
      _sum: { amount: true },
    });
    const paidBy = new Map(paid.map((p) => [p.order_id, p._sum.amount]));
    const items = rows.map((o) => {
      const totalAmount = orderTotal(o);
      const amountPaid = D(paidBy.get(o.order_id));
      return {
        id: o.order_id,
        date: o.order_date,
        createdAt: o.created_at,
        status: o.status,
        customerId: o.customer_id,
        customerName: o.customer ? `${o.customer.first_name} ${o.customer.last_name ?? ''}`.trim() : 'Guest',
        phone: o.customer?.phone_number ?? null,
        itemCount: o._count.order_items,
        total: totalAmount,
        amountPaid,
        balance: totalAmount.minus(amountPaid),
        paymentMethod: o.payment_method,
        shippingMethod: o.shipping_method,
        hasReceipt: Boolean(o.payment_receipt_path),
        updatedAt: o.updated_at,
      };
    });
    return sendPaginated(res, items, { page: q.page, pageSize: q.pageSize, total });
  })
);

// ---------------------------------------------------------------------------
// Detail
// ---------------------------------------------------------------------------

const loadOrderDetail = async (id: number, cost: boolean) => {
  const o = await db.order.findUnique({
    where: { order_id: id },
    include: {
      customer: true,
      address: true,
      order_items: true,
      payments: { orderBy: { created_at: 'asc' } },
      status_history: { orderBy: { created_at: 'asc' } },
    },
  });
  if (!o) throw new NotFoundError('Order not found');

  const variantIds = o.order_items.map((i) => i.variant_id);
  const productIds = [...new Set(o.order_items.map((i) => i.product_id))];
  const [variants, products, images, snapshot] = await Promise.all([
    db.productVariant.findMany({ where: { variant_id: { in: variantIds } } }),
    db.product.findMany({ where: { product_id: { in: productIds } }, select: { product_id: true, name: true } }),
    imageService.getMainImagesForEntities(productIds, 'products'),
    o.address_id ? db.orderAddress.findFirst({ where: { address_id: o.address_id }, orderBy: { order_address_id: 'desc' } }) : null,
  ]);
  const variantBy = new Map(variants.map((v) => [v.variant_id, v]));
  const productBy = new Map(products.map((p) => [p.product_id, p.name]));

  const total = orderTotal(o);
  const amountPaid = o.payments.reduce((sum, p) => sum.plus(p.amount), new Prisma.Decimal(0));
  const ship = snapshot ?? o.address;
  const receiptUrl = o.payment_receipt_path ? await imageService.createAdminReceiptUrl(o.payment_receipt_path).catch(() => null) : null;

  return {
    id: o.order_id,
    date: o.order_date,
    createdAt: o.created_at,
    updatedAt: o.updated_at,
    status: o.status,
    nextStatuses: nextStatuses(o.status),
    itemsEditable: itemsEditable(o.status),
    cancelReason: o.cancel_reason,
    cancelledAt: o.cancelled_at,
    adminNote: o.admin_note,
    paymentMethod: o.payment_method,
    shippingMethod: o.shipping_method,
    receiptUrl,
    customer: o.customer
      ? {
          id: o.customer.customer_id,
          name: `${o.customer.first_name} ${o.customer.last_name ?? ''}`.trim(),
          phone: o.customer.phone_number,
          email: o.customer.email,
        }
      : null,
    shippingAddress: ship
      ? {
          fullName: ship.full_name,
          phone: ship.phone_number,
          address: ship.shipping_address,
          city: ship.city,
          postalCode: ship.postal_code,
          country: ship.country,
        }
      : null,
    items: o.order_items.map((i) => {
      const v = variantBy.get(i.variant_id);
      return {
        productId: i.product_id,
        variantId: i.variant_id,
        productName: productBy.get(i.product_id) ?? 'Deleted product',
        variantName: v?.variant_name ?? '',
        sku: v?.sku ?? null,
        imageUrl: images.get(i.product_id) ?? null,
        quantity: i.quantity,
        price: i.price,
        lineTotal: D(i.price).times(i.quantity),
        ...(cost ? { totalBuyPrice: i.total_buy_price } : {}),
        stockNow: v?.stock ?? null,
      };
    }),
    totals: {
      subTotal: o.sub_total,
      tax: D(o.tax),
      shipping: D(o.shipping_fee),
      discount: D(o.discount),
      total,
      amountPaid,
      balance: total.minus(amountPaid),
      ...(cost ? { cost: o.buying_price, profit: o.buying_price ? total.minus(D(o.shipping_fee)).minus(D(o.buying_price)) : null } : {}),
    },
    payments: o.payments.map((p) => ({
      id: p.payment_id,
      amount: p.amount,
      method: p.method,
      reference: p.reference,
      note: p.note,
      receivedBy: p.received_by,
      createdAt: p.created_at,
    })),
    history: o.status_history.map((h) => ({
      id: h.history_id,
      from: h.from_status,
      to: h.to_status,
      note: h.note,
      actor: h.actor,
      createdAt: h.created_at,
    })),
  };
};

router.get(
  '/orders/:id',
  can('orders.view'),
  validate({ params: idParams }),
  asyncHandler(async (req, res) => sendSuccess(res, await loadOrderDetail(Number(req.params.id), roleCan(adminOf(req).role, 'cost.view'))))
);

// ---------------------------------------------------------------------------
// Status transitions
// ---------------------------------------------------------------------------

const transitionBody = z.object({
  to: z.enum(STATUSES),
  note: z.string().trim().max(500).optional(),
  expectedUpdatedAt,
});

router.post(
  '/orders/:id/transition',
  can('orders.status'),
  validate({ params: idParams, body: transitionBody }),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const { to, note, expectedUpdatedAt: expected } = req.body as z.infer<typeof transitionBody>;
    const admin = adminOf(req);
    if (to === 'cancelled' && !roleCan(admin.role, 'orders.cancel')) {
      throw new ForbiddenError('Only a manager or owner can cancel an order');
    }
    if (to === 'cancelled' && !note) throw new BadRequestError('Please give a reason for cancelling');

    let restocked = false;
    await db.$transaction(async (tx) => {
      // Lock the order so two admins cannot move it at the same moment.
      await tx.$queryRaw`SELECT order_id FROM orders WHERE order_id = ${id} FOR UPDATE`;
      const order = await tx.order.findUnique({ where: { order_id: id }, include: { order_items: true } });
      if (!order) throw new NotFoundError('Order not found');
      if (!sameInstant(order.updated_at, expected)) throw staleError();
      if (!canTransition(order.status, to)) {
        throw new BadRequestError(`An order that is ${order.status} cannot be moved to ${to}`);
      }
      if (to === 'cancelled') {
        await applyStockChanges(
          tx,
          order.order_items.map((i) => ({
            variantId: i.variant_id,
            delta: i.quantity,
            reason: 'order_cancelled' as const,
            refType: 'order',
            refId: id,
            note: note,
          })),
          admin.email
        );
        restocked = order.order_items.length > 0;
      }
      await tx.order.update({
        where: { order_id: id },
        data: {
          status: to,
          cancelled_at: to === 'cancelled' ? new Date() : undefined,
          cancel_reason: to === 'cancelled' ? note : undefined,
          updated_at: new Date(),
        },
      });
      await tx.orderStatusHistory.create({
        data: { order_id: id, from_status: order.status, to_status: to, note: note ?? null, actor: admin.email },
      });
      await audit(req, { action: 'orders.transition', entityType: 'order', entityId: id, before: { status: order.status }, after: { status: to, note } }, tx);
    });
    if (restocked) invalidateCatalog();
    return sendSuccess(res, await loadOrderDetail(id, roleCan(admin.role, 'cost.view')));
  })
);

// ---------------------------------------------------------------------------
// Note, payments, item edits
// ---------------------------------------------------------------------------

router.patch(
  '/orders/:id/note',
  can('orders.status'),
  validate({ params: idParams, body: z.object({ note: z.string().trim().max(1000) }) }),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const { note } = req.body as { note: string };
    const order = await db.order.update({ where: { order_id: id }, data: { admin_note: note || null } }).catch(() => null);
    if (!order) throw new NotFoundError('Order not found');
    await audit(req, { action: 'orders.note', entityType: 'order', entityId: id, after: { note } });
    return sendSuccess(res, await loadOrderDetail(id, roleCan(adminOf(req).role, 'cost.view')));
  })
);

const paymentBody = z.object({
  amount: nonNegativeMoney.refine((d) => d.greaterThan(0), 'Amount must be more than zero'),
  method: z.enum(METHODS),
  reference: z.string().trim().max(120).optional(),
  note: z.string().trim().max(500).optional(),
});

router.post(
  '/orders/:id/payments',
  can('orders.payment'),
  validate({ params: idParams, body: paymentBody }),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const body = req.body as z.infer<typeof paymentBody>;
    const admin = adminOf(req);
    await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT order_id FROM orders WHERE order_id = ${id} FOR UPDATE`;
      const order = await tx.order.findUnique({ where: { order_id: id }, include: { payments: true } });
      if (!order) throw new NotFoundError('Order not found');
      if (order.status === 'cancelled') throw new BadRequestError('Cannot record a payment on a cancelled order');
      const paid = order.payments.reduce((s, p) => s.plus(p.amount), new Prisma.Decimal(0));
      if (paid.plus(body.amount).greaterThan(orderTotal(order))) {
        throw new BadRequestError('This payment is more than the amount still due');
      }
      const payment = await tx.orderPayment.create({
        data: { order_id: id, amount: body.amount, method: body.method, reference: body.reference ?? null, note: body.note ?? null, received_by: admin.email },
      });
      await tx.order.update({ where: { order_id: id }, data: { updated_at: new Date() } });
      await audit(req, { action: 'orders.payment', entityType: 'order', entityId: id, after: payment }, tx);
    });
    return sendSuccess(res, await loadOrderDetail(id, roleCan(admin.role, 'cost.view')));
  })
);

const itemsBody = z.object({
  items: z
    .array(
      z.object({
        variantId: z.number().int().positive(),
        quantity: z.number().int().min(1).max(1000),
        price: nonNegativeMoney.optional(),
      })
    )
    .min(1)
    .max(100),
  expectedUpdatedAt,
});

router.put(
  '/orders/:id/items',
  can('orders.payment'),
  validate({ params: idParams, body: itemsBody }),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const { items, expectedUpdatedAt: expected } = req.body as z.infer<typeof itemsBody>;
    const admin = adminOf(req);

    const variantIds = [...new Set(items.map((i) => i.variantId))];
    if (variantIds.length !== items.length) throw new BadRequestError('Each variant may appear only once');

    await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT order_id FROM orders WHERE order_id = ${id} FOR UPDATE`;
      const order = await tx.order.findUnique({ where: { order_id: id }, include: { order_items: true } });
      if (!order) throw new NotFoundError('Order not found');
      if (!sameInstant(order.updated_at, expected)) throw staleError();
      if (!itemsEditable(order.status)) throw new BadRequestError('Items can only be changed while the order is pending or confirmed');

      const variants = await tx.productVariant.findMany({ where: { variant_id: { in: variantIds } } });
      if (variants.length !== variantIds.length) throw new NotFoundError('A variant no longer exists');
      const variantBy = new Map(variants.map((v) => [v.variant_id, v]));
      const oldQty = new Map(order.order_items.map((i) => [i.variant_id, i.quantity]));
      const oldPrice = new Map(order.order_items.map((i) => [i.variant_id, i.price]));

      // Stock moves only by the difference between the old and new quantity.
      const changes: Parameters<typeof applyStockChanges>[1] = [];
      for (const vid of new Set([...oldQty.keys(), ...variantIds])) {
        const delta = (oldQty.get(vid) ?? 0) - (items.find((i) => i.variantId === vid)?.quantity ?? 0);
        if (delta !== 0) changes.push({ variantId: vid, delta, reason: 'correction', refType: 'order', refId: id, note: 'Order items edited' });
      }
      await applyStockChanges(tx, changes, admin.email);

      await tx.orderItem.deleteMany({ where: { order_id: id } });
      let subTotal = new Prisma.Decimal(0);
      let cost = new Prisma.Decimal(0);
      const rows: Prisma.OrderItemCreateManyInput[] = items.map((i) => {
        const v = variantBy.get(i.variantId) as NonNullable<ReturnType<typeof variantBy.get>>;
        const price = i.price ?? oldPrice.get(i.variantId) ?? v.sell_price;
        subTotal = subTotal.plus(D(price).times(i.quantity));
        const buy = D(v.buy_price).times(i.quantity);
        cost = cost.plus(buy);
        return { order_id: id, product_id: v.product_id, variant_id: v.variant_id, quantity: i.quantity, price, total_buy_price: buy };
      });
      await tx.orderItem.createMany({ data: rows });
      await tx.order.update({ where: { order_id: id }, data: { sub_total: subTotal, buying_price: cost, updated_at: new Date() } });
      await recalcProductAggregates(tx, [...new Set(rows.map((r) => r.product_id))]);
      await audit(req, { action: 'orders.items', entityType: 'order', entityId: id, before: order.order_items, after: rows }, tx);
    });
    invalidateCatalog();
    return sendSuccess(res, await loadOrderDetail(id, roleCan(admin.role, 'cost.view')));
  })
);

export default router;
