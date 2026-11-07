import type { CookieOptions, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../../../config/env.config';
import type { AdminRole } from '../permissions';

export const SESSION_COOKIE = 'kks_admin_session';
export const SESSION_TTL_SECONDS = 12 * 60 * 60;
/** Re-issue the cookie when it is older than this, so active people stay signed in. */
export const SESSION_REFRESH_AFTER_SECONDS = 30 * 60;

export interface SessionPayload {
  email: string;
  role: AdminRole;
  iat?: number;
}

const secret = (): string => {
  const s = config.admin.sessionSecret;
  if (!s || s.length < 32) throw new Error('ADMIN_SESSION_SECRET must be at least 32 characters');
  return s;
};

export const signSession = (payload: { email: string; role: AdminRole }): string =>
  jwt.sign(payload, secret(), { expiresIn: SESSION_TTL_SECONDS, issuer: 'kks-admin', audience: 'kks-admin' });

export const verifySession = (token: string): SessionPayload | null => {
  try {
    return jwt.verify(token, secret(), { issuer: 'kks-admin', audience: 'kks-admin' }) as SessionPayload;
  } catch {
    return null;
  }
};

const cookieOptions = (): CookieOptions => ({
  httpOnly: true,
  secure: config.server.isProduction,
  sameSite: 'lax',
  path: '/',
  domain: config.admin.cookieDomain,
});

export const setSessionCookie = (res: Response, token: string): void => {
  res.cookie(SESSION_COOKIE, token, { ...cookieOptions(), maxAge: SESSION_TTL_SECONDS * 1000 });
};

export const clearSessionCookie = (res: Response): void => {
  res.clearCookie(SESSION_COOKIE, cookieOptions());
};
