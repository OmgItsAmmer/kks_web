import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { getClientIp } from '../../middleware/client-ip';
import aiRoutes from './ai/ai.routes';
import authRoutes from './auth/auth.routes';
import catalogRoutes from './catalog/catalog.routes';
import collectionsRoutes from './catalog/collections.routes';
import { originCheck, requestId, requireAdmin } from './common/middleware';
import inventoryRoutes from './inventory/inventory.routes';
import ordersRoutes from './orders/orders.routes';
import peopleRoutes from './people/people.routes';
import reportsRoutes from './reports/reports.routes';
import systemRoutes from './system/system.routes';

/**
 * Everything under /api/v1/admin. The only route without a session is login (inside authRoutes).
 * Every other router sits behind `requireAdmin` and declares its own `can(...)` permission per route.
 */
const router = Router();

router.use(requestId);
router.use(originCheck);

router.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 240,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => getClientIp(req),
    message: { success: false, error: 'Too many requests. Please slow down.', errorCode: 'RATE_LIMIT_EXCEEDED' },
  })
);

router.use('/auth', authRoutes);

router.use(requireAdmin);
router.use(catalogRoutes);
router.use(collectionsRoutes);
router.use(ordersRoutes);
router.use(inventoryRoutes);
router.use(peopleRoutes);
router.use(reportsRoutes);
router.use(systemRoutes);
router.use(aiRoutes);

export default router;
