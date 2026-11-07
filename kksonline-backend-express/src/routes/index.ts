import { Router } from 'express';
import customerRoutes from './customer.routes';
import productRoutes from './product.routes';
import cartRoutes from './cart.routes';
import orderRoutes from './order.routes';
import addressRoutes from './address.routes';
import wishlistRoutes from './wishlist.routes';
import reviewRoutes from './review.routes';
import categoryRoutes from './category.routes';
import brandRoutes from './brand.routes';
import shopRoutes from './shop.routes';
import collectionRoutes from './collection.routes';
import adminRoutes from '../modules/admin/index';
import jobsRoutes from '../modules/jobs/jobs.routes';
import { publicCatalogCache } from '../middleware/http-cache';
import authRoutes from './auth.routes';
import { checkDatabaseConnection } from '../config/database.config';

const router = Router();

// Public routes
router.use('/auth', authRoutes);
// Public catalog: cached at Cloudflare's edge for 60 s (plan 4.8). Personal paths are excluded in the middleware.
router.use('/products', publicCatalogCache, productRoutes);
router.use('/categories', publicCatalogCache, categoryRoutes);
router.use('/brands', publicCatalogCache, brandRoutes);
router.use('/shop', publicCatalogCache, shopRoutes);
router.use('/collections', publicCatalogCache, collectionRoutes);

// Customer routes (pass customer_id via query or body)
router.use('/customers', customerRoutes);
router.use('/cart', cartRoutes);
router.use('/orders', orderRoutes);
router.use('/addresses', addressRoutes);
router.use('/wishlist', wishlistRoutes);
router.use('/reviews', reviewRoutes);

// Admin API (session cookie + role checks) and scheduled jobs (secret header)
router.use('/admin', adminRoutes);
router.use('/internal/jobs', jobsRoutes);

// Health checks (plan 4.7). /health never touches the database, so uptime monitors and Fly's own
// checks do not keep the sleeping Neon database awake. /health/db is for deploy checks only.
router.get('/health', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: process.env.npm_package_version || '1.0.0' });
});

router.get('/health/db', async (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const dbHealthy = await checkDatabaseConnection();
  res.status(dbHealthy ? 200 : 503).json({
    status: dbHealthy ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    database: dbHealthy ? 'connected' : 'disconnected',
  });
});

export default router;
