import type { OrderStatus } from '@prisma/client';

/**
 * Order state machine (plan 7.5). Pure and dependency-free so it can be unit tested and mirrored
 * by the admin UI (which only offers the allowed next steps).
 *
 *   pending -> confirmed -> processing -> ready -> delivered -> completed
 *   ready -> completed (pickup orders skip delivered)
 *   pending | confirmed | processing | ready -> cancelled (stock is returned)
 *
 * `completed` and `cancelled` are final: an order is never un-cancelled; create a new one instead.
 */
export const TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['processing', 'cancelled'],
  processing: ['ready', 'cancelled'],
  ready: ['delivered', 'completed', 'cancelled'],
  delivered: ['completed'],
  completed: [],
  cancelled: [],
};

export const FINAL_STATUSES: readonly OrderStatus[] = ['completed', 'cancelled'];

export const canTransition = (from: OrderStatus, to: OrderStatus): boolean => TRANSITIONS[from].includes(to);

export const nextStatuses = (from: OrderStatus): readonly OrderStatus[] => TRANSITIONS[from];

/** Items may be edited only before the order is being prepared. */
export const itemsEditable = (status: OrderStatus): boolean => status === 'pending' || status === 'confirmed';
