"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.orderRepository = exports.OrderRepository = void 0;
const database_config_1 = require("../config/database.config");
const logger_1 = require("../utils/logger");
const errors_1 = require("../utils/errors");
class OrderRepository {
    /**
     * Get orders for a customer
     */
    async findByCustomerId(customerId, params = {}) {
        const { page = 1, pageSize = 20, status } = params;
        const offset = (page - 1) * pageSize;
        try {
            const where = { customer_id: customerId };
            if (status) {
                where.status = status;
            }
            const [orders, total] = await Promise.all([
                database_config_1.db.order.findMany({
                    where,
                    orderBy: { order_date: 'desc' },
                    skip: offset,
                    take: pageSize,
                }),
                database_config_1.db.order.count({ where }),
            ]);
            return { orders, total };
        }
        catch (error) {
            logger_1.logger.error('Error fetching orders', { error, customerId });
            throw new errors_1.InternalServerError('Database error');
        }
    }
    /**
     * Get order by ID
     */
    async findById(orderId) {
        try {
            const order = await database_config_1.db.order.findUnique({
                where: { order_id: orderId },
            });
            return order;
        }
        catch (error) {
            logger_1.logger.error('Error fetching order', { error, orderId });
            throw new errors_1.InternalServerError('Database error');
        }
    }
    /**
     * Get order with full details
     */
    async findByIdWithDetails(orderId) {
        try {
            const order = await database_config_1.db.order.findUnique({
                where: { order_id: orderId },
                include: {
                    address: true,
                    customer: {
                        select: {
                            customer_id: true,
                            first_name: true,
                            last_name: true,
                            email: true,
                            phone_number: true,
                        },
                    },
                },
            });
            if (!order)
                return null;
            // Get order items
            const items = await database_config_1.db.orderItem.findMany({
                where: { order_id: orderId },
                include: {
                    product: {
                        select: { name: true },
                    },
                },
            });
            // Get variant names
            const variantIds = items.map((item) => item.variant_id);
            const variants = await database_config_1.db.productVariant.findMany({
                where: { variant_id: { in: variantIds } },
                select: { variant_id: true, variant_name: true },
            });
            const variantMap = new Map(variants.map((v) => [v.variant_id, v.variant_name]));
            const orderItems = items.map((item) => ({
                productId: item.product_id,
                variantId: item.variant_id,
                productName: item.product?.name || 'Unknown',
                variantName: variantMap.get(item.variant_id) || 'Unknown',
                quantity: item.quantity,
                price: Number(item.price),
            }));
            return {
                ...order,
                items: orderItems,
                address: order.address || undefined,
                customer: order.customer || undefined,
            };
        }
        catch (error) {
            logger_1.logger.error('Error fetching order with details', { error, orderId });
            throw new errors_1.InternalServerError('Database error');
        }
    }
    /**
     * Create order
     */
    async create(orderData) {
        try {
            const order = await database_config_1.db.order.create({
                data: orderData,
            });
            return order;
        }
        catch (error) {
            logger_1.logger.error('Error creating order', { error });
            throw new errors_1.InternalServerError('Failed to create order');
        }
    }
    /**
     * Insert order items
     */
    async createOrderItems(items) {
        try {
            await database_config_1.db.orderItem.createMany({
                data: items.map((item) => ({
                    order_id: item.order_id,
                    product_id: item.product_id,
                    variant_id: item.variant_id,
                    quantity: item.quantity,
                    price: item.price,
                    total_buy_price: item.total_buy_price,
                })),
            });
        }
        catch (error) {
            logger_1.logger.error('Error creating order items', { error });
            throw new errors_1.InternalServerError('Failed to create order items');
        }
    }
    /**
     * Update order status
     */
    async updateStatus(orderId, status) {
        try {
            const order = await database_config_1.db.order.update({
                where: { order_id: orderId },
                data: { status },
            });
            return order;
        }
        catch (error) {
            if (error.code === 'P2025') {
                throw new errors_1.NotFoundError('Order not found');
            }
            logger_1.logger.error('Error updating order status', { error, orderId });
            throw new errors_1.InternalServerError('Failed to update order');
        }
    }
    /**
     * Update order
     */
    async update(orderId, updates) {
        try {
            const order = await database_config_1.db.order.update({
                where: { order_id: orderId },
                data: updates,
            });
            return order;
        }
        catch (error) {
            if (error.code === 'P2025') {
                throw new errors_1.NotFoundError('Order not found');
            }
            logger_1.logger.error('Error updating order', { error, orderId });
            throw new errors_1.InternalServerError('Failed to update order');
        }
    }
    /**
     * Check for duplicate order by idempotency key
     */
    async findByIdempotencyKey(idempotencyKey) {
        try {
            const order = await database_config_1.db.order.findUnique({
                where: { idempotency_key: idempotencyKey },
            });
            return order;
        }
        catch (error) {
            logger_1.logger.error('Error checking idempotency key', { error, idempotencyKey });
            return null;
        }
    }
    /**
     * Get order items
     */
    async getOrderItems(orderId) {
        try {
            const items = await database_config_1.db.orderItem.findMany({
                where: { order_id: orderId },
            });
            return items;
        }
        catch (error) {
            logger_1.logger.error('Error fetching order items', { error, orderId });
            throw new errors_1.InternalServerError('Database error');
        }
    }
    /**
     * Get all orders (admin)
     */
    async findAll(params = {}) {
        const { page = 1, pageSize = 20, status, customerId, startDate, endDate } = params;
        const offset = (page - 1) * pageSize;
        try {
            const where = {};
            if (status) {
                where.status = status;
            }
            if (customerId) {
                where.customer_id = customerId;
            }
            if (startDate) {
                where.order_date = { gte: new Date(startDate) };
            }
            if (endDate) {
                where.order_date = {
                    ...where.order_date,
                    lte: new Date(endDate),
                };
            }
            const [orders, total] = await Promise.all([
                database_config_1.db.order.findMany({
                    where,
                    orderBy: { order_date: 'desc' },
                    skip: offset,
                    take: pageSize,
                }),
                database_config_1.db.order.count({ where }),
            ]);
            return { orders, total };
        }
        catch (error) {
            logger_1.logger.error('Error fetching all orders', { error });
            throw new errors_1.InternalServerError('Database error');
        }
    }
    /**
     * Get order statistics (admin)
     */
    async getStatistics(params = {}) {
        try {
            const where = {};
            if (params.startDate) {
                where.order_date = { gte: new Date(params.startDate) };
            }
            if (params.endDate) {
                where.order_date = {
                    ...where.order_date,
                    lte: new Date(params.endDate),
                };
            }
            const orders = await database_config_1.db.order.findMany({
                where,
                select: { status: true, paid_amount: true },
            });
            const stats = {
                totalOrders: orders.length,
                pendingOrders: 0,
                completedOrders: 0,
                cancelledOrders: 0,
                totalRevenue: 0,
            };
            for (const order of orders) {
                if (order.status === 'pending' || order.status === 'processing') {
                    stats.pendingOrders++;
                }
                else if (order.status === 'completed' || order.status === 'delivered') {
                    stats.completedOrders++;
                    stats.totalRevenue += Number(order.paid_amount) || 0;
                }
                else if (order.status === 'cancelled') {
                    stats.cancelledOrders++;
                }
            }
            return stats;
        }
        catch (error) {
            logger_1.logger.error('Error getting order statistics', { error });
            throw new errors_1.InternalServerError('Database error');
        }
    }
}
exports.OrderRepository = OrderRepository;
// Export singleton
exports.orderRepository = new OrderRepository();
//# sourceMappingURL=order.repository.js.map