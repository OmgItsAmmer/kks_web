import type { Request } from 'express';

/**
 * The real visitor address (plan 4.11). Behind Cloudflare and Fly, `req.ip` is a proxy address, so a
 * rate limiter that keys on it would treat every visitor as one person and block them all together.
 * `CF-Connecting-IP` is set by Cloudflare, `Fly-Client-IP` by Fly's proxy.
 */
export const getClientIp = (req: Request): string => {
  const cf = req.headers['cf-connecting-ip'];
  if (typeof cf === 'string' && cf) return cf.trim();
  const fly = req.headers['fly-client-ip'];
  if (typeof fly === 'string' && fly) return fly.trim();
  return req.ip || req.socket.remoteAddress || 'unknown';
};
