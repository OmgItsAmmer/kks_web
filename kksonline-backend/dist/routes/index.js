import { Router } from 'express';
import authRoutes from './auth.routes.js';
import customerRoutes from './customer.routes.js';
import productRoutes from './product.routes.js';
import cartRoutes from './cart.routes.js';
import orderRoutes from './order.routes.js';
import addressRoutes from './address.routes.js';
import wishlistRoutes from './wishlist.routes.js';
import reviewRoutes from './review.routes.js';
import categoryRoutes from './category.routes.js';
import brandRoutes from './brand.routes.js';
import shopRoutes from './shop.routes.js';
import adminRoutes from './admin/index.js';
const router = Router();
// Public routes
router.use('/auth', authRoutes);
router.use('/products', productRoutes);
router.use('/categories', categoryRoutes);
router.use('/brands', brandRoutes);
router.use('/shop', shopRoutes);
// Protected routes (require authentication)
router.use('/customers', customerRoutes);
router.use('/cart', cartRoutes);
router.use('/orders', orderRoutes);
router.use('/addresses', addressRoutes);
router.use('/wishlist', wishlistRoutes);
router.use('/reviews', reviewRoutes);
// Admin routes
router.use('/admin', adminRoutes);
// Health check endpoint
router.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
    });
});
export default router;
//# sourceMappingURL=index.js.map