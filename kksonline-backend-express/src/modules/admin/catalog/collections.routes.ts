import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { db } from '../../../config/database.config';
import { asyncHandler } from '../../../middleware/error.middleware';
import { validate } from '../../../middleware/validation.middleware';
import { imageService } from '../../../services/image.service';
import { BadRequestError, ConflictError, NotFoundError } from '../../../utils/errors';
import { sendCreated, sendSuccess } from '../../../utils/response';
import { invalidateCatalog } from '../common/after-write';
import { audit } from '../common/audit';
import { idParams } from '../common/http';
import { can } from '../common/middleware';

/**
 * Collections: a bundle of product variants the shop sells together (shown on the storefront home page and
 * on /collections/:id). One shop, so there is no owner column. Rules the storefront relies on:
 *  - at most ONE collection is "premium" (the main banner), so turning it on for one turns it off for the rest;
 *  - items are variants with a default quantity; their array order is the display order (`sort_order`).
 */
const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024, files: 1 } });

const details = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).optional().nullable(),
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  isPremium: z.boolean().optional(),
});

const itemsBody = z.object({
  items: z
    .array(z.object({ variantId: z.number().int().positive(), defaultQuantity: z.number().int().min(1).max(999) }))
    .max(100),
});

const orderBody = z.object({ ids: z.array(z.number().int().positive()).min(1).max(500) });

const searchQuery = z.object({ q: z.string().trim().max(100).optional(), limit: z.coerce.number().int().min(1).max(50).default(20) });

const dec = (v: { toString(): string } | null | undefined): string => (v ? v.toString() : '0');

/** Items with product name, variant, price, stock and picture: what the admin editor and list need. */
const loadItems = async (collectionIds: number[]) => {
  if (collectionIds.length === 0) return new Map<number, ReturnType<typeof shapeItem>[]>();
  const rows = await db.collectionItem.findMany({
    where: { collection_id: { in: collectionIds } },
    include: { variant: { include: { product: { select: { product_id: true, name: true, isVisible: true } } } } },
    orderBy: [{ sort_order: 'asc' }, { collection_item_id: 'asc' }],
  });
  const productIds = [...new Set(rows.map((r) => r.variant.product_id))];
  const images = await imageService.getMainImagesForEntities(productIds, 'products');
  const byCollection = new Map<number, ReturnType<typeof shapeItem>[]>();
  for (const row of rows) {
    const list = byCollection.get(row.collection_id) ?? [];
    list.push(shapeItem(row, images.get(row.variant.product_id) ?? null));
    byCollection.set(row.collection_id, list);
  }
  return byCollection;
};

type ItemRow = Awaited<ReturnType<typeof db.collectionItem.findMany<{ include: { variant: { include: { product: { select: { product_id: true; name: true; isVisible: true } } } } } }>>>[number];

const shapeItem = (row: ItemRow, imageUrl: string | null) => ({
  itemId: row.collection_item_id,
  variantId: row.variant_id,
  productId: row.variant.product_id,
  productName: row.variant.product.name,
  variantName: row.variant.variant_name,
  sku: row.variant.sku,
  sellPrice: dec(row.variant.sell_price),
  stock: row.variant.stock ?? 0,
  // A hidden variant (or hidden product) is not shown or priced by the storefront.
  isVisible: Boolean(row.variant.is_visible) && row.variant.product.isVisible === true,
  defaultQuantity: row.default_quantity,
  imageUrl,
});

const totalOf = (items: { sellPrice: string; defaultQuantity: number; isVisible: boolean }[]): string =>
  items
    .filter((i) => i.isVisible)
    .reduce((sum, i) => sum + Number(i.sellPrice) * i.defaultQuantity, 0)
    .toFixed(2);

const shapeCollection = (c: { collection_id: number; name: string; description: string | null; is_active: boolean; is_featured: boolean; is_premium: boolean; display_order: number; created_at: Date; updated_at: Date }, imageUrl: string | null, items: ReturnType<typeof shapeItem>[]) => ({
  id: c.collection_id,
  name: c.name,
  description: c.description,
  isActive: c.is_active,
  isFeatured: c.is_featured,
  isPremium: c.is_premium,
  displayOrder: c.display_order,
  createdAt: c.created_at,
  updatedAt: c.updated_at,
  imageUrl,
  itemCount: items.length,
  total: totalOf(items),
  // Things the owner should fix: shown as warnings in the list.
  problems: {
    empty: items.length === 0,
    outOfStock: items.filter((i) => i.stock < i.defaultQuantity).length,
    hidden: items.filter((i) => !i.isVisible).length,
  },
});

const mainImage = async (id: number, fallback: string | null): Promise<string | null> => {
  const map = await imageService.getMainImagesForEntities([id], 'collections');
  const fromEntity = map.get(id);
  if (fromEntity) return fromEntity;
  return fallback && fallback !== '/logo.png' && /^https?:\/\//.test(fallback) ? fallback : null;
};

// --- Variant search for the "Add products" picker -------------------------------------------------
router.get(
  '/collections/variant-search',
  can('catalog.view'),
  validate({ query: searchQuery }),
  asyncHandler(async (req, res) => {
    const { q, limit } = req.query as unknown as z.infer<typeof searchQuery>;
    const variants = await db.productVariant.findMany({
      where: q
        ? {
            OR: [
              { product: { name: { contains: q, mode: 'insensitive' } } },
              { variant_name: { contains: q, mode: 'insensitive' } },
              { sku: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {},
      include: { product: { select: { product_id: true, name: true, isVisible: true } } },
      orderBy: [{ product: { name: 'asc' } }, { variant_name: 'asc' }],
      take: limit,
    });
    const images = await imageService.getMainImagesForEntities([...new Set(variants.map((v) => v.product_id))], 'products');
    return sendSuccess(
      res,
      variants.map((v) => ({
        variantId: v.variant_id,
        productId: v.product_id,
        productName: v.product.name,
        variantName: v.variant_name,
        sku: v.sku,
        sellPrice: dec(v.sell_price),
        stock: v.stock ?? 0,
        isVisible: Boolean(v.is_visible) && v.product.isVisible === true,
        imageUrl: images.get(v.product_id) ?? null,
      }))
    );
  })
);

// --- List ---------------------------------------------------------------------------------------
router.get(
  '/collections',
  can('catalog.view'),
  asyncHandler(async (_req, res) => {
    const rows = await db.collection.findMany({ orderBy: [{ display_order: 'asc' }, { created_at: 'desc' }] });
    const ids = rows.map((r) => r.collection_id);
    const [items, images] = await Promise.all([loadItems(ids), imageService.getMainImagesForEntities(ids, 'collections')]);
    return sendSuccess(
      res,
      rows.map((r) => {
        const fallback = r.image_url && /^https?:\/\//.test(r.image_url) && r.image_url !== '/logo.png' ? r.image_url : null;
        return shapeCollection(r, images.get(r.collection_id) ?? fallback, items.get(r.collection_id) ?? []);
      })
    );
  })
);

// --- Detail -------------------------------------------------------------------------------------
router.get(
  '/collections/:id',
  can('catalog.view'),
  validate({ params: idParams }),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const row = await db.collection.findUnique({ where: { collection_id: id } });
    if (!row) throw new NotFoundError('Collection not found');
    const [items, imageUrl] = await Promise.all([loadItems([id]), mainImage(id, row.image_url)]);
    const list = items.get(id) ?? [];
    return sendSuccess(res, { ...shapeCollection(row, imageUrl, list), items: list });
  })
);

// --- Create -------------------------------------------------------------------------------------
router.post(
  '/collections',
  can('catalog.write'),
  validate({ body: details }),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof details>;
    const row = await db.$transaction(async (tx) => {
      if (body.isPremium) await tx.collection.updateMany({ where: { is_premium: true }, data: { is_premium: false } });
      const last = await tx.collection.aggregate({ _max: { display_order: true } });
      return tx.collection.create({
        data: {
          name: body.name,
          description: body.description || null,
          is_active: body.isActive ?? true,
          is_featured: body.isFeatured ?? false,
          is_premium: body.isPremium ?? false,
          display_order: (last._max.display_order ?? 0) + 1,
        },
      });
    });
    await audit(req, { action: 'collections.create', entityType: 'collections', entityId: row.collection_id, after: body });
    invalidateCatalog();
    return sendCreated(res, { id: row.collection_id, updatedAt: row.updated_at });
  })
);

// --- Update details -----------------------------------------------------------------------------
router.patch(
  '/collections/:id',
  can('catalog.write'),
  validate({ params: idParams, body: details.partial() }),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const body = req.body as Partial<z.infer<typeof details>>;
    const row = await db.$transaction(async (tx) => {
      if (!(await tx.collection.findUnique({ where: { collection_id: id } }))) throw new NotFoundError('Collection not found');
      if (body.isPremium) await tx.collection.updateMany({ where: { is_premium: true, NOT: { collection_id: id } }, data: { is_premium: false } });
      return tx.collection.update({
        where: { collection_id: id },
        data: {
          name: body.name,
          description: body.description === undefined ? undefined : body.description || null,
          is_active: body.isActive,
          is_featured: body.isFeatured,
          is_premium: body.isPremium,
        },
      });
    });
    await audit(req, { action: 'collections.update', entityType: 'collections', entityId: id, after: body });
    invalidateCatalog();
    return sendSuccess(res, { id, updatedAt: row.updated_at });
  })
);

// --- Replace the products in a collection (order = array order) ----------------------------------
router.put(
  '/collections/:id/items',
  can('catalog.write'),
  validate({ params: idParams, body: itemsBody }),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const { items } = req.body as z.infer<typeof itemsBody>;
    const variantIds = items.map((i) => i.variantId);
    if (new Set(variantIds).size !== variantIds.length) throw new BadRequestError('The same product option is in the list twice');
    await db.$transaction(async (tx) => {
      if (!(await tx.collection.findUnique({ where: { collection_id: id } }))) throw new NotFoundError('Collection not found');
      const found = await tx.productVariant.count({ where: { variant_id: { in: variantIds } } });
      if (found !== variantIds.length) throw new ConflictError('One of the products was deleted. Reload the page.');
      await tx.collectionItem.deleteMany({ where: { collection_id: id, variant_id: { notIn: variantIds } } });
      for (const [index, item] of items.entries()) {
        await tx.collectionItem.upsert({
          where: { collection_id_variant_id: { collection_id: id, variant_id: item.variantId } },
          create: { collection_id: id, variant_id: item.variantId, default_quantity: item.defaultQuantity, sort_order: index },
          update: { default_quantity: item.defaultQuantity, sort_order: index },
        });
      }
      await tx.collection.update({ where: { collection_id: id }, data: { updated_at: new Date() } });
    });
    await audit(req, { action: 'collections.items', entityType: 'collections', entityId: id, after: { items } });
    invalidateCatalog();
    return sendSuccess(res, { id, count: items.length });
  })
);

// --- Reorder the collections on the home page ----------------------------------------------------
router.put(
  '/collections-order',
  can('catalog.write'),
  validate({ body: orderBody }),
  asyncHandler(async (req, res) => {
    const { ids } = req.body as z.infer<typeof orderBody>;
    await db.$transaction(ids.map((cid, index) => db.collection.updateMany({ where: { collection_id: cid }, data: { display_order: index + 1 } })));
    await audit(req, { action: 'collections.reorder', entityType: 'collections', after: { ids } });
    invalidateCatalog();
    return sendSuccess(res, { count: ids.length });
  })
);

// --- Picture ------------------------------------------------------------------------------------
router.post(
  '/collections/:id/image',
  can('catalog.write'),
  validate({ params: idParams }),
  upload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) throw new BadRequestError('Choose an image file');
    const id = Number(req.params.id);
    if (!(await db.collection.findUnique({ where: { collection_id: id } }))) throw new NotFoundError('Collection not found');
    const uploaded = await imageService.updateMainImage(req.file.buffer, 'collections', id, req.file.originalname, req.file.mimetype);
    // Drop an old pasted address so the new upload is the one the storefront shows.
    await db.collection.update({ where: { collection_id: id }, data: { image_url: null, updated_at: new Date() } });
    await audit(req, { action: 'collections.image', entityType: 'collections', entityId: id });
    invalidateCatalog();
    return sendSuccess(res, { url: uploaded.url, thumbUrl: uploaded.thumbUrl });
  })
);

// --- Delete -------------------------------------------------------------------------------------
router.delete(
  '/collections/:id',
  can('catalog.write'),
  validate({ params: idParams }),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!(await db.collection.findUnique({ where: { collection_id: id } }))) throw new NotFoundError('Collection not found');
    // Items and customers' collection carts are removed by the database (cascade).
    await db.collection.delete({ where: { collection_id: id } });
    await imageService.deleteAllImagesForEntity(id, 'collections');
    await audit(req, { action: 'collections.delete', entityType: 'collections', entityId: id });
    invalidateCatalog();
    return sendSuccess(res, { deleted: true });
  })
);

export default router;
