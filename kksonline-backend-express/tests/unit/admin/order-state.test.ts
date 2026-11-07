import { describe, expect, it } from 'vitest';
import { FINAL_STATUSES, TRANSITIONS, canTransition, itemsEditable, nextStatuses } from '../../../src/modules/admin/orders/order-state';

const ALL = ['pending', 'confirmed', 'processing', 'ready', 'delivered', 'completed', 'cancelled'] as const;

describe('order state machine', () => {
  it('walks the happy path one step at a time', () => {
    expect(canTransition('pending', 'confirmed')).toBe(true);
    expect(canTransition('confirmed', 'processing')).toBe(true);
    expect(canTransition('processing', 'ready')).toBe(true);
    expect(canTransition('ready', 'delivered')).toBe(true);
    expect(canTransition('delivered', 'completed')).toBe(true);
  });

  it('lets pickup orders skip "delivered"', () => {
    expect(canTransition('ready', 'completed')).toBe(true);
  });

  it('does not allow skipping steps', () => {
    expect(canTransition('pending', 'processing')).toBe(false);
    expect(canTransition('pending', 'completed')).toBe(false);
    expect(canTransition('confirmed', 'ready')).toBe(false);
  });

  it('does not allow going backwards', () => {
    expect(canTransition('confirmed', 'pending')).toBe(false);
    expect(canTransition('ready', 'processing')).toBe(false);
    expect(canTransition('delivered', 'ready')).toBe(false);
  });

  it('allows cancelling only before delivery', () => {
    for (const s of ['pending', 'confirmed', 'processing', 'ready'] as const) expect(canTransition(s, 'cancelled')).toBe(true);
    expect(canTransition('delivered', 'cancelled')).toBe(false);
  });

  it('treats completed and cancelled as final (an order is never reopened)', () => {
    for (const final of FINAL_STATUSES) {
      expect(nextStatuses(final)).toHaveLength(0);
      for (const to of ALL) expect(canTransition(final, to)).toBe(false);
    }
  });

  it('never allows a status to move to itself', () => {
    for (const s of ALL) expect(canTransition(s, s)).toBe(false);
  });

  it('describes every status', () => {
    expect(Object.keys(TRANSITIONS).sort()).toEqual([...ALL].sort());
  });

  it('lets items be edited only before preparation starts', () => {
    expect(itemsEditable('pending')).toBe(true);
    expect(itemsEditable('confirmed')).toBe(true);
    for (const s of ['processing', 'ready', 'delivered', 'completed', 'cancelled'] as const) expect(itemsEditable(s)).toBe(false);
  });
});
