import type { Request } from 'express';
import type { AdminRole } from '../permissions';

export interface AdminIdentity {
  email: string;
  name: string;
  role: AdminRole;
}

export interface AdminRequest extends Request {
  admin?: AdminIdentity;
  requestId?: string;
}

export const adminOf = (req: Request): AdminIdentity => {
  const admin = (req as AdminRequest).admin;
  if (!admin) throw new Error('requireAdmin must run before this handler');
  return admin;
};
