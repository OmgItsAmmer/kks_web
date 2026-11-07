import crypto from 'node:crypto';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { config } from '../../../config/env.config';
import { sendError } from '../../../utils/response';
import { findAdminAccount } from '../auth/accounts';
import {
  SESSION_COOKIE,
  SESSION_REFRESH_AFTER_SECONDS,
  setSessionCookie,
  signSession,
  verifySession,
} from '../auth/session';
import { roleCan, type Permission } from '../permissions';
import type { AdminRequest } from './types';

/** A short id on every admin request, returned in a header and logged, so an error can be traced. */
export const requestId: RequestHandler = (req, res, next) => {
  const id = crypto.randomUUID();
  (req as AdminRequest).requestId = id;
  res.setHeader('X-Request-Id', id);
  next();
};

/**
 * CSRF defence (plan 5.1): beyond SameSite=Lax, every state-changing admin request must come from
 * the admin app's own origin.
 */
export const originCheck: RequestHandler = (req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const origin = req.headers.origin;
  if (typeof origin !== 'string' || origin !== config.admin.origin) {
    sendError(res, 'Request origin not allowed', 403, 'FORBIDDEN');
    return;
  }
  next();
};

/** Reads and verifies the admin session cookie, and re-checks the account still exists. */
export const requireAdmin: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  const token = (req.cookies as Record<string, string> | undefined)?.[SESSION_COOKIE];
  const session = token ? verifySession(token) : null;
  if (!session) {
    sendError(res, 'Sign in required', 401, 'UNAUTHORIZED');
    return;
  }
  // Removing or demoting an account takes effect at once.
  const account = findAdminAccount(session.email);
  if (!account || account.role !== session.role) {
    sendError(res, 'Sign in required', 401, 'UNAUTHORIZED');
    return;
  }
  (req as AdminRequest).admin = { email: account.email, name: account.name, role: account.role };

  const age = Math.floor(Date.now() / 1000) - (session.iat ?? 0);
  if (age > SESSION_REFRESH_AFTER_SECONDS) {
    setSessionCookie(res, signSession({ email: account.email, role: account.role }));
  }
  next();
};

/** Route-level permission check against the map in permissions.ts. */
export const can =
  (permission: Permission): RequestHandler =>
  (req, res, next) => {
    const admin = (req as AdminRequest).admin;
    if (!admin) {
      sendError(res, 'Sign in required', 401, 'UNAUTHORIZED');
      return;
    }
    if (!roleCan(admin.role, permission)) {
      sendError(res, 'You do not have permission to do this', 403, 'FORBIDDEN');
      return;
    }
    next();
  };
