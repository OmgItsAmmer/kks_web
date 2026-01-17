"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const customer_routes_ts_1 = __importDefault(require("./customer.routes.ts"));
const product_routes_ts_1 = __importDefault(require("./product.routes.ts"));
const cart_routes_ts_1 = __importDefault(require("./cart.routes.ts"));
const order_routes_ts_1 = __importDefault(require("./order.routes.ts"));
const address_routes_ts_1 = __importDefault(require("./address.routes.ts"));
const wishlist_routes_ts_1 = __importDefault(require("./wishlist.routes.ts"));
const review_routes_ts_1 = __importDefault(require("./review.routes.ts"));
const category_routes_ts_1 = __importDefault(require("./category.routes.ts"));
const brand_routes_ts_1 = __importDefault(require("./brand.routes.ts"));
const shop_routes_ts_1 = __importDefault(require("./shop.routes.ts"));
const index_ts_1 = __importDefault(require("./admin/index.ts"));
const auth_routes_ts_1 = __importDefault(require("./auth.routes.ts"));
const database_config_ts_1 = require("../config/database.config.ts");
const router = (0, express_1.Router)();
// Public routes
router.use('/auth', auth_routes_ts_1.default);
router.use('/products', product_routes_ts_1.default);
router.use('/categories', category_routes_ts_1.default);
router.use('/brands', brand_routes_ts_1.default);
router.use('/shop', shop_routes_ts_1.default);
// Customer routes (pass customer_id via query or body)
router.use('/customers', customer_routes_ts_1.default);
router.use('/cart', cart_routes_ts_1.default);
router.use('/orders', order_routes_ts_1.default);
router.use('/addresses', address_routes_ts_1.default);
router.use('/wishlist', wishlist_routes_ts_1.default);
router.use('/reviews', review_routes_ts_1.default);
// Admin routes
router.use('/admin', index_ts_1.default);
// Health check endpoint
router.get('/health', async (req, res) => {
    const dbHealthy = await (0, database_config_ts_1.checkDatabaseConnection)();
    res.json({
        status: dbHealthy ? 'ok' : 'degraded',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        database: dbHealthy ? 'connected' : 'disconnected',
    });
});
exports.default = router;
//# sourceMappingURL=index.js.map