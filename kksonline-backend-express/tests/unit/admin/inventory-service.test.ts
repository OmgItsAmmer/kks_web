import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/services/notification-state', () => ({ markNotificationsDirty: vi.fn() }));

/** A tiny in-memory stand-in for the Prisma transaction client. */
const makeTx = (variants: { variant_id: number; product_id: number; stock: number; alert_stock: bigint; variant_name: string }[]) => {
  const state = new Map(variants.map((v) => [v.variant_id, { ...v }]));
  const movements: any[] = [];
  const notifications: any[] = [];
  const tx: any = {
    $queryRaw: vi.fn(async (strings: TemplateStringsArray | { sql?: string }) => {
      const text = Array.isArray(strings) ? strings.join(' ') : String((strings as any).sql ?? (strings as any).strings?.join(' ') ?? '');
      if (text.includes('FOR UPDATE')) return [...state.values()].sort((a, b) => a.variant_id - b.variant_id);
      // aggregate recalculation
      return [{ product_id: 1, total_stock: BigInt([...state.values()].reduce((s, v) => s + v.stock, 0)), min_price: null, max_price: null }];
    }),
    productVariant: { update: vi.fn(async ({ where, data }: any) => { state.get(where.variant_id)!.stock = data.stock; }) },
    inventoryMovement: { createMany: vi.fn(async ({ data }: any) => { movements.push(...data); }) },
    notification: { createMany: vi.fn(async ({ data }: any) => { notifications.push(...data); }) },
    product: { update: vi.fn(async () => ({})) },
  };
  return { tx, state, movements, notifications };
};

describe('applyStockChanges', () => {
  it('removes stock, writes one ledger row, and refreshes the product', async () => {
    const { applyStockChanges } = await import('../../../src/services/inventory.service');
    const { tx, state, movements } = makeTx([{ variant_id: 1, product_id: 1, stock: 10, alert_stock: 0n, variant_name: '64GB' }]);
    await applyStockChanges(tx, [{ variantId: 1, delta: -3, reason: 'order_placed', refType: 'order', refId: 55 }], 'checkout');
    expect(state.get(1)!.stock).toBe(7);
    expect(movements).toHaveLength(1);
    expect(movements[0]).toMatchObject({ variant_id: 1, delta: -3, stock_after: 7, reason: 'order_placed', ref_type: 'order', ref_id: '55', actor: 'checkout' });
    expect(tx.product.update).toHaveBeenCalled();
  });

  it('refuses to go below zero and changes nothing', async () => {
    const { applyStockChanges } = await import('../../../src/services/inventory.service');
    const { tx, state, movements } = makeTx([{ variant_id: 1, product_id: 1, stock: 2, alert_stock: 0n, variant_name: '64GB' }]);
    await expect(applyStockChanges(tx, [{ variantId: 1, delta: -5, reason: 'order_placed' }])).rejects.toThrow(/Insufficient stock for 64GB: 2 available, 5 needed/);
    expect(state.get(1)!.stock).toBe(2);
    expect(movements).toHaveLength(0);
    expect(tx.productVariant.update).not.toHaveBeenCalled();
  });

  it('checks the running total when one variant appears twice', async () => {
    const { applyStockChanges } = await import('../../../src/services/inventory.service');
    const { tx } = makeTx([{ variant_id: 1, product_id: 1, stock: 5, alert_stock: 0n, variant_name: 'x' }]);
    await expect(
      applyStockChanges(tx, [
        { variantId: 1, delta: -3, reason: 'order_placed' },
        { variantId: 1, delta: -3, reason: 'order_placed' },
      ])
    ).rejects.toThrow(/Insufficient stock/);
  });

  it('raises a low-stock notification only when the level is crossed', async () => {
    const { applyStockChanges } = await import('../../../src/services/inventory.service');
    const { tx, notifications } = makeTx([{ variant_id: 1, product_id: 1, stock: 6, alert_stock: 5n, variant_name: '64GB' }]);
    const first = await applyStockChanges(tx, [{ variantId: 1, delta: -2, reason: 'order_placed' }]); // 6 -> 4: crosses 5
    expect(first.lowStock).toHaveLength(1);
    expect(notifications).toHaveLength(1);
    const second = await applyStockChanges(tx, [{ variantId: 1, delta: -1, reason: 'order_placed' }]); // 4 -> 3: already low
    expect(second.lowStock).toHaveLength(0);
    expect(notifications).toHaveLength(1);
  });

  it('does nothing for a zero change', async () => {
    const { applyStockChanges } = await import('../../../src/services/inventory.service');
    const { tx, movements } = makeTx([{ variant_id: 1, product_id: 1, stock: 5, alert_stock: 0n, variant_name: 'x' }]);
    const r = await applyStockChanges(tx, [{ variantId: 1, delta: 0, reason: 'correction' }]);
    expect(r.movements).toBe(0);
    expect(movements).toHaveLength(0);
  });
});
