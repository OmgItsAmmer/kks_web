import { Router, type Response } from 'express';
import { z } from 'zod';
import { orderRepository } from '../repositories/order.repository.ts';
import { checkoutService } from '../services/checkout.service.ts';
import { validate, schemas } from '../middleware/validation.middleware.ts';
import { asyncHandler } from '../middleware/error.middleware.ts';
import { requireCustomer } from '../middleware/customer.middleware.ts';
import { sendSuccess, sendPaginated, sendNotFound, sendError } from '../utils/response.ts';
import type { CustomerRequest, ErrorCode } from '../types/api.types.ts';

const router = Router();

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
 * @route   POST /api/v1/orders/:id/cancel
 * @desc    Cancel an order (only if status is pending)
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
    const order = await orderRepository.findById(orderId);

    if (!order) {
      return sendNotFound(res, 'Order not found');
    }

    // Verify ownership
    if (order.customer_id !== req.customerId) {
      return sendError(res, 'Access denied', 403);
    }

    // Can only cancel pending orders
    if (order.status !== 'pending') {
      return sendError(res, 'Can only cancel pending orders', 400);
    }

    const updated = await orderRepository.updateStatus(orderId, 'cancelled');

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
