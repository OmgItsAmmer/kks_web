import type { NextFunction, Request, Response } from 'express';

/**
 * Cache-Control for the public catalog (plan 4.8).
 *  - Browser: 60 s. Cloudflare edge: 60 s fresh, 10 min stale-while-revalidate, 1 day stale-if-error.
 *  - Anything carrying a customer credential is never shared-cached.
 * Applied to GET routes only; everything else is `no-store` (set once in app.ts).
 */
export const publicCatalogCache = (req: Request, res: Response, next: NextFunction): void => {
  const personal = Boolean(req.headers.authorization) || /\/cart(\/|$)/.test(req.path);
  if (req.method === 'GET' && !personal) {
    res.setHeader(
      'Cache-Control',
      'public, max-age=60, s-maxage=60, stale-while-revalidate=600, stale-if-error=86400'
    );
  }
  next();
};

export const noStoreByDefault = (_req: Request, res: Response, next: NextFunction): void => {
  res.setHeader('Cache-Control', 'no-store');
  next();
};
