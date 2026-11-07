import sharp from 'sharp';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const putObject = vi.fn();
const deleteObject = vi.fn();
const deleteObjects = vi.fn();
const signedUrl = vi.fn();
const objectExists = vi.fn();

const imageCreate = vi.fn();
const imageDelete = vi.fn();
const imageEntityCreate = vi.fn();
const imageEntityUpdateMany = vi.fn();
const imageEntityFindFirst = vi.fn();
const imageEntityFindMany = vi.fn();
const imageEntityFindUnique = vi.fn();
const imageEntityDeleteMany = vi.fn();
const imageEntityCount = vi.fn();

vi.mock('../../../src/config/env.config', () => ({
  config: { r2: { assetBaseUrl: 'https://cdn.test', publicBucket: 'kks-public', privateBucket: 'kks-private' }, server: { isProduction: false }, cache: { ttlSeconds: 60 } },
}));
vi.mock('../../../src/config/feature-flags', () => ({ ADVANCE_PAYMENT_RECEIPT_ENABLED: true }));
vi.mock('../../../src/utils/logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }));
vi.mock('../../../src/utils/cache', () => ({ CacheKeys: { PRODUCT_IMAGES: 'product_images' }, deleteByPattern: vi.fn() }));

vi.mock('../../../src/config/database.config', () => {
  const tx = {
    image: { create: imageCreate },
    imageEntity: { create: imageEntityCreate, updateMany: imageEntityUpdateMany },
  };
  return {
    db: {
      image: { delete: imageDelete },
      imageEntity: {
        findFirst: imageEntityFindFirst,
        findMany: imageEntityFindMany,
        findUnique: imageEntityFindUnique,
        updateMany: imageEntityUpdateMany,
        deleteMany: imageEntityDeleteMany,
        count: imageEntityCount,
        update: vi.fn(),
      },
      $transaction: vi.fn(async (arg: unknown) => (typeof arg === 'function' ? (arg as (t: unknown) => unknown)(tx) : Promise.all(arg as Promise<unknown>[]))),
    },
  };
});

// Keep the real image pipeline (sharp) but replace the R2 network calls.
vi.mock('../../../src/services/storage.service', async () => {
  const actual = await vi.importActual<typeof import('../../../src/services/storage.service')>('../../../src/services/storage.service');
  return { ...actual, putObject, deleteObject, deleteObjects, signedUrl, objectExists };
});

const png = async (w = 900, h = 600) => sharp({ create: { width: w, height: h, channels: 3, background: { r: 10, g: 80, b: 200 } } }).png().toBuffer();

describe('ImageService (R2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    imageCreate.mockResolvedValue({ image_id: 7 });
    imageEntityCreate.mockResolvedValue({ image_entity_id: 11 });
    imageEntityUpdateMany.mockResolvedValue({ count: 1 });
    imageEntityDeleteMany.mockResolvedValue({ count: 1 });
    imageEntityCount.mockResolvedValue(0);
    signedUrl.mockResolvedValue('https://signed.example/receipt');
  });

  it('turns an upload into a WebP plus a 400 px thumbnail, and saves folder + filename', async () => {
    const { imageService } = await import('../../../src/services/image.service');
    const res = await imageService.uploadFromBuffer(await png(2400, 1600), 'products', 5, true);

    expect(putObject).toHaveBeenCalledTimes(2);
    const [main, thumb] = putObject.mock.calls;
    expect(main![0]).toBe('products');
    expect(main![1]).toMatch(/^5\/\d+-[0-9a-f-]{36}\.webp$/);
    expect(main![3]).toBe('image/webp');
    expect(thumb![1]).toMatch(/_400\.webp$/);

    const mainMeta = await sharp(main![2] as Buffer).metadata();
    const thumbMeta = await sharp(thumb![2] as Buffer).metadata();
    expect(mainMeta.format).toBe('webp');
    expect(Math.max(mainMeta.width!, mainMeta.height!)).toBe(1600);
    expect(Math.max(thumbMeta.width!, thumbMeta.height!)).toBe(400);

    expect(imageCreate).toHaveBeenCalledWith({ data: expect.objectContaining({ folderType: 'products', filename: main![1] }) });
    expect(res.url).toBe(`https://cdn.test/products/${main![1]}`);
    expect(res.thumbUrl).toMatch(/^https:\/\/cdn\.test\/products\/.*_400\.webp$/);
  });

  it('never makes a small image bigger', async () => {
    const { imageService } = await import('../../../src/services/image.service');
    await imageService.uploadFromBuffer(await png(300, 200), 'products', 5);
    const meta = await sharp(putObject.mock.calls[0]![2] as Buffer).metadata();
    expect(meta.width).toBe(300);
  });

  it('rejects a file that is not really an image, whatever it claims to be', async () => {
    const { imageService } = await import('../../../src/services/image.service');
    await expect(imageService.uploadFromBuffer(Buffer.from('<?php echo 1; ?>'), 'products', 5, true, 'a.png', 'image/png')).rejects.toThrow(/valid image/);
    expect(putObject).not.toHaveBeenCalled();
  });

  it('removes the stored files if the database write fails', async () => {
    const { imageService } = await import('../../../src/services/image.service');
    imageCreate.mockRejectedValueOnce(new Error('db down'));
    await expect(imageService.uploadFromBuffer(await png(), 'products', 5)).rejects.toThrow(/Failed to upload image/);
    expect(deleteObjects).toHaveBeenCalledTimes(1);
    expect(deleteObjects.mock.calls[0]![1]).toHaveLength(2);
  });

  it('builds public URLs from the CDN base and signs private ones', async () => {
    const { imageService } = await import('../../../src/services/image.service');
    imageEntityFindFirst.mockResolvedValueOnce({ image: { folderType: 'products', filename: '5/a.webp' } });
    expect(await imageService.getMainImageUrl(5, 'products')).toBe('https://cdn.test/products/5/a.webp');
    imageEntityFindFirst.mockResolvedValueOnce({ image: { folderType: 'customers', filename: '9/me.webp' } });
    expect(await imageService.getMainImageUrl(9, 'customers')).toBe('https://signed.example/receipt');
  });

  it('only accepts receipt paths that belong to the customer', async () => {
    const { imageService } = await import('../../../src/services/image.service');
    expect(imageService.isValidReceiptPath(4, '4/pending/x.webp')).toBe(true);
    expect(imageService.isValidReceiptPath(4, '5/pending/x.webp')).toBe(false);
    expect(imageService.isValidReceiptPath(4, '4/../5/x.webp')).toBe(false);
    objectExists.mockResolvedValue(true);
    expect(await imageService.verifyReceiptOwnership(4, '4/pending/x.webp')).toBe(true);
    expect(await imageService.verifyReceiptOwnership(4, '5/pending/x.webp')).toBe(false);
  });
});
