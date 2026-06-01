import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockCustomer } from '../../helpers/factories';

const mockFindCustomerById = vi.fn();
const mockFindByIdempotencyKey = vi.fn();
const mockFindAddressById = vi.fn();
const mockCopyToOrderAddress = vi.fn();
const mockCreateOrder = vi.fn();
const mockCreateOrderItems = vi.fn();
const mockClearCart = vi.fn();
const mockGetMaxAllowedQuantity = vi.fn();
const mockGetTaxRate = vi.fn();
const mockIsAdvancePaymentReceiptMandatory = vi.fn();

const mockProductVariantFindMany = vi.fn();
const mockTransaction = vi.fn();
const mockInventoryReservationDeleteMany = vi.fn();
const mockInventoryReservationFindMany = vi.fn();
const mockProductVariantFindUnique = vi.fn();
const mockProductVariantUpdate = vi.fn();
const mockInventoryReservationCreate = vi.fn();
const mockSecurityAuditLogCreate = vi.fn();

vi.mock('../../../src/repositories/customer.repository', () => ({
  customerRepository: { findById: mockFindCustomerById },
}));

vi.mock('../../../src/repositories/cart.repository', () => ({
  cartRepository: { clearCart: mockClearCart },
}));

vi.mock('../../../src/repositories/order.repository', () => ({
  orderRepository: {
    findByIdempotencyKey: mockFindByIdempotencyKey,
    create: mockCreateOrder,
    createOrderItems: mockCreateOrderItems,
  },
}));

vi.mock('../../../src/repositories/address.repository', () => ({
  addressRepository: {
    findById: mockFindAddressById,
    copyToOrderAddress: mockCopyToOrderAddress,
  },
}));

vi.mock('../../../src/repositories/shop.repository', () => ({
  shopRepository: {
    getMaxAllowedQuantity: mockGetMaxAllowedQuantity,
    getTaxRate: mockGetTaxRate,
    isAdvancePaymentReceiptMandatory: mockIsAdvancePaymentReceiptMandatory,
  },
}));

vi.mock('../../../src/services/supabase-image.service', () => ({
  supabaseImageService: {
    verifyReceiptOwnership: vi.fn().mockResolvedValue(true),
  },
}));

vi.mock('../../../src/config/database.config', () => ({
  db: {
    productVariant: {
      findMany: mockProductVariantFindMany,
      findUnique: mockProductVariantFindUnique,
      update: mockProductVariantUpdate,
    },
    inventoryReservation: {
      create: mockInventoryReservationCreate,
      deleteMany: mockInventoryReservationDeleteMany,
      findMany: mockInventoryReservationFindMany,
    },
    securityAuditLog: {
      create: mockSecurityAuditLogCreate,
    },
    $transaction: mockTransaction,
  },
}));

vi.mock('../../../src/utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

describe('CheckoutService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindCustomerById.mockResolvedValue(mockCustomer);
    mockFindByIdempotencyKey.mockResolvedValue(null);
    mockGetMaxAllowedQuantity.mockResolvedValue(10);
    mockGetTaxRate.mockResolvedValue(0);
    mockIsAdvancePaymentReceiptMandatory.mockResolvedValue(false);
    mockFindAddressById.mockResolvedValue({ address_id: 1 });
    mockCopyToOrderAddress.mockResolvedValue(true);
    mockSecurityAuditLogCreate.mockResolvedValue({});
    mockInventoryReservationDeleteMany.mockResolvedValue({ count: 0 });
    mockInventoryReservationFindMany.mockResolvedValue([]);

    mockProductVariantFindMany.mockResolvedValue([
      {
        variant_id: 1,
        sell_price: 1150,
        buy_price: 1000,
        stock: 50,
        is_visible: true,
        product: { product_id: 1, name: 'Basmati Rice', isVisible: true },
      },
    ]);

    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      const tx = {
        productVariant: {
          findUnique: mockProductVariantFindUnique.mockResolvedValue({
            stock: 50,
            variant_name: '5kg Bag',
          }),
          update: mockProductVariantUpdate.mockResolvedValue({}),
        },
        inventoryReservation: {
          create: mockInventoryReservationCreate.mockResolvedValue({}),
        },
      };
      await fn(tx);
    });

    mockCreateOrder.mockResolvedValue({ order_id: 100 });
    mockCreateOrderItems.mockResolvedValue(undefined);
    mockClearCart.mockResolvedValue(undefined);
  });

  it('processes COD checkout successfully', async () => {
    const { checkoutService } = await import('../../../src/services/checkout.service');
    const result = await checkoutService.processCheckout(1, {
      cartItems: [{ variantId: 1, quantity: 2, sellPrice: 1150 }],
      addressId: 0,
      shippingMethod: 'pickup',
      paymentMethod: 'cod',
      idempotencyKey: 'checkout_test_key_001',
    });

    expect(result.success).toBe(true);
    expect(result.orderId).toBe(100);
    expect(result.total).toBeGreaterThanOrEqual(10);
    expect(mockClearCart).toHaveBeenCalledWith(1);
  });

  it('processes pickup checkout without address validation failure', async () => {
    const { checkoutService } = await import('../../../src/services/checkout.service');
    const result = await checkoutService.processCheckout(1, {
      cartItems: [{ variantId: 1, quantity: 1, sellPrice: 1150 }],
      addressId: 0,
      shippingMethod: 'pickup',
      paymentMethod: 'pickup',
      idempotencyKey: 'checkout_test_key_002',
    });

    expect(result.success).toBe(true);
  });

  it('throws PhoneNumberRequiredError when customer has no phone', async () => {
    mockFindCustomerById.mockResolvedValue({ ...mockCustomer, phone_number: '' });

    const { checkoutService } = await import('../../../src/services/checkout.service');
    await expect(
      checkoutService.processCheckout(1, {
        cartItems: [{ variantId: 1, quantity: 1, sellPrice: 1150 }],
        addressId: 1,
        shippingMethod: 'shipping',
        paymentMethod: 'cod',
      })
    ).rejects.toThrow('Phone number required');
  });

  it('throws BadRequestError when cart is empty', async () => {
    const { checkoutService } = await import('../../../src/services/checkout.service');
    await expect(
      checkoutService.processCheckout(1, {
        addressId: 1,
        shippingMethod: 'shipping',
        paymentMethod: 'cod',
      })
    ).rejects.toThrow('Cart is empty');
  });

  it('throws DuplicateOrderError for repeated idempotency key', async () => {
    mockFindByIdempotencyKey.mockResolvedValue({ order_id: 99 });

    const { checkoutService } = await import('../../../src/services/checkout.service');
    await expect(
      checkoutService.processCheckout(1, {
        cartItems: [{ variantId: 1, quantity: 1, sellPrice: 1150 }],
        addressId: 1,
        shippingMethod: 'shipping',
        paymentMethod: 'cod',
        idempotencyKey: 'duplicate-key',
      })
    ).rejects.toThrow('Order already processed');
  });

  it('throws ShippingMethodInvalidError when home delivery is selected', async () => {
    const { checkoutService } = await import('../../../src/services/checkout.service');
    await expect(
      checkoutService.processCheckout(1, {
        cartItems: [{ variantId: 1, quantity: 1, sellPrice: 1150 }],
        addressId: 1,
        shippingMethod: 'shipping',
        paymentMethod: 'cod',
        idempotencyKey: 'checkout_test_key_003',
      })
    ).rejects.toThrow('Home delivery is temporarily unavailable. Please select store pickup.');
  });

  it('throws SecurityViolationError on price mismatch', async () => {
    const { checkoutService } = await import('../../../src/services/checkout.service');
    await expect(
      checkoutService.processCheckout(1, {
        cartItems: [{ variantId: 1, quantity: 1, sellPrice: 999 }],
        addressId: 0,
        shippingMethod: 'pickup',
        paymentMethod: 'cod',
        idempotencyKey: 'checkout_test_key_004',
      })
    ).rejects.toThrow('Price mismatch detected');
  });

  it('throws SecurityViolationError when order total is below PKR 10 minimum', async () => {
    mockProductVariantFindMany.mockResolvedValue([
      {
        variant_id: 2,
        sell_price: 5,
        buy_price: 3,
        stock: 50,
        is_visible: true,
        product: { product_id: 2, name: 'Small Item', isVisible: true },
      },
    ]);

    const { checkoutService } = await import('../../../src/services/checkout.service');
    await expect(
      checkoutService.processCheckout(1, {
        cartItems: [{ variantId: 2, quantity: 1, sellPrice: 5 }],
        addressId: 1,
        shippingMethod: 'pickup',
        paymentMethod: 'cod',
        idempotencyKey: 'checkout_test_key_005',
      })
    ).rejects.toThrow('Minimum order amount is PKR 10.00');
  });
});
