import { Router } from 'express';
import customerRoutes from './customer.routes.ts';
import productRoutes from './product.routes.ts';
import cartRoutes from './cart.routes.ts';
import orderRoutes from './order.routes.ts';
import addressRoutes from './address.routes.ts';
import wishlistRoutes from './wishlist.routes.ts';
import reviewRoutes from './review.routes.ts';
import categoryRoutes from './category.routes.ts';
import brandRoutes from './brand.routes.ts';
import shopRoutes from './shop.routes.ts';
import adminRoutes from './admin/index.ts';
import authRoutes from './auth.routes.ts';
import { checkDatabaseConnection } from '../config/database.config.ts';

const router = Router();

// Public routes
router.use('/auth', authRoutes);
router.use('/products', productRoutes);
router.use('/categories', categoryRoutes);
router.use('/brands', brandRoutes);
router.use('/shop', shopRoutes);

// Customer routes (pass customer_id via query or body)
router.use('/customers', customerRoutes);
router.use('/cart', cartRoutes);
router.use('/orders', orderRoutes);
router.use('/addresses', addressRoutes);
router.use('/wishlist', wishlistRoutes);
router.use('/reviews', reviewRoutes);

// Admin routes
router.use('/admin', adminRoutes);

// Health check endpoint
router.get('/health', async (req, res) => {
  const dbHealthy = await checkDatabaseConnection();

  res.json({
    status: dbHealthy ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    database: dbHealthy ? 'connected' : 'disconnected',
  });
});

export default router;
