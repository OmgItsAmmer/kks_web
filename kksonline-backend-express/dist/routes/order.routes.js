"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const multer_1 = __importDefault(require("multer"));
const order_repository_1 = require("../repositories/order.repository");
const checkout_service_1 = require("../services/checkout.service");
const supabase_image_service_1 = require("../services/supabase-image.service");
const validation_middleware_1 = require("../middleware/validation.middleware");
const error_middleware_1 = require("../middleware/error.middleware");
const customer_middleware_1 = require("../middleware/customer.middleware");
const response_1 = require("../utils/response");
const feature_flags_1 = require("../config/feature-flags");
const router = (0, express_1.Router)();
const receiptUpload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        }
        else {
            cb(new Error('Only image files are allowed'));
        }
    },
});
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
 * @route   POST /api/v1/orders/payment-receipt
 * @desc    Upload advance payment receipt image for checkout
 * @access  Private
 */
router.post('/payment-receipt', receiptUpload.single('receipt'), (0, error_middleware_1.asyncHandler)(async (req, res) => {
    if (!feature_flags_1.ADVANCE_PAYMENT_RECEIPT_ENABLED) {
        return (0, response_1.sendError)(res, 'Advance payment receipt upload is temporarily disabled', 503);
    }
    if (!req.customerId) {
        return (0, response_1.sendError)(res, 'Unauthorized', 401);
    }
    if (!req.file) {
        return (0, response_1.sendError)(res, 'No receipt image provided', 400);
    }
    const result = await supabase_image_service_1.supabaseImageService.uploadReceipt(req.customerId, req.file.buffer, req.file.mimetype, req.file.originalname);
    return (0, response_1.sendSuccess)(res, result, 'Payment receipt uploaded successfully');
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