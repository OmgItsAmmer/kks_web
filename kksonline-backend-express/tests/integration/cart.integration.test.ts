import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getTestAgent, resetTestApp } from '../helpers/test-app';

const mockFindWithDetails = vi.fn();
const mockGetCartTotal = vi.fn();
const mockAddItem = vi.fn();
const mockClearCart = vi.fn();
const mockCheckShopLimit = vi.fn();
const mockCanAddToCart = vi.fn();
const mockGetMainImagesForEntities = vi.fn();

vi.mock('../../src/repositories/cart.repository', () => ({
  cartRepository: {
    findWithDetails: mockFindWithDetails,
    getCartTotal: mockGetCartTotal,
    addItem: mockAddItem,
    updateQuantity: vi.fn(),
    removeItem: vi.fn(),
    clearCart: mockClearCart,
    checkShopLimit: mockCheckShopLimit,
    canAddToCart: mockCanAddToCart,
    validateCartStock: vi.fn(),
    applyCartAdjustments: vi.fn(),
    getItemCount: vi.fn(),
    transferToKiosk: vi.fn(),
  },
}));

vi.mock('../../src/services/supabase-image.service', () => ({
  supabaseImageService: {
    getMainImagesForEntities: mockGetMainImagesForEntities,
  },
}));

describe('Cart integration', () => {
  beforeEach(() => {
    resetTestApp();
    vi.clearAllMocks();
    mockGetMainImagesForEntities.mockResolvedValue(new Map());
    mockCheckShopLimit.mockResolvedValue({ allowed: true });
    mockCanAddToCart.mockResolvedValue(true);
  });

  it('GET /api/v1/cart requires customer header', async () => {
    const agent = await getTestAgent();
    const response = await agent.get('/api/v1/cart');

    expect(response.status).toBe(401);
  });

  it('GET /api/v1/cart returns cart with totals', async () => {
    mockFindWithDetails.mockResolvedValue([
      {
        cartId: 1,
        productId: 1,
        variantId: 1,
        productName: 'Basmati Rice',
        variantName: '5kg',
        quantity: 2,
        sellPrice: 1150,
      },
    ]);
    mockGetCartTotal.mockResolvedValue({ subtotal: 2300, itemCount: 2 });

    const agent = await getTestAgent();
    const response = await agent
      .get('/api/v1/cart')
      .set('X-Customer-Id', '1');

    expect(response.status).toBe(200);
    expect(response.body.data.subtotal).toBe(2300);
    expect(response.body.data.items).toHaveLength(1);
  });

  it('POST /api/v1/cart adds item for customer', async () => {
    mockAddItem.mockResolvedValue({ cart_id: 1, quantity: 1 });
    const agent = await getTestAgent();

    const response = await agent
      .post('/api/v1/cart')
      .set('X-Customer-Id', '1')
      .send({ variantId: 1, quantity: 1 });

    expect(response.status).toBe(201);
    expect(mockAddItem).toHaveBeenCalled();
  });

  it('DELETE /api/v1/cart clears cart', async () => {
    mockClearCart.mockResolvedValue(undefined);
    const agent = await getTestAgent();

    const response = await agent
      .delete('/api/v1/cart')
      .set('X-Customer-Id', '1');

    expect(response.status).toBe(204);
  });
});
