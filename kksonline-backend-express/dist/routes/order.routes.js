"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const order_repository_1 = require("../repositories/order.repository");
const checkout_service_1 = require("../services/checkout.service");
const validation_middleware_1 = require("../middleware/validation.middleware");
const error_middleware_1 = require("../middleware/error.middleware");
const customer_middleware_1 = require("../middleware/customer.middleware");
const response_1 = require("../utils/response");
const router = (0, express_1.Router)();
// All order routes require customer identification
router.use(customer_middleware_1.requireCustomer);
/**
 * @route   GET /api/v1/orders
 * @desc    Get customer's orders
 * @access  Private
 */
router.get('/', (0, validation_middleware_1.validate)({
    query: zod_1.z.object({
        page: zod_1.z.string().optional().transform((v) => v ? parseInt(v, 10) : 1),
        pageSize: zod_1.z.string().optional().transform((v) => v ? parseInt(v, 10) : 20),
        status: zod_1.z.enum(['pending', 'ready', 'confirmed', 'cancelled', 'delivered', 'processing', 'completed']).optional(),
    }),
}), (0, error_middleware_1.asyncHandler)(async (req, res) => {
    if (!req.customerId) {
        return (0, response_1.sendError)(res, 'Unauthorized', 401);
    }
    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || 20;
    const status = req.query.status;
    const result = await order_repository_1.orderRepository.findByCustomerId(req.customerId, {
        page,
        pageSize,
        status: status,
    });
    return (0, response_1.sendPaginated)(res, result.orders, { page, pageSize, total: result.total });
}));
/**
 * @route   GET /api/v1/orders/:id
 * @desc    Get order details
 * @access  Private
 */
router.get('/:id', (0, validation_middleware_1.validate)({ params: validation_middleware_1.schemas.idParam }), (0, error_middleware_1.asyncHandler)(async (req, res) => {
    if (!req.customerId) {
        return (0, response_1.sendError)(res, 'Unauthorized', 401);
    }
    const orderId = parseInt(req.params.id, 10);
    const order = await order_repository_1.orderRepository.findByIdWithDetails(orderId);
    if (!order) {
        return (0, response_1.sendNotFound)(res, 'Order not found');
    }
    // Verify ownership
    if (order.customer_id !== req.customerId) {
        return (0, response_1.sendError)(res, 'Access denied', 403);
    }
    return (0, response_1.sendSuccess)(res, order);
}));
/**
 * @route   POST /api/v1/orders/checkout
 * @desc    Process checkout
 * @access  Private
 */
router.post('/checkout', (0, validation_middleware_1.validate)({ body: validation_middleware_1.schemas.checkout }), (0, error_middleware_1.asyncHandler)(async (req, res) => {
    if (!req.customerId) {
        return (0, response_1.sendError)(res, 'Unauthorized', 401);
    }
    const result = await checkout_service_1.checkoutService.processCheckout(req.customerId, req.body, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
    });
    if (result.success) {
        return (0, response_1.sendSuccess)(res, {
            orderId: result.orderId,
            total: result.total,
        }, result.message);
    }
    else {
        return (0, response_1.sendError)(res, result.message, 400, result.errorCode);
    }
}));
/**
 * @route   POST /api/v1/orders/:id/cancel
 * @desc    Cancel an order (only if status is pending)
 * @access  Private
 */
router.post('/:id/cancel', (0, validation_middleware_1.validate)({ params: validation_middleware_1.schemas.idParam }), (0, error_middleware_1.asyncHandler)(async (req, res) => {
    if (!req.customerId) {
        return (0, response_1.sendError)(res, 'Unauthorized', 401);
    }
    const orderId = parseInt(req.params.id, 10);
    const order = await order_repository_1.orderRepository.findById(orderId);
    if (!order) {
        return (0, response_1.sendNotFound)(res, 'Order not found');
    }
    // Verify ownership
    if (order.customer_id !== req.customerId) {
        return (0, response_1.sendError)(res, 'Access denied', 403);
    }
    // Can only cancel pending orders
    if (order.status !== 'pending') {
        return (0, response_1.sendError)(res, 'Can only cancel pending orders', 400);
    }
    const updated = await order_repository_1.orderRepository.updateStatus(orderId, 'cancelled');
    return (0, response_1.sendSuccess)(res, updated, 'Order cancelled successfully');
}));
/**
 * @route   GET /api/v1/orders/:id/items
 * @desc    Get order items
 * @access  Private
 */
router.get('/:id/items', (0, validation_middleware_1.validate)({ params: validation_middleware_1.schemas.idParam }), (0, error_middleware_1.asyncHandler)(async (req, res) => {
    if (!req.customerId) {
        return (0, response_1.sendError)(res, 'Unauthorized', 401);
    }
    const orderId = parseInt(req.params.id, 10);
    const order = await order_repository_1.orderRepository.findById(orderId);
    if (!order) {
        return (0, response_1.sendNotFound)(res, 'Order not found');
    }
    // Verify ownership
    if (order.customer_id !== req.customerId) {
        return (0, response_1.sendError)(res, 'Access denied', 403);
    }
    const items = await order_repository_1.orderRepository.getOrderItems(orderId);
    return (0, response_1.sendSuccess)(res, items);
}));
exports.default = router;
//# sourceMappingURL=order.routes.js.map