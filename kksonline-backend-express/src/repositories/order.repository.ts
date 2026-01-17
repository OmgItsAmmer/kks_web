import { db, Prisma } from '../config/database.config.ts';
import { logger } from '../utils/logger.ts';
import { InternalServerError, NotFoundError } from '../utils/errors.ts';
import type { Order, OrderItem, Address, Customer, OrderStatus } from '@prisma/client';

export interface OrderItemWithProduct {
  productId: number;
  variantId: number;
  productName: string;
  variantName: string;
  quantity: number;
  price: number;
  imageUrl?: string;
}

export interface OrderWithDetails extends Order {
  items?: OrderItemWithProduct[];
  address?: Address;
  customer?: Pick<Customer, 'customer_id' | 'first_name' | 'last_name' | 'email' | 'phone_number'>;
}

export class OrderRepository {
  /**
   * Get orders for a customer
   */
  async findByCustomerId(customerId: number, params: {
    page?: number;
    pageSize?: number;
    status?: OrderStatus;
  } = {}): Promise<{ orders: Order[]; total: number }> {
    const { page = 1, pageSize = 20, status } = params;
    const offset = (page - 1) * pageSize;

    try {
      const where: Prisma.OrderWhereInput = { customer_id: customerId };
      if (status) {
        where.status = status;
      }

      const [orders, total] = await Promise.all([
        db.order.findMany({
          where,
          orderBy: { order_date: 'desc' },
          skip: offset,
          take: pageSize,
        }),
        db.order.count({ where }),
      ]);

      return { orders, total };
    } catch (error) {
      logger.error('Error fetching orders', { error, customerId });
      throw new InternalServerError('Database error');
    }
  }

  /**
   * Get order by ID
   */
  async findById(orderId: number): Promise<Order | null> {
    try {
      const order = await db.order.findUnique({
        where: { order_id: orderId },
      });
      return order;
    } catch (error) {
      logger.error('Error fetching order', { error, orderId });
      throw new InternalServerError('Database error');
    }
  }

  /**
   * Get order with full details
   */
  async findByIdWithDetails(orderId: number): Promise<OrderWithDetails | null> {
    try {
      const order = await db.order.findUnique({
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

      if (!order) return null;

      // Get order items
      const items = await db.orderItem.findMany({
        where: { order_id: orderId },
        include: {
          product: {
            select: { name: true },
          },
        },
      });

      // Get variant names
      const variantIds = items.map((item) => item.variant_id);
      const variants = await db.productVariant.findMany({
        where: { variant_id: { in: variantIds } },
        select: { variant_id: true, variant_name: true },
      });
      const variantMap = new Map(variants.map((v) => [v.variant_id, v.variant_name]));

      const orderItems: OrderItemWithProduct[] = items.map((item) => ({
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
    } catch (error) {
      logger.error('Error fetching order with details', { error, orderId });
      throw new InternalServerError('Database error');
    }
  }

  /**
   * Create order
   */
  async create(orderData: Prisma.OrderCreateInput): Promise<Order> {
    try {
      const order = await db.order.create({
        data: orderData,
      });
      return order;
    } catch (error) {
      logger.error('Error creating order', { error });
      throw new InternalServerError('Failed to create order');
    }
  }

  /**
   * Insert order items
   */
  async createOrderItems(items: {
    order_id: number;
    product_id: number;
    variant_id: number;
    quantity: number;
    price: number;
    total_buy_price?: number;
  }[]): Promise<void> {
    try {
      await db.orderItem.createMany({
        data: items.map((item) => ({
          order_id: item.order_id,
          product_id: item.product_id,
          variant_id: item.variant_id,
          quantity: item.quantity,
          price: item.price,
          total_buy_price: item.total_buy_price,
        })),
      });
    } catch (error) {
      logger.error('Error creating order items', { error });
      throw new InternalServerError('Failed to create order items');
    }
  }

  /**
   * Update order status
   */
  async updateStatus(orderId: number, status: OrderStatus): Promise<Order> {
    try {
      const order = await db.order.update({
        where: { order_id: orderId },
        data: { status },
      });
      return order;
    } catch (error) {
      if ((error as { code?: string }).code === 'P2025') {
        throw new NotFoundError('Order not found');
      }
      logger.error('Error updating order status', { error, orderId });
      throw new InternalServerError('Failed to update order');
    }
  }

  /**
   * Update order
   */
  async update(orderId: number, updates: Prisma.OrderUpdateInput): Promise<Order> {
    try {
      const order = await db.order.update({
        where: { order_id: orderId },
        data: updates,
      });
      return order;
    } catch (error) {
      if ((error as { code?: string }).code === 'P2025') {
        throw new NotFoundError('Order not found');
      }
      logger.error('Error updating order', { error, orderId });
      throw new InternalServerError('Failed to update order');
    }
  }

  /**
   * Check for duplicate order by idempotency key
   */
  async findByIdempotencyKey(idempotencyKey: string): Promise<Order | null> {
    try {
      const order = await db.order.findUnique({
        where: { idempotency_key: idempotencyKey },
      });
      return order;
    } catch (error) {
      logger.error('Error checking idempotency key', { error, idempotencyKey });
      return null;
    }
  }

  /**
   * Get order items
   */
  async getOrderItems(orderId: number): Promise<OrderItem[]> {
    try {
      const items = await db.orderItem.findMany({
        where: { order_id: orderId },
      });
      return items;
    } catch (error) {
      logger.error('Error fetching order items', { error, orderId });
      throw new InternalServerError('Database error');
    }
  }

  /**
   * Get all orders (admin)
   */
  async findAll(params: {
    page?: number;
    pageSize?: number;
    status?: OrderStatus;
    customerId?: number;
    startDate?: string;
    endDate?: string;
  } = {}): Promise<{ orders: Order[]; total: number }> {
    const { page = 1, pageSize = 20, status, customerId, startDate, endDate } = params;
    const offset = (page - 1) * pageSize;

    try {
      const where: Prisma.OrderWhereInput = {};

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
          ...where.order_date as object,
          lte: new Date(endDate),
        };
      }

      const [orders, total] = await Promise.all([
        db.order.findMany({
          where,
          orderBy: { order_date: 'desc' },
          skip: offset,
          take: pageSize,
        }),
        db.order.count({ where }),
      ]);

      return { orders, total };
    } catch (error) {
      logger.error('Error fetching all orders', { error });
      throw new InternalServerError('Database error');
    }
  }

  /**
   * Get order statistics (admin)
   */
  async getStatistics(params: {
    startDate?: string;
    endDate?: string;
  } = {}): Promise<{
    totalOrders: number;
    pendingOrders: number;
    completedOrders: number;
    cancelledOrders: number;
    totalRevenue: number;
  }> {
    try {
      const where: Prisma.OrderWhereInput = {};

      if (params.startDate) {
        where.order_date = { gte: new Date(params.startDate) };
      }

      if (params.endDate) {
        where.order_date = {
          ...where.order_date as object,
          lte: new Date(params.endDate),
        };
      }

      const orders = await db.order.findMany({
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
        } else if (order.status === 'completed' || order.status === 'delivered') {
          stats.completedOrders++;
          stats.totalRevenue += Number(order.paid_amount) || 0;
        } else if (order.status === 'cancelled') {
          stats.cancelledOrders++;
        }
      }

      return stats;
    } catch (error) {
      logger.error('Error getting order statistics', { error });
      throw new InternalServerError('Database error');
    }
  }
}

// Export singleton
export const orderRepository = new OrderRepository();
