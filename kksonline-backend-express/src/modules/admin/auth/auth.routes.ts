import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { getClientIp } from '../../../middleware/client-ip';
import { asyncHandler } from '../../../middleware/error.middleware';
import { validate } from '../../../middleware/validation.middleware';
import { sendError, sendSuccess } from '../../../utils/response';
import { audit } from '../common/audit';
import { adminOf, type AdminRequest } from '../common/types';
import { requireAdmin } from '../common/middleware';
import { adminSignInConfigured, findAdminAccount } from './accounts';
import { clearSessionCookie, setSessionCookie, signSession } from './session';

const router = Router();

// A real hash of a random string: used so unknown emails take as long as wrong passwords.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 12);

const limitMessage = {
  success: false,
  error: 'Too many sign-in attempts. Please wait 15 minutes and try again.',
  errorCode: 'RATE_LIMIT_EXCEEDED',
};

// 5 failed attempts per email+IP, and 30 per IP, every 15 minutes (plan 5.1)
const perAccountLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: limitMessage,
  keyGenerator: (req) => `${getClientIp(req)}|${String((req.body as { email?: string })?.email ?? '').toLowerCase()}`,
});
const perIpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: limitMessage,
  keyGenerator: (req) => getClientIp(req),
});

const loginBody = z.object({
  email: z.string().email().max(200),
  password: z.string().min(1).max(200),
});

router.post(
  '/login',
  perIpLimiter,
  validate({ body: loginBody }),
  perAccountLimiter,
  asyncHandler(async (req, res) => {
    if (!adminSignInConfigured()) {
      return sendError(res, 'Admin sign-in is not configured on this server', 503);
    }
    const { email, password } = req.body as z.infer<typeof loginBody>;
    const account = findAdminAccount(email);
    const ok = await bcrypt.compare(password, account?.passwordHash ?? DUMMY_HASH);
    if (!account || !ok) {
      await new Promise((resolve) => setTimeout(resolve, 400)); // slow guessing down a little
      return sendError(res, 'Wrong email or password', 401, 'UNAUTHORIZED');
    }
    setSessionCookie(res, signSession({ email: account.email, role: account.role }));
    (req as AdminRequest).admin = { email: account.email, name: account.name, role: account.role };
    await audit(req, { action: 'auth.login' });
    return sendSuccess(res, { email: account.email, name: account.name, role: account.role });
  })
);

router.post(
  '/logout',
  requireAdmin,
  asyncHandler(async (req, res) => {
    await audit(req, { action: 'auth.logout' });
    clearSessionCookie(res);
    return sendSuccess(res, { signedOut: true });
  })
);

router.get('/me', requireAdmin, (req, res) => {
  const admin = adminOf(req);
  return sendSuccess(res, { email: admin.email, name: admin.name, role: admin.role });
});

export default router;
