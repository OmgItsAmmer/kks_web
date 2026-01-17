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
import adminRoutes from './admin/index';
import authRoutes from './auth.routes';
import { checkDatabaseConnection } from '../config/database.config';

const router = Router();

// Public routes
router.use('/auth', authRoutes);
router.use('/products', productRoutes);
router.use('/categories', categoryRoutes);
router.use('/brands', brandRoutes);
router.use('/shop', shopRoutes);
router.use('/collections', collectionRoutes);

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
