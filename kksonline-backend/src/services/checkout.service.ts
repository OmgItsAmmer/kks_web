import crypto from 'crypto';
import { db, Prisma } from '../config/database.config.ts';
import { logger } from '../utils/logger.ts';
import {
  BadRequestError,
  DuplicateOrderError,
  InventoryUnavailableError,
  SecurityViolationError,
  ShippingMethodInvalidError,
  PhoneNumberRequiredError,
  PaymentFailedError,
  OrderCreationFailedError,
} from '../utils/errors.ts';
import { customerRepository } from '../repositories/customer.repository.ts';
import { cartRepository } from '../repositories/cart.repository.ts';
import { orderRepository } from '../repositories/order.repository.ts';
import { addressRepository } from '../repositories/address.repository.ts';
import { shopRepository } from '../repositories/shop.repository.ts';
import type { PaymentMethod, SeverityLevel } from '@prisma/client';

export interface CartItem {
  variantId: number;
  quantity: number;
  sellPrice: number;
  buyPrice?: number;
}

export interface CheckoutRequest {
  cartItems?: CartItem[];
  directCheckout?: {
    variantId: number;
    quantity: number;
    price: number;
  };
  addressId: number;
  shippingMethod: 'shipping' | 'pickup';
  paymentMethod: PaymentMethod;
  idempotencyKey?: string;
}

export interface CheckoutTotals {
  subtotal: number;
  tax: number;
  shipping: number;
  discount: number;
  total: number;
  cost: number;
}

export interface CheckoutResponse {
  success: boolean;
  orderId?: number;
  total?: number;
  message: string;
  errorCode?: string;
}

export class CheckoutService {
  /**
   * Process secure checkout
   */
  async processCheckout(
    customerId: number,
    request: CheckoutRequest,
    clientInfo?: { ip?: string; userAgent?: string }
  ): Promise<CheckoutResponse> {
    logger.info('Starting secure checkout', { customerId, shippingMethod: request.shippingMethod });

    // Step 1: Validate customer has phone number
    const customer = await customerRepository.findById(customerId);
    if (!customer) {
      throw new BadRequestError('Customer not found');
    }

    const phoneNumber = (customer.phone_number || '').trim();
    if (!phoneNumber) {
      throw new PhoneNumberRequiredError();
    }

    // Step 2: Prepare cart items
    let cartItems: CartItem[];
    if (request.directCheckout) {
      cartItems = [{
        variantId: request.directCheckout.variantId,
        quantity: request.directCheckout.quantity,
        sellPrice: request.directCheckout.price,
        buyPrice: 0,
      }];
    } else if (request.cartItems && request.cartItems.length > 0) {
      cartItems = request.cartItems;
    } else {
      throw new BadRequestError('Cart is empty');
    }

    // Step 3: Generate idempotency key
    const idempotencyKey = request.idempotencyKey || await this.generateIdempotencyKey(customerId, cartItems);

    // Step 4: Check for duplicate orders
    const existingOrder = await orderRepository.findByIdempotencyKey(idempotencyKey);
    if (existingOrder) {
      throw new DuplicateOrderError();
    }

    // Step 5: Validate shipping method
    await this.validateShippingMethod(request.shippingMethod, request.addressId);

    // Step 6: Validate cart security (prices, stock, etc.)
    const validation = await this.validateCartSecurity(cartItems);
    if (!validation.isValid) {
      await this.logSecurityEvent('cart_validation_failed', {
        customer_id: customerId,
        error: validation.errorMessage,
        cart_items: cartItems.length,
      }, clientInfo);
      throw new SecurityViolationError(validation.errorMessage);
    }

    // Step 7: Reserve inventory
    const reservationResult = await this.reserveInventory(cartItems, idempotencyKey);
    if (!reservationResult.success) {
      throw new InventoryUnavailableError(reservationResult.message);
    }

    try {
      // Step 8: Process payment
      const paymentResult = await this.processPayment(
        request.paymentMethod,
        validation.totals!.total,
        customerId,
        idempotencyKey
      );

      if (!paymentResult.success) {
        await this.rollbackInventoryReservation(idempotencyKey);
        throw new PaymentFailedError(paymentResult.message);
      }

      // Step 9: Create order
      const orderResult = await this.createOrder(
        customerId,
        cartItems,
        request.addressId,
        request.shippingMethod,
        request.paymentMethod,
        validation.totals!,
        idempotencyKey
      );

      if (!orderResult.success) {
        await this.rollbackInventoryReservation(idempotencyKey);
        throw new OrderCreationFailedError(orderResult.message);
      }

      // Step 10: Confirm inventory reservation (reduce actual stock)
      await this.confirmInventoryReservation(idempotencyKey);

      // Step 11: Clear cart (for regular checkout only)
      if (!request.directCheckout) {
        await cartRepository.clearCart(customerId);
      }

      // Log successful checkout
      await this.logSecurityEvent('checkout_success', {
        customer_id: customerId,
        order_id: orderResult.orderId,
        total: validation.totals!.total,
        shipping_method: request.shippingMethod,
        payment_method: request.paymentMethod,
      }, clientInfo);

      logger.info('Checkout completed successfully', { orderId: orderResult.orderId, customerId });

      return {
        success: true,
        orderId: orderResult.orderId,
        total: validation.totals!.total,
        message: 'Order placed successfully!',
      };

    } catch (error) {
      // Rollback on any error
      await this.rollbackInventoryReservation(idempotencyKey);
      
      await this.logSecurityEvent('checkout_error', {
        customer_id: customerId,
        error: error instanceof Error ? error.message : 'Unknown error',
        idempotency_key: idempotencyKey,
      }, clientInfo);

      throw error;
    }
  }

  /**
   * Generate idempotency key for checkout
   */
  private async generateIdempotencyKey(customerId: number, cartItems: CartItem[]): Promise<string> {
    const cartData = cartItems
      .map((item) => `${item.variantId}:${item.quantity}:${item.sellPrice}`)
      .join('|');
    
    const input = `${customerId}:${cartData}:${Math.floor(Date.now() / 60000)}`; // 1-minute window
    
    const hash = crypto.createHash('sha256').update(input).digest('hex');
    return `checkout_${hash.substring(0, 16)}`;
  }

  /**
   * Validate shipping method
   */
  private async validateShippingMethod(
    shippingMethod: 'shipping' | 'pickup',
    addressId: number
  ): Promise<void> {
    if (shippingMethod === 'pickup') {
      // Pickup is always allowed
      return;
    }

    if (shippingMethod === 'shipping') {
      // Check if shipping is enabled
      const isShippingEnabled = await shopRepository.isShippingEnabled();
      if (!isShippingEnabled) {
        throw new ShippingMethodInvalidError('Shipping is not available. Please select pickup instead.');
      }

      // Validate address
      if (addressId <= 0) {
        throw new ShippingMethodInvalidError('Valid shipping address required for delivery.');
      }

      const address = await addressRepository.findById(addressId);
      if (!address) {
        throw new ShippingMethodInvalidError('Selected shipping address not found.');
      }
    }
  }

  /**
   * Validate cart security (prices, stock, visibility)
   */
  private async validateCartSecurity(cartItems: CartItem[]): Promise<{
    isValid: boolean;
    errorMessage?: string;
    totals?: CheckoutTotals;
  }> {
    const maxAllowedQuantity = await shopRepository.getMaxAllowedQuantity();
    const variantIds = cartItems.map((item) => item.variantId);

    // Fetch product data from database using Prisma
    try {
      const dbProducts = await db.productVariant.findMany({
        where: { variant_id: { in: variantIds } },
        include: {
          product: {
            select: {
              product_id: true,
              name: true,
              isVisible: true,
            },
          },
        },
      });

      const dbProductMap = new Map<number, typeof dbProducts[0]>();
      dbProducts.forEach((p) => dbProductMap.set(p.variant_id, p));

      let subtotal = 0;
      let totalCost = 0;

      for (const cartItem of cartItems) {
        const dbProduct = dbProductMap.get(cartItem.variantId);
        
        if (!dbProduct) {
          return { isValid: false, errorMessage: `Product no longer available (ID: ${cartItem.variantId})` };
        }

        // Check visibility
        if (!dbProduct.is_visible || !dbProduct.product.isVisible) {
          return { isValid: false, errorMessage: `Product ${dbProduct.product.name} is no longer available` };
        }

        // Validate price integrity
        const dbPrice = Number(dbProduct.sell_price);
        if (Math.abs(dbPrice - cartItem.sellPrice) > 0.01) {
          logger.warn('Price manipulation detected', {
            variantId: cartItem.variantId,
            cartPrice: cartItem.sellPrice,
            dbPrice,
          });
          return { isValid: false, errorMessage: 'Price mismatch detected. Please refresh and try again.' };
        }

        // Validate stock
        if (cartItem.quantity > (dbProduct.stock || 0)) {
          return { 
            isValid: false, 
            errorMessage: `${dbProduct.product.name} - Only ${dbProduct.stock} available` 
          };
        }

        // Validate quantity constraints
        if (cartItem.quantity <= 0 || cartItem.quantity > maxAllowedQuantity) {
          return { 
            isValid: false, 
            errorMessage: `Invalid quantity. Must be between 1 and ${maxAllowedQuantity}.` 
          };
        }

        // Calculate totals
        subtotal += cartItem.sellPrice * cartItem.quantity;
        totalCost += Number(dbProduct.buy_price || 0) * cartItem.quantity;
      }

      // Calculate final totals
      const totals = await this.calculateTotals(subtotal, totalCost);

      // Validate business rules
      if (totals.total < 10) {
        return { isValid: false, errorMessage: 'Minimum order amount is PKR 10.00' };
      }

      if (totals.total > 500000) {
        return { isValid: false, errorMessage: 'Maximum order amount is PKR 500,000.00' };
      }

      return { isValid: true, totals };
    } catch (error) {
      logger.error('Error fetching products for validation', { error });
      return { isValid: false, errorMessage: 'Product validation failed' };
    }
  }

  /**
   * Calculate checkout totals
   */
  private async calculateTotals(subtotal: number, cost: number): Promise<CheckoutTotals> {
    const taxRate = await shopRepository.getTaxRate();
    const tax = taxRate; // Fixed tax amount
    const shipping = 0; // No shipping fee for now
    const discount = 0; // No discount logic yet

    return {
      subtotal,
      tax,
      shipping,
      discount,
      total: subtotal + tax + shipping - discount,
      cost,
    };
  }

  /**
   * Reserve inventory using Prisma transaction
   */
  private async reserveInventory(
    cartItems: CartItem[],
    reservationId: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

      await db.$transaction(async (tx) => {
        for (const item of cartItems) {
          // Check stock
          const variant = await tx.productVariant.findUnique({
            where: { variant_id: item.variantId },
            select: { stock: true, variant_name: true },
          });

          if (!variant || (variant.stock || 0) < item.quantity) {
            throw new Error(`Insufficient stock for ${variant?.variant_name || 'item'}`);
          }

          // Reserve stock
          await tx.productVariant.update({
            where: { variant_id: item.variantId },
            data: { stock: { decrement: item.quantity } },
          });

          // Create reservation record
          await tx.inventoryReservation.create({
            data: {
              reservation_id: reservationId,
              variant_id: item.variantId,
              quantity: item.quantity,
              expires_at: expiresAt,
            },
          });
        }
      });

      return { success: true, message: 'Inventory reserved successfully' };
    } catch (error) {
      logger.error('Error in inventory reservation', { error });
      const message = error instanceof Error ? error.message : 'Unable to reserve inventory';
      return { success: false, message };
    }
  }

  /**
   * Process payment
   */
  private async processPayment(
    paymentMethod: PaymentMethod,
    amount: number,
    customerId: number,
    idempotencyKey: string
  ): Promise<{ success: boolean; message: string; transactionId?: string }> {
    logger.info('Processing payment', { paymentMethod, amount, customerId });

    switch (paymentMethod) {
      case 'cod':
        return {
          success: true,
          message: 'Cash on Delivery order confirmed',
          transactionId: `cod_${idempotencyKey}`,
        };

      case 'pickup':
        return {
          success: true,
          message: 'Pickup order confirmed - payment at pickup',
          transactionId: `pickup_${idempotencyKey}`,
        };

      case 'credit_card':
        // TODO: Integrate with payment gateway
        return {
          success: true,
          message: 'Credit card payment processed',
          transactionId: `cc_${idempotencyKey}`,
        };

      case 'bank_transfer':
        return {
          success: true,
          message: 'Bank transfer initiated',
          transactionId: `bt_${idempotencyKey}`,
        };

      case 'jazzcash':
        // TODO: Integrate with JazzCash API
        return {
          success: true,
          message: 'JazzCash payment processed',
          transactionId: `jc_${idempotencyKey}`,
        };

      default:
        return {
          success: false,
          message: `Payment method ${paymentMethod} not supported`,
        };
    }
  }

  /**
   * Create order
   */
  private async createOrder(
    customerId: number,
    cartItems: CartItem[],
    addressId: number,
    shippingMethod: string,
    paymentMethod: PaymentMethod,
    totals: CheckoutTotals,
    idempotencyKey: string
  ): Promise<{ success: boolean; orderId?: number; message: string }> {
    try {
      // Copy address to order_addresses if shipping
      if (addressId > 0) {
        const copied = await addressRepository.copyToOrderAddress(addressId);
        if (!copied) {
          return { success: false, message: 'Address processing failed' };
        }
      }

      // Fetch product_id for each variant
      const variantIds = cartItems.map((item) => item.variantId);
      const variants = await db.productVariant.findMany({
        where: { variant_id: { in: variantIds } },
        select: { variant_id: true, product_id: true },
      });

      const variantToProductMap = new Map<number, number>();
      variants.forEach((v) => variantToProductMap.set(v.variant_id, v.product_id));

      // Create order
      const order = await orderRepository.create({
        customer: { connect: { customer_id: customerId } },
        status: 'pending',
        sub_total: totals.subtotal,
        tax: totals.tax,
        shipping_fee: totals.shipping,
        discount: totals.discount,
        paid_amount: totals.total,
        buying_price: totals.cost,
        address: addressId <= 0 ? undefined : { connect: { address_id: addressId } },
        order_date: new Date(),
        shipping_method: shippingMethod,
        payment_method: paymentMethod,
        idempotency_key: idempotencyKey,
      });

      // Create order items
      const orderItems = cartItems.map((item) => ({
        order_id: order.order_id,
        product_id: variantToProductMap.get(item.variantId)!,
        variant_id: item.variantId,
        quantity: item.quantity,
        price: item.sellPrice,
        total_buy_price: (item.buyPrice || 0) * item.quantity,
      }));

      await orderRepository.createOrderItems(orderItems);

      return { success: true, orderId: order.order_id, message: 'Order created successfully' };

    } catch (error) {
      logger.error('Error creating order', { error, customerId });
      return { success: false, message: 'Order creation failed' };
    }
  }

  /**
   * Confirm inventory reservation (remove reservations, stock already decremented)
   */
  private async confirmInventoryReservation(reservationId: string): Promise<void> {
    try {
      await db.inventoryReservation.deleteMany({
        where: { reservation_id: reservationId },
      });
    } catch (error) {
      logger.error('Error confirming inventory reservation', { error, reservationId });
    }
  }

  /**
   * Rollback inventory reservation
   */
  private async rollbackInventoryReservation(reservationId: string): Promise<void> {
    try {
      // Get reservations
      const reservations = await db.inventoryReservation.findMany({
        where: { reservation_id: reservationId },
      });

      // Restore stock
      for (const reservation of reservations) {
        await db.productVariant.update({
          where: { variant_id: reservation.variant_id },
          data: { stock: { increment: reservation.quantity } },
        });
      }

      // Delete reservations
      await db.inventoryReservation.deleteMany({
        where: { reservation_id: reservationId },
      });
    } catch (error) {
      logger.error('Error rolling back inventory reservation', { error, reservationId });
    }
  }

  /**
   * Log security event
   */
  private async logSecurityEvent(
    eventType: string,
    data: Record<string, unknown>,
    clientInfo?: { ip?: string; userAgent?: string }
  ): Promise<void> {
    try {
      const severity = this.getSeverityLevel(eventType);
      
      await db.securityAuditLog.create({
        data: {
          event_type: eventType,
          event_data: data as Prisma.InputJsonValue,
          timestamp: new Date(),
          ip_address: clientInfo?.ip || null,
          user_agent: clientInfo?.userAgent || null,
          customer_id: (data.customer_id as number) || null,
          severity,
        },
      });
    } catch (error) {
      logger.error('Error logging security event', { error, eventType });
    }
  }

  private getSeverityLevel(eventType: string): SeverityLevel {
    const criticalEvents = ['price_manipulation_detected', 'checkout_error'];
    const warningEvents = ['cart_validation_failed', 'inventory_unavailable'];

    if (criticalEvents.includes(eventType)) return 'critical';
    if (warningEvents.includes(eventType)) return 'warning';
    return 'info';
  }
}

// Export singleton
export const checkoutService = new CheckoutService();
