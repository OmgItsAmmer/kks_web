import type { Request } from 'express';
import { db, type DbTx } from '../../../config/database.config';
import { getClientIp } from '../../../middleware/client-ip';
import { logger } from '../../../utils/logger';
import type { AdminRequest } from './types';

export interface AuditEntry {
  action: string;
  entityType?: string;
  entityId?: string | number | bigint;
  before?: unknown;
  after?: unknown;
}

/** Plain JSON copy (Decimals and BigInts become strings and numbers). */
const plain = (value: unknown): unknown =>
  value === undefined
    ? undefined
    : JSON.parse(JSON.stringify(value, (_k, v) => (typeof v === 'bigint' ? Number(v) : v)));

/**
 * Records an admin action. Pass the transaction client so the audit row commits or rolls back
 * together with the change itself.
 */
export const audit = async (req: Request, entry: AuditEntry, tx?: DbTx): Promise<void> => {
  const client = tx ?? db;
  const adminReq = req as AdminRequest;
  try {
    await client.adminAuditLog.create({
      data: {
        actor_admin_id: adminReq.admin?.email ?? 'unknown',
        action: entry.action,
        entity_type: entry.entityType ?? null,
        entity_id: entry.entityId !== undefined ? String(entry.entityId) : null,
        before: entry.before === undefined ? undefined : (plain(entry.before) as object),
        after: entry.after === undefined ? undefined : (plain(entry.after) as object),
        ip_address: getClientIp(req),
        request_id: adminReq.requestId ?? null,
      },
    });
  } catch (error) {
    // Inside a transaction a failure must abort the change; outside, do not break the request.
    if (tx) throw error;
    logger.error('Failed to write audit log', { error, action: entry.action });
  }
};
