import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockProduct, mockVariant } from '../../helpers/factories';

const mockProductCreate = vi.fn();
const mockProductFindById = vi.fn();
const mockProductUpdate = vi.fn();
const mockProductDelete = vi.fn();
const mockGetVariantById = vi.fn();
const mockCreateVariant = vi.fn();
const mockUpdateVariant = vi.fn();
const mockDeleteVariant = vi.fn();
const mockGetAllVariants = vi.fn();
const mockDeleteAllImages = vi.fn();

vi.mock('../../../src/repositories/product.repository', () => ({
  productRepository: {
    create: mockProductCreate,
    findById: mockProductFindById,
    update: mockProductUpdate,
    delete: mockProductDelete,
    getVariantById: mockGetVariantById,
    createVariant: mockCreateVariant,
    updateVariant: mockUpdateVariant,
    deleteVariant: mockDeleteVariant,
    getAllVariants: mockGetAllVariants,
  },
}));

vi.mock('../../../src/services/image.service', () => ({
  imageService: {
    deleteAllImagesForEntity: mockDeleteAllImages,
  },
}));

vi.mock('../../../src/utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

describe('ProductService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDeleteAllImages.mockResolvedValue(true);
  });

  describe('createProduct', () => {
    it('creates product with valid input', async () => {
      mockProductCreate.mockResolvedValue(mockProduct);

      const { productService } = await import('../../../src/services/product.service');
      const product = await productService.createProduct({
        name: 'Basmati Rice 5kg',
        base_price: '1200',
        sale_price: '1150',
        category_id: 1,
      });

      expect(product).toEqual(mockProduct);
      expect(mockProductCreate).toHaveBeenCalled();
    });

    it('throws BadRequestError when name is empty', async () => {
      const { productService } = await import('../../../src/services/product.service');
      await expect(productService.createProduct({ name: '   ' })).rejects.toThrow(
        'Product name is required'
      );
    });

    it('throws BadRequestError for invalid base price', async () => {
      const { productService } = await import('../../../src/services/product.service');
      await expect(
        productService.createProduct({ name: 'Rice', base_price: 'not-a-number' })
      ).rejects.toThrow('Invalid base price');
    });

    it('throws BadRequestError for negative stock', async () => {
      const { productService } = await import('../../../src/services/product.service');
      await expect(
        productService.createProduct({ name: 'Rice', stock_quantity: -1 })
      ).rejects.toThrow('Stock quantity cannot be negative');
    });
  });

  describe('updateProduct', () => {
    it('updates existing product', async () => {
      mockProductFindById.mockResolvedValue(mockProduct);
      mockProductUpdate.mockResolvedValue({ ...mockProduct, name: 'Updated Rice' });

      const { productService } = await import('../../../src/services/product.service');
      const product = await productService.updateProduct(1, { name: 'Updated Rice' });

      expect(product.name).toBe('Updated Rice');
    });

    it('throws NotFoundError when product does not exist', async () => {
      mockProductFindById.mockResolvedValue(null);

      const { productService } = await import('../../../src/services/product.service');
      await expect(productService.updateProduct(999, { name: 'X' })).rejects.toThrow(
        'Product not found'
      );
    });
  });

  describe('deleteProduct', () => {
    it('deletes product and associated images', async () => {
      mockProductFindById.mockResolvedValue(mockProduct);
      mockProductDelete.mockResolvedValue(undefined);

      const { productService } = await import('../../../src/services/product.service');
      const result = await productService.deleteProduct(1);

      expect(result).toBe(true);
      expect(mockDeleteAllImages).toHaveBeenCalledWith(1, 'products');
      expect(mockProductDelete).toHaveBeenCalledWith(1);
    });
  });

  describe('variants', () => {
    it('creates variant and updates price range', async () => {
      mockProductFindById.mockResolvedValue(mockProduct);
      mockCreateVariant.mockResolvedValue(mockVariant);
      mockGetAllVariants.mockResolvedValue([mockVariant]);
      mockProductUpdate.mockResolvedValue(mockProduct);

      const { productService } = await import('../../../src/services/product.service');
      const variant = await productService.createVariant({
        product_id: 1,
        variant_name: '5kg Bag',
        buy_price: 1000,
        sell_price: 1150,
        stock: 50,
      });

      expect(variant).toEqual(mockVariant);
      expect(mockProductUpdate).toHaveBeenCalledWith(1, { price_range: '1150' });
    });

    it('throws NotFoundError when creating variant for missing product', async () => {
      mockProductFindById.mockResolvedValue(null);

      const { productService } = await import('../../../src/services/product.service');
      await expect(
        productService.createVariant({
          product_id: 999,
          variant_name: '5kg',
          buy_price: 1000,
          sell_price: 1150,
        })
      ).rejects.toThrow('Product not found');
    });

    it('throws BadRequestError for negative sell price', async () => {
      const { productService } = await import('../../../src/services/product.service');
      await expect(
        productService.createVariant({
          product_id: 1,
          variant_name: '5kg',
          buy_price: 1000,
          sell_price: -1,
        })
      ).rejects.toThrow('Sell price cannot be negative');
    });

    it('updates variant successfully', async () => {
      mockGetVariantById.mockResolvedValue(mockVariant);
      mockUpdateVariant.mockResolvedValue({ ...mockVariant, sell_price: 1200 });
      mockGetAllVariants.mockResolvedValue([{ ...mockVariant, sell_price: 1200 }]);
      mockProductUpdate.mockResolvedValue(mockProduct);

      const { productService } = await import('../../../src/services/product.service');
      const variant = await productService.updateVariant(1, { sell_price: 1200 });

      expect(Number(variant.sell_price)).toBe(1200);
    });

    it('deletes variant and recalculates price range', async () => {
      mockGetVariantById.mockResolvedValue(mockVariant);
      mockDeleteVariant.mockResolvedValue(undefined);
      mockGetAllVariants.mockResolvedValue([]);
      mockProductUpdate.mockResolvedValue(mockProduct);

      const { productService } = await import('../../../src/services/product.service');
      const result = await productService.deleteVariant(1);

      expect(result).toBe(true);
      expect(mockProductUpdate).toHaveBeenCalledWith(1, { price_range: '--' });
    });
  });

  describe('bulk operations', () => {
    it('bulk updates products and reports failures', async () => {
      mockProductFindById
        .mockResolvedValueOnce(mockProduct)
        .mockResolvedValueOnce(null);
      mockProductUpdate.mockResolvedValue(mockProduct);

      const { productService } = await import('../../../src/services/product.service');
      const result = await productService.bulkUpdateProducts([1, 2], { isVisible: true });

      expect(result.success).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
    });

    it('bulk deletes products', async () => {
      mockProductFindById.mockResolvedValue(mockProduct);
      mockProductDelete.mockResolvedValue(undefined);

      const { productService } = await import('../../../src/services/product.service');
      const result = await productService.bulkDeleteProducts([1]);

      expect(result.success).toBe(1);
      expect(result.failed).toBe(0);
    });
  });

  describe('toggleVisibility', () => {
    it('delegates to updateProduct', async () => {
      mockProductFindById.mockResolvedValue(mockProduct);
      mockProductUpdate.mockResolvedValue({ ...mockProduct, isVisible: true });

      const { productService } = await import('../../../src/services/product.service');
      const product = await productService.toggleVisibility(1, true);

      expect(product.isVisible).toBe(true);
    });
  });
});
