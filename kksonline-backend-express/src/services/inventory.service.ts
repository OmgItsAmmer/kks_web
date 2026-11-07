import { Prisma, type MovementReason } from '@prisma/client';
import type { DbTx } from '../config/database.config';
import { ApiError } from '../utils/errors';
import { ErrorCodes } from '../types/api.types';
import { markNotificationsDirty } from './notification-state';

/**
 * The one place that changes stock (plan 7.4). Every stock change, from checkout, order
 * cancellation, restock receipts and manual adjustments, goes through `applyStockChanges`:
 *  - runs inside the caller's transaction (so stock and the order or purchase commit together),
 *  - locks the variant rows (`FOR UPDATE`, in id order, so two orders never deadlock),
 *  - refuses to go below zero,
 *  - writes one `inventory_movements` row per change (the ledger),
 *  - refreshes the product's total stock and price range,
 *  - reports which variants just crossed their low-stock level.
 */

export class InsufficientStockError extends ApiError {
  constructor(public readonly variantName: string, public readonly available: number, public readonly wanted: number) {
    super(`Insufficient stock for ${variantName}: ${available} available, ${wanted} needed`, 409, ErrorCodes.INVENTORY_UNAVAILABLE);
  }
}

export interface StockChange {
  variantId: number;
  /** positive adds stock, negative removes it */
  delta: number;
  reason: MovementReason;
  refType?: string;
  refId?: string | number | bigint;
  /** unit cost, for restocks */
  unitCost?: Prisma.Decimal | number | string;
  note?: string;
}

export interface LowStockHit {
  variantId: number;
  productId: number;
  variantName: string;
  stock: number;
  alertStock: number;
}

interface LockedVariant {
  variant_id: number;
  product_id: number;
  stock: number | null;
  alert_stock: bigint;
  variant_name: string;
}

export interface StockResult {
  movements: number;
  lowStock: LowStockHit[];
  affectedProductIds: number[];
}

type Tx = DbTx;

export const applyStockChanges = async (tx: Tx, changes: StockChange[], actor?: string): Promise<StockResult> => {
  const effective = changes.filter((c) => c.delta !== 0 || c.reason === 'initial');
  if (effective.length === 0) return { movements: 0, lowStock: [], affectedProductIds: [] };

  const ids = [...new Set(effective.map((c) => c.variantId))].sort((a, b) => a - b);

  // Lock in a stable order to avoid deadlocks between concurrent orders.
  const rows = await tx.$queryRaw<LockedVariant[]>(Prisma.sql`
    SELECT variant_id, product_id, stock, alert_stock, variant_name
    FROM product_variants
    WHERE variant_id IN (${Prisma.join(ids)})
    ORDER BY variant_id
    FOR UPDATE
  `);
  const byId = new Map(rows.map((r) => [r.variant_id, r]));
  const startStock = new Map<number, number>();
  const running = new Map<number, number>();

  for (const id of ids) {
    const row = byId.get(id);
    if (!row) throw new ApiError(`Variant ${id} not found`, 404, ErrorCodes.NOT_FOUND);
    startStock.set(id, row.stock ?? 0);
    running.set(id, row.stock ?? 0);
  }

  const movementRows: Prisma.InventoryMovementCreateManyInput[] = [];
  for (const change of effective) {
    const row = byId.get(change.variantId) as LockedVariant;
    const before = running.get(change.variantId) as number;
    const after = before + change.delta;
    if (after < 0) throw new InsufficientStockError(row.variant_name, before, -change.delta);
    running.set(change.variantId, after);
    movementRows.push({
      variant_id: change.variantId,
      product_id: row.product_id,
      delta: change.delta,
      stock_after: after,
      reason: change.reason,
      ref_type: change.refType ?? null,
      ref_id: change.refId !== undefined ? String(change.refId) : null,
      unit_cost: change.unitCost !== undefined ? new Prisma.Decimal(change.unitCost) : null,
      note: change.note ?? null,
      actor: actor ?? null,
    });
  }

  for (const id of ids) {
    if (running.get(id) !== startStock.get(id)) {
      await tx.productVariant.update({ where: { variant_id: id }, data: { stock: running.get(id), updated_at: new Date() } });
    }
  }
  if (movementRows.length > 0) await tx.inventoryMovement.createMany({ data: movementRows });

  const affectedProductIds = [...new Set(ids.map((id) => (byId.get(id) as LockedVariant).product_id))];
  await recalcProductAggregates(tx, affectedProductIds);

  const lowStock: LowStockHit[] = [];
  for (const id of ids) {
    const row = byId.get(id) as LockedVariant;
    const alert = Number(row.alert_stock);
    const before = startStock.get(id) as number;
    const after = running.get(id) as number;
    // A "crossing": it was above the alert level and is now at or below it (including out of stock).
    if (alert > 0 && before > alert && after <= alert) {
      lowStock.push({ variantId: id, productId: row.product_id, variantName: row.variant_name, stock: after, alertStock: alert });
    }
  }
  if (lowStock.length > 0) {
    markNotificationsDirty();
    await tx.notification.createMany({
      data: lowStock.map((l) => ({
        NotificationType: 'low_stock',
        description: l.stock === 0 ? `Out of stock: ${l.variantName}` : `Low stock: ${l.variantName} (${l.stock} left)`,
        sub_description: `Alert level is ${l.alertStock}`,
        product_id: l.productId,
        isRead: false,
      })),
    });
  }

  return { movements: movementRows.length, lowStock, affectedProductIds };
};

/**
 * Keeps the derived product fields correct: total stock, numeric min/max price (for sorting and
 * filtering), and the display string `price_range` ("1000" or "1000 - 2500").
 * Only visible variants count toward price.
 */
export const recalcProductAggregates = async (tx: Tx, productIds: number[]): Promise<void> => {
  if (productIds.length === 0) return;
  const ids = [...new Set(productIds)];
  const rows = await tx.$queryRaw<
    { product_id: number; total_stock: bigint | null; min_price: Prisma.Decimal | null; max_price: Prisma.Decimal | null }[]
  >(Prisma.sql`
    SELECT p.product_id,
           COALESCE(SUM(v.stock), 0) AS total_stock,
           MIN(v.sell_price) FILTER (WHERE v.is_visible IS NOT FALSE) AS min_price,
           MAX(v.sell_price) FILTER (WHERE v.is_visible IS NOT FALSE) AS max_price
    FROM products p
    LEFT JOIN product_variants v ON v.product_id = p.product_id
    WHERE p.product_id IN (${Prisma.join(ids)})
    GROUP BY p.product_id
  `);
  for (const row of rows) {
    const min = row.min_price ? new Prisma.Decimal(row.min_price) : null;
    const max = row.max_price ? new Prisma.Decimal(row.max_price) : null;
    const fmt = (d: Prisma.Decimal) => d.toDecimalPlaces(2).toString();
    const range = !min || !max ? '--' : min.equals(max) ? fmt(min) : `${fmt(min)} - ${fmt(max)}`;
    await tx.product.update({
      where: { product_id: row.product_id },
      data: {
        stock_quantity: Number(row.total_stock ?? 0),
        min_price: min,
        max_price: max,
        price_range: range,
        // legacy string column the storefront still reads
        sale_price: min ? fmt(min) : '',
      },
    });
  }
};
