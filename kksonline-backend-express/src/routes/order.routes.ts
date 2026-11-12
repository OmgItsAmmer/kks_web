import { Router, type Response } from 'express';
import { z } from 'zod';
import multer from 'multer';
import { orderRepository } from '../repositories/order.repository';
import { checkoutService } from '../services/checkout.service';
import { supabaseImageService } from '../services/image.service';
import { validate, schemas } from '../middleware/validation.middleware';
import { asyncHandler } from '../middleware/error.middleware';
import { requireCustomer } from '../middleware/customer.middleware';
import { sendSuccess, sendPaginated, sendNotFound, sendError } from '../utils/response';
import type { CustomerRequest, ErrorCode } from '../types/api.types';
import { ADVANCE_PAYMENT_RECEIPT_ENABLED } from '../config/feature-flags';
import { db } from '../config/database.config';
import { applyStockChanges } from '../services/inventory.service';
import { invalidateCatalog } from '../modules/admin/common/after-write';
import { markNotificationsDirty } from '../services/notification-state';
import { notifyAdmins } from '../services/push.service';

const router = Router();

const receiptUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

// All order routes require customer identification
router.use(requireCustomer);

/**
 * @route   GET /api/v1/orders
 * @desc    Get customer's orders
 * @access  Private
 */
router.get(
  '/',
  validate({
    query: z.object({
      page: z.string().optional().transform((v) => v ? parseInt(v, 10) : 1),
      pageSize: z.string().optional().transform((v) => v ? parseInt(v, 10) : 20),
      status: z.enum(['pending', 'ready', 'confirmed', 'cancelled', 'delivered', 'processing', 'completed']).optional(),
    }),
  }),
  asyncHandler(async (req: CustomerRequest, res: Response) => {
    if (!req.customerId) {
      return sendError(res, 'Unauthorized', 401);
    }

    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || 20;
    const status = req.query.status as string | undefined;

    const result = await orderRepository.findByCustomerId(req.customerId, {
      page,
      pageSize,
      status: status as 'pending' | 'ready' | 'confirmed' | 'cancelled' | 'delivered' | 'processing' | 'completed',
    });

    return sendPaginated(res, result.orders, { page, pageSize, total: result.total });
  })
);

/**
 * @route   GET /api/v1/orders/:id
 * @desc    Get order details
 * @access  Private
 */
router.get(
  '/:id',
  validate({ params: schemas.idParam }),
  asyncHandler(async (req: CustomerRequest, res: Response) => {
    if (!req.customerId) {
      return sendError(res, 'Unauthorized', 401);
    }

    const orderId = parseInt(req.params.id!, 10);
    const order = await orderRepository.findByIdWithDetails(orderId);

    if (!order) {
      return sendNotFound(res, 'Order not found');
    }

    // Verify ownership
    if (order.customer_id !== req.customerId) {
      return sendError(res, 'Access denied', 403);
    }

    return sendSuccess(res, order);
  })
);

/**
 * @route   POST /api/v1/orders/checkout
 * @desc    Process checkout
 * @access  Private
 */
router.post(
  '/checkout',
  validate({ body: schemas.checkout }),
  asyncHandler(async (req: CustomerRequest, res: Response) => {
    if (!req.customerId) {
      return sendError(res, 'Unauthorized', 401);
    }

    const result = await checkoutService.processCheckout(
      req.customerId,
      req.body,
      {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      }
    );

    if (result.success) {
      return sendSuccess(res, {
        orderId: result.orderId,
        total: result.total,
      }, result.message); 
    } else {
      return sendError(res, result.message, 400, result.errorCode as ErrorCode | undefined);
    }
  })
);

/**
 * @route   POST /api/v1/orders/payment-receipt
 * @desc    Upload advance payment receipt image for checkout
 * @access  Private
 */
router.post(
  '/payment-receipt',
  receiptUpload.single('receipt'),
  asyncHandler(async (req: CustomerRequest, res: Response) => {
    if (!ADVANCE_PAYMENT_RECEIPT_ENABLED) {
      return sendError(res, 'Advance payment receipt upload is temporarily disabled', 503);
    }

    if (!req.customerId) {
      return sendError(res, 'Unauthorized', 401);
    }

    if (!req.file) {
      return sendError(res, 'No receipt image provided', 400);
    }

    const result = await supabaseImageService.uploadReceipt(
      req.customerId,
      req.file.buffer,
      req.file.mimetype,
      req.file.originalname
    );

    return sendSuccess(res, result, 'Payment receipt uploaded successfully');
  })
);

/**
 * @route   POST /api/v1/orders/:id/cancel
 * @desc    Cancel an order (only if status is pending). Returns the stock.
 * @access  Private
 */
router.post(
  '/:id/cancel',
  validate({ params: schemas.idParam }),
  asyncHandler(async (req: CustomerRequest, res: Response) => {
    if (!req.customerId) {
      return sendError(res, 'Unauthorized', 401);
    }

    const orderId = parseInt(req.params.id!, 10);
    const customerId = req.customerId;

    // One transaction, same as the admin cancel: lock the order, re-check it, return the stock,
    // record the history and the admin notification. Locking stops a double click (or the admin
    // confirming it at the same moment) from returning the stock twice or cancelling a confirmed order.
    type Outcome = { ok: true; restocked: boolean } | { ok: false; status: number; message: string };
    const outcome = await db.$transaction(async (tx): Promise<Outcome> => {
      await tx.$queryRaw`SELECT order_id FROM orders WHERE order_id = ${orderId} FOR UPDATE`;
      const order = await tx.order.findUnique({ where: { order_id: orderId }, include: { order_items: true } });
      if (!order) return { ok: false, status: 404, message: 'Order not found' };
      if (order.customer_id !== customerId) return { ok: false, status: 403, message: 'Access denied' };
      if (order.status === 'cancelled') return { ok: false, status: 400, message: 'This order is already cancelled' };
      if (order.status !== 'pending') return { ok: false, status: 400, message: 'Can only cancel pending orders' };

      await applyStockChanges(
        tx,
        order.order_items.map((i) => ({
          variantId: i.variant_id,
          delta: i.quantity,
          reason: 'order_cancelled' as const,
          refType: 'order',
          refId: orderId,
          note: 'Cancelled by the customer',
        })),
        'customer'
      );
      const now = new Date();
      await tx.order.update({
        where: { order_id: orderId },
        data: { status: 'cancelled', cancelled_at: now, cancel_reason: 'Cancelled by the customer', updated_at: now },
      });
      await tx.orderStatusHistory.create({
        data: { order_id: orderId, from_status: order.status, to_status: 'cancelled', note: 'Cancelled by the customer', actor: `customer:${customerId}` },
      });
      await tx.notification.create({
        data: {
          NotificationType: 'order_cancelled',
          description: `Order #${orderId} cancelled by the customer`,
          sub_description: 'Stock has been returned. Stop packing or shipping it.',
          order_id: orderId,
          isRead: false,
        },
      });
      return { ok: true, restocked: order.order_items.length > 0 };
    });

    if (!outcome.ok) {
      return outcome.status === 404 ? sendNotFound(res, outcome.message) : sendError(res, outcome.message, outcome.status);
    }

    markNotificationsDirty();
    if (outcome.restocked) invalidateCatalog();
    notifyAdmins({
      kind: 'order_cancelled',
      title: `Order #${orderId} was cancelled`,
      body: 'The customer cancelled it. Stock has been returned. Stop packing or shipping it.',
      url: `/orders/${orderId}`,
      tag: `order-${orderId}`,
    });

    const updated = await orderRepository.findById(orderId);
    return sendSuccess(res, updated, 'Order cancelled successfully');
  })
);

/**
 * @route   GET /api/v1/orders/:id/items
 * @desc    Get order items
 * @access  Private
 */
router.get(
  '/:id/items',
  validate({ params: schemas.idParam }),
  asyncHandler(async (req: CustomerRequest, res: Response) => {
    if (!req.customerId) {
      return sendError(res, 'Unauthorized', 401);
    }

    const orderId = parseInt(req.params.id!, 10);
    const order = await orderRepository.findById(orderId);

    if (!order) {
      return sendNotFound(res, 'Order not found');
    }

    // Verify ownership
    if (order.customer_id !== req.customerId) {
      return sendError(res, 'Access denied', 403);
    }

    const items = await orderRepository.getOrderItems(orderId);

    return sendSuccess(res, items);
  })
);

export default router;
