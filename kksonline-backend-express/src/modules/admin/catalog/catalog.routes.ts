import { Router } from 'express';
import multer from 'multer';
import { Prisma, ProductTag } from '@prisma/client';
import { z } from 'zod';
import { db } from '../../../config/database.config';
import { asyncHandler } from '../../../middleware/error.middleware';
import { validate } from '../../../middleware/validation.middleware';
import { imageService, type EntityCategory } from '../../../services/image.service';
import { applyStockChanges, recalcProductAggregates } from '../../../services/inventory.service';
import { BadRequestError, ConflictError, NotFoundError } from '../../../utils/errors';
import { sendCreated, sendPaginated, sendSuccess } from '../../../utils/response';
import { invalidateCatalog } from '../common/after-write';
import { audit } from '../common/audit';
import { boolQuery, expectedUpdatedAt, idParams, nonNegativeMoney, paging, sameInstant, skipTake } from '../common/http';
import { can } from '../common/middleware';
import { adminOf } from '../common/types';
import { roleCan } from '../permissions';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024, files: 8 } });

const showCost = (req: Parameters<typeof adminOf>[0]) => roleCan(adminOf(req).role, 'cost.view');

const staleError = () => new ConflictError('This item was changed by someone else. Reload and try again.', 'ALREADY_EXISTS');

const uniqueGuard = async <T>(work: () => Promise<T>, message: string): Promise<T> => {
  try {
    return await work();
  } catch (error) {
    if ((error as { code?: string }).code === 'P2002') throw new ConflictError(message);
    throw error;
  }
};

// ---------------------------------------------------------------------------
// Categories and brands (same shape, so one factory)
// ---------------------------------------------------------------------------

interface LookupConfig {
  path: string;
  entity: EntityCategory;
  list: () => Promise<{ id: number; name: string; isFeatured: boolean; extra: Record<string, unknown>; productCount: number }[]>;
  create: (body: Record<string, unknown>) => Promise<{ id: number; name: string }>;
  update: (id: number, body: Record<string, unknown>) => Promise<{ id: number; name: string }>;
  remove: (id: number) => Promise<void>;
  bodySchema: z.ZodTypeAny;
  label: string;
}

const categoryBody = z.object({ name: z.string().trim().min(1).max(120), isFeatured: z.boolean().optional() });
const brandBody = z.object({
  name: z.string().trim().min(1).max(120),
  isFeatured: z.boolean().optional(),
  isVerified: z.boolean().optional(),
});

const lookups: LookupConfig[] = [
  {
    path: 'categories',
    entity: 'categories',
    label: 'Category',
    bodySchema: categoryBody,
    list: async () => {
      const [rows, counts] = await Promise.all([
        db.category.findMany({ orderBy: { category_name: 'asc' } }),
        db.product.groupBy({ by: ['category_id'], _count: { _all: true } }),
      ]);
      const countBy = new Map(counts.map((c) => [c.category_id, c._count._all]));
      return rows.map((r) => ({
        id: r.category_id,
        name: r.category_name,
        isFeatured: Boolean(r.isFeatured),
        extra: {},
        productCount: countBy.get(r.category_id) ?? 0,
      }));
    },
    create: async (b) => {
      const body = b as z.infer<typeof categoryBody>;
      const row = await db.category.create({ data: { category_name: body.name, isFeatured: body.isFeatured ?? false } });
      return { id: row.category_id, name: row.category_name };
    },
    update: async (id, b) => {
      const body = b as Partial<z.infer<typeof categoryBody>>;
      const row = await db.category.update({
        where: { category_id: id },
        data: { category_name: body.name, isFeatured: body.isFeatured },
      });
      return { id: row.category_id, name: row.category_name };
    },
    remove: async (id) => {
      const used = await db.product.count({ where: { category_id: id } });
      if (used > 0) throw new ConflictError(`${used} products use this category. Move them first.`);
      await db.category.delete({ where: { category_id: id } });
    },
  },
  {
    path: 'brands',
    entity: 'brands',
    label: 'Brand',
    bodySchema: brandBody,
    list: async () => {
      const [rows, counts] = await Promise.all([
        db.brand.findMany({ orderBy: { brandname: 'asc' } }),
        db.product.groupBy({ by: ['brandID'], _count: { _all: true } }),
      ]);
      const countBy = new Map(counts.map((c) => [c.brandID, c._count._all]));
      return rows.map((r) => ({
        id: r.brandID,
        name: r.brandname ?? '',
        isFeatured: Boolean(r.isFeatured),
        extra: { isVerified: Boolean(r.isVerified) },
        productCount: countBy.get(r.brandID) ?? 0,
      }));
    },
    create: async (b) => {
      const body = b as z.infer<typeof brandBody>;
      const row = await db.brand.create({
        data: { brandname: body.name, isFeatured: body.isFeatured ?? false, isVerified: body.isVerified ?? false },
      });
      return { id: row.brandID, name: row.brandname ?? '' };
    },
    update: async (id, b) => {
      const body = b as Partial<z.infer<typeof brandBody>>;
      const row = await db.brand.update({
        where: { brandID: id },
        data: { brandname: body.name, isFeatured: body.isFeatured, isVerified: body.isVerified },
      });
      return { id: row.brandID, name: row.brandname ?? '' };
    },
    remove: async (id) => {
      const used = await db.product.count({ where: { brandID: id } });
      if (used > 0) throw new ConflictError(`${used} products use this brand. Move them first.`);
      await db.brand.delete({ where: { brandID: id } });
    },
  },
];

for (const lk of lookups) {
  router.get(
    `/${lk.path}`,
    can('catalog.view'),
    asyncHandler(async (_req, res) => {
      const rows = await lk.list();
      const images = await imageService.getMainImagesForEntities(
        rows.map((r) => r.id),
        lk.entity
      );
      return sendSuccess(
        res,
        rows.map((r) => ({ ...r, imageUrl: images.get(r.id) ?? null }))
      );
    })
  );

  router.post(
    `/${lk.path}`,
    can('catalog.write'),
    validate({ body: lk.bodySchema }),
    asyncHandler(async (req, res) => {
      const row = await uniqueGuard(() => lk.create(req.body), `${lk.label} already exists`);
      await audit(req, { action: `${lk.path}.create`, entityType: lk.path, entityId: row.id, after: req.body });
      invalidateCatalog();
      return sendCreated(res, row);
    })
  );

  router.patch(
    `/${lk.path}/:id`,
    can('catalog.write'),
    validate({ params: idParams, body: (lk.bodySchema as z.AnyZodObject).partial() }),
    asyncHandler(async (req, res) => {
      const id = Number(req.params.id);
      const row = await uniqueGuard(() => lk.update(id, req.body), `${lk.label} already exists`);
      await audit(req, { action: `${lk.path}.update`, entityType: lk.path, entityId: id, after: req.body });
      invalidateCatalog();
      return sendSuccess(res, row);
    })
  );

  router.delete(
    `/${lk.path}/:id`,
    can('catalog.write'),
    validate({ params: idParams }),
    asyncHandler(async (req, res) => {
      const id = Number(req.params.id);
      await lk.remove(id);
      await imageService.deleteAllImagesForEntity(id, lk.entity);
      await audit(req, { action: `${lk.path}.delete`, entityType: lk.path, entityId: id });
      invalidateCatalog();
      return sendSuccess(res, { deleted: true });
    })
  );

  router.post(
    `/${lk.path}/:id/image`,
    can('catalog.write'),
    validate({ params: idParams }),
    upload.single('file'),
    asyncHandler(async (req, res) => {
      if (!req.file) throw new BadRequestError('Choose an image file');
      const id = Number(req.params.id);
      const uploaded = await imageService.updateMainImage(req.file.buffer, lk.entity, id, req.file.originalname, req.file.mimetype);
      await audit(req, { action: `${lk.path}.image`, entityType: lk.path, entityId: id });
      invalidateCatalog();
      return sendSuccess(res, { url: uploaded.url, thumbUrl: uploaded.thumbUrl });
    })
  );
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

const TAGS = Object.values(ProductTag) as [ProductTag, ...ProductTag[]];

const variantInput = z.object({
  variantName: z.string().trim().min(1).max(120),
  sku: z.string().trim().max(80).optional().nullable(),
  sellPrice: nonNegativeMoney,
  buyPrice: nonNegativeMoney.default(0),
  stock: z.number().int().min(0).max(1_000_000).default(0),
  alertStock: z.number().int().min(0).max(1_000_000).default(0),
  isVisible: z.boolean().default(true),
});

const productFields = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().max(10_000).optional().nullable(),
  categoryId: z.number().int().positive().optional().nullable(),
  brandId: z.number().int().positive().optional().nullable(),
  isVisible: z.boolean().optional(),
  isPopular: z.boolean().optional(),
  tag: z.enum(TAGS).optional().nullable(),
  alertStock: z.number().int().min(0).optional().nullable(),
});

const productCreate = productFields.extend({ variants: z.array(variantInput).min(1).max(100) });
const productUpdate = productFields.partial().extend({ expectedUpdatedAt });

const listQuery = paging.extend({
  q: z.string().trim().max(100).optional(),
  categoryId: z.coerce.number().int().positive().optional(),
  brandId: z.coerce.number().int().positive().optional(),
  visible: boolQuery,
  stock: z.enum(['in', 'low', 'out']).optional(),
  tag: z.enum(TAGS).optional(),
  sort: z.enum(['name', 'created_at', 'stock_quantity', 'min_price', 'updated_at']).default('updated_at'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

router.get(
  '/products',
  can('catalog.view'),
  validate({ query: listQuery }),
  asyncHandler(async (req, res) => {
    const q = req.query as unknown as z.infer<typeof listQuery>;
    const where: Prisma.ProductWhereInput = {};
    if (q.q) {
      where.OR = [{ name: { contains: q.q, mode: 'insensitive' } }, { variants: { some: { sku: { contains: q.q, mode: 'insensitive' } } } }];
      const asId = Number(q.q);
      if (Number.isInteger(asId) && asId > 0) where.OR.push({ product_id: asId });
    }
    if (q.categoryId) where.category_id = q.categoryId;
    if (q.brandId) where.brandID = q.brandId;
    if (q.visible !== undefined) where.isVisible = q.visible;
    if (q.tag) where.tag = q.tag;
    if (q.stock === 'out') where.stock_quantity = { lte: 0 };
    if (q.stock === 'in') where.stock_quantity = { gt: 0 };
    if (q.stock === 'low') {
      const low = await db.$queryRaw<{ product_id: number }[]>`
        SELECT DISTINCT product_id FROM product_variants WHERE alert_stock > 0 AND stock <= alert_stock`;
      where.product_id = { in: low.map((l) => l.product_id) };
    }

    const [rows, total] = await Promise.all([
      db.product.findMany({
        where,
        orderBy: { [q.sort]: q.order },
        ...skipTake(q.page, q.pageSize),
        include: { category: true, brand: true, variants: { select: { variant_id: true, stock: true, alert_stock: true } } },
      }),
      db.product.count({ where }),
    ]);
    const thumbs = await imageService.getMainImagesForEntities(
      rows.map((r) => r.product_id),
      'products'
    );
    const items = rows.map((p) => ({
      id: p.product_id,
      name: p.name,
      categoryId: p.category_id,
      categoryName: p.category?.category_name ?? null,
      brandId: p.brandID,
      brandName: p.brand?.brandname ?? null,
      isVisible: Boolean(p.isVisible),
      tag: p.tag,
      stockQuantity: p.stock_quantity ?? 0,
      priceRange: p.price_range,
      minPrice: p.min_price,
      maxPrice: p.max_price,
      variantCount: p.variants.length,
      lowStock: p.variants.some((v) => Number(v.alert_stock) > 0 && (v.stock ?? 0) <= Number(v.alert_stock)),
      imageUrl: thumbs.get(p.product_id) ?? null,
      updatedAt: p.updated_at,
    }));
    return sendPaginated(res, items, { page: q.page, pageSize: q.pageSize, total });
  })
);

const loadProductDetail = async (id: number, cost: boolean) => {
  const p = await db.product.findUnique({
    where: { product_id: id },
    include: { category: true, brand: true, variants: { orderBy: { variant_id: 'asc' } } },
  });
  if (!p) throw new NotFoundError('Product not found');
  const images = await imageService.listImages(id, 'products');
  return {
    id: p.product_id,
    name: p.name,
    description: p.description ?? '',
    categoryId: p.category_id,
    categoryName: p.category?.category_name ?? null,
    brandId: p.brandID,
    brandName: p.brand?.brandname ?? null,
    isVisible: Boolean(p.isVisible),
    isPopular: Boolean(p.ispopular),
    tag: p.tag,
    alertStock: p.alert_stock,
    stockQuantity: p.stock_quantity ?? 0,
    priceRange: p.price_range,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
    variants: p.variants.map((v) => ({
      id: v.variant_id,
      variantName: v.variant_name,
      sku: v.sku,
      sellPrice: v.sell_price,
      ...(cost ? { buyPrice: v.buy_price } : {}),
      stock: v.stock ?? 0,
      alertStock: Number(v.alert_stock),
      isVisible: v.is_visible !== false,
      updatedAt: v.updated_at,
    })),
    images,
  };
};

router.get(
  '/products/:id',
  can('catalog.view'),
  validate({ params: idParams }),
  asyncHandler(async (req, res) => sendSuccess(res, await loadProductDetail(Number(req.params.id), showCost(req))))
);

router.post(
  '/products',
  can('catalog.write'),
  validate({ body: productCreate }),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof productCreate>;
    const admin = adminOf(req);
    const id = await uniqueGuard(
      () =>
        db.$transaction(async (tx) => {
          const product = await tx.product.create({
            data: {
              name: body.name,
              description: body.description ?? '',
              category_id: body.categoryId ?? null,
              brandID: body.brandId ?? null,
              isVisible: body.isVisible ?? false,
              ispopular: body.isPopular ?? false,
              tag: body.tag ?? null,
              alert_stock: body.alertStock ?? null,
            },
          });
          const stockChanges: { variantId: number; delta: number }[] = [];
          for (const v of body.variants) {
            const created = await tx.productVariant.create({
              data: {
                product_id: product.product_id,
                variant_name: v.variantName,
                sku: v.sku || null,
                sell_price: v.sellPrice,
                buy_price: v.buyPrice,
                stock: 0,
                alert_stock: BigInt(v.alertStock),
                is_visible: v.isVisible,
              },
            });
            if (v.stock > 0) stockChanges.push({ variantId: created.variant_id, delta: v.stock });
          }
          if (stockChanges.length > 0) {
            await applyStockChanges(
              tx,
              stockChanges.map((c) => ({ ...c, reason: 'initial' as const, refType: 'product', refId: product.product_id })),
              admin.email
            );
          }
          await recalcProductAggregates(tx, [product.product_id]);
          await audit(req, { action: 'products.create', entityType: 'product', entityId: product.product_id, after: body }, tx);
          return product.product_id;
        }),
      'A variant with this SKU already exists'
    );
    invalidateCatalog();
    return sendCreated(res, await loadProductDetail(id, showCost(req)));
  })
);

router.patch(
  '/products/:id',
  can('catalog.write'),
  validate({ params: idParams, body: productUpdate }),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const { expectedUpdatedAt: expected, ...body } = req.body as z.infer<typeof productUpdate>;
    await db.$transaction(async (tx) => {
      const before = await tx.product.findUnique({ where: { product_id: id } });
      if (!before) throw new NotFoundError('Product not found');
      if (!sameInstant(before.updated_at, expected)) throw staleError();
      const after = await tx.product.update({
        where: { product_id: id },
        data: {
          name: body.name,
          description: body.description === undefined ? undefined : body.description ?? '',
          category_id: body.categoryId,
          brandID: body.brandId,
          isVisible: body.isVisible,
          ispopular: body.isPopular,
          tag: body.tag,
          alert_stock: body.alertStock,
          updated_at: new Date(),
        },
      });
      await audit(req, { action: 'products.update', entityType: 'product', entityId: id, before, after }, tx);
    });
    invalidateCatalog();
    return sendSuccess(res, await loadProductDetail(id, showCost(req)));
  })
);

router.delete(
  '/products/:id',
  can('catalog.write'),
  validate({ params: idParams }),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    await deleteProducts([id], req);
    invalidateCatalog();
    return sendSuccess(res, { deleted: true });
  })
);

/** Deletes products that were never ordered or restocked. Anything else must be hidden instead. */
const deleteProducts = async (ids: number[], req: Parameters<typeof audit>[0]) => {
  await db.$transaction(async (tx) => {
    for (const id of ids) {
      const [orders, purchases] = await Promise.all([
        tx.orderItem.count({ where: { product_id: id } }),
        tx.purchaseItem.count({ where: { product_id: id } }),
      ]);
      if (orders > 0 || purchases > 0) {
        throw new ConflictError('This product has orders or stock receipts, so it cannot be deleted. Hide it instead.');
      }
      const variants = await tx.productVariant.findMany({ where: { product_id: id }, select: { variant_id: true } });
      const variantIds = variants.map((v) => v.variant_id);
      await tx.cart.deleteMany({ where: { variant_id: { in: variantIds } } });
      await tx.collectionItem.deleteMany({ where: { variant_id: { in: variantIds } } });
      await tx.collectionCartItem.deleteMany({ where: { variant_id: { in: variantIds } } });
      await tx.inventoryReservation.deleteMany({ where: { variant_id: { in: variantIds } } });
      await tx.inventoryMovement.deleteMany({ where: { product_id: id } });
      await tx.wishlist.deleteMany({ where: { product_id: id } });
      await tx.review.deleteMany({ where: { product_id: id } });
      await tx.productDiscount.deleteMany({ where: { product_id: id } });
      await tx.notification.deleteMany({ where: { product_id: id } });
      await tx.productVariant.deleteMany({ where: { product_id: id } });
      await tx.product.delete({ where: { product_id: id } });
      await audit(req, { action: 'products.delete', entityType: 'product', entityId: id }, tx);
    }
  });
  for (const id of ids) await imageService.deleteAllImagesForEntity(id, 'products');
};

const bulkBody = z.object({
  ids: z.array(z.number().int().positive()).min(1).max(200),
  action: z.enum(['hide', 'show', 'setCategory', 'setBrand', 'delete']),
  value: z.number().int().positive().nullable().optional(),
});

router.post(
  '/products/bulk',
  can('catalog.write'),
  validate({ body: bulkBody }),
  asyncHandler(async (req, res) => {
    const { ids, action, value } = req.body as z.infer<typeof bulkBody>;
    if (action === 'delete') {
      await deleteProducts(ids, req);
    } else {
      const data: Prisma.ProductUpdateManyMutationInput & { category_id?: number | null; brandID?: number | null } = {
        updated_at: new Date(),
      };
      if (action === 'hide') data.isVisible = false;
      if (action === 'show') data.isVisible = true;
      if (action === 'setCategory') data.category_id = value ?? null;
      if (action === 'setBrand') data.brandID = value ?? null;
      await db.product.updateMany({ where: { product_id: { in: ids } }, data });
      await audit(req, { action: `products.bulk.${action}`, entityType: 'product', entityId: ids.join(','), after: { value } });
    }
    invalidateCatalog();
    return sendSuccess(res, { affected: ids.length });
  })
);

// ---------------------------------------------------------------------------
// Variants (stock is NOT editable here: it only changes through inventory)
// ---------------------------------------------------------------------------

router.post(
  '/products/:id/variants',
  can('catalog.write'),
  validate({ params: idParams, body: variantInput }),
  asyncHandler(async (req, res) => {
    const productId = Number(req.params.id);
    const v = req.body as z.infer<typeof variantInput>;
    const admin = adminOf(req);
    await uniqueGuard(
      () =>
        db.$transaction(async (tx) => {
          const exists = await tx.product.findUnique({ where: { product_id: productId }, select: { product_id: true } });
          if (!exists) throw new NotFoundError('Product not found');
          const created = await tx.productVariant.create({
            data: {
              product_id: productId,
              variant_name: v.variantName,
              sku: v.sku || null,
              sell_price: v.sellPrice,
              buy_price: v.buyPrice,
              stock: 0,
              alert_stock: BigInt(v.alertStock),
              is_visible: v.isVisible,
            },
          });
          if (v.stock > 0) {
            await applyStockChanges(
              tx,
              [{ variantId: created.variant_id, delta: v.stock, reason: 'initial', refType: 'product', refId: productId }],
              admin.email
            );
          }
          await recalcProductAggregates(tx, [productId]);
          await audit(req, { action: 'variants.create', entityType: 'variant', entityId: created.variant_id, after: v }, tx);
        }),
      'A variant with this SKU already exists'
    );
    invalidateCatalog();
    return sendCreated(res, await loadProductDetail(productId, showCost(req)));
  })
);

const variantUpdate = variantInput.omit({ stock: true }).partial().extend({ expectedUpdatedAt });

router.patch(
  '/variants/:id',
  can('catalog.write'),
  validate({ params: idParams, body: variantUpdate }),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const { expectedUpdatedAt: expected, ...v } = req.body as z.infer<typeof variantUpdate>;
    const productId = await uniqueGuard(
      () =>
        db.$transaction(async (tx) => {
          const before = await tx.productVariant.findUnique({ where: { variant_id: id } });
          if (!before) throw new NotFoundError('Variant not found');
          if (!sameInstant(before.updated_at, expected)) throw staleError();
          const after = await tx.productVariant.update({
            where: { variant_id: id },
            data: {
              variant_name: v.variantName,
              sku: v.sku === undefined ? undefined : v.sku || null,
              sell_price: v.sellPrice,
              buy_price: v.buyPrice,
              alert_stock: v.alertStock === undefined ? undefined : BigInt(v.alertStock),
              is_visible: v.isVisible,
              updated_at: new Date(),
            },
          });
          await recalcProductAggregates(tx, [before.product_id]);
          await audit(req, { action: 'variants.update', entityType: 'variant', entityId: id, before, after }, tx);
          return before.product_id;
        }),
      'A variant with this SKU already exists'
    );
    invalidateCatalog();
    return sendSuccess(res, await loadProductDetail(productId, showCost(req)));
  })
);

router.delete(
  '/variants/:id',
  can('catalog.write'),
  validate({ params: idParams }),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const productId = await db.$transaction(async (tx) => {
      const v = await tx.productVariant.findUnique({ where: { variant_id: id } });
      if (!v) throw new NotFoundError('Variant not found');
      const sold = await tx.orderItem.count({ where: { variant_id: id } });
      const bought = await tx.purchaseItem.count({ where: { variant_id: id } });
      if (sold > 0 || bought > 0) throw new ConflictError('This variant has orders or receipts, so it cannot be deleted. Hide it instead.');
      if ((v.stock ?? 0) > 0) throw new ConflictError('Adjust the stock to 0 before deleting this variant.');
      const remaining = await tx.productVariant.count({ where: { product_id: v.product_id } });
      if (remaining <= 1) throw new ConflictError('A product needs at least one variant.');
      await tx.cart.deleteMany({ where: { variant_id: id } });
      await tx.collectionItem.deleteMany({ where: { variant_id: id } });
      await tx.collectionCartItem.deleteMany({ where: { variant_id: id } });
      await tx.inventoryReservation.deleteMany({ where: { variant_id: id } });
      await tx.inventoryMovement.deleteMany({ where: { variant_id: id } });
      await tx.productVariant.delete({ where: { variant_id: id } });
      await recalcProductAggregates(tx, [v.product_id]);
      await audit(req, { action: 'variants.delete', entityType: 'variant', entityId: id, before: v }, tx);
      return v.product_id;
    });
    invalidateCatalog();
    return sendSuccess(res, await loadProductDetail(productId, showCost(req)));
  })
);

// ---------------------------------------------------------------------------
// Product images
// ---------------------------------------------------------------------------

router.post(
  '/products/:id/images',
  can('catalog.write'),
  validate({ params: idParams }),
  upload.array('files', 8),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const files = (req.files as Express.Multer.File[] | undefined) ?? [];
    if (files.length === 0) throw new BadRequestError('Choose at least one image');
    const exists = await db.product.findUnique({ where: { product_id: id }, select: { product_id: true } });
    if (!exists) throw new NotFoundError('Product not found');
    for (const f of files) await imageService.addImage(f.buffer, 'products', id, f.originalname, f.mimetype);
    await audit(req, { action: 'products.images.add', entityType: 'product', entityId: id, after: { count: files.length } });
    invalidateCatalog();
    return sendCreated(res, { images: await imageService.listImages(id, 'products') });
  })
);

const imageParams = z.object({ id: z.coerce.number().int().positive(), imageEntityId: z.coerce.number().int().positive() });

router.patch(
  '/products/:id/images/:imageEntityId/featured',
  can('catalog.write'),
  validate({ params: imageParams }),
  asyncHandler(async (req, res) => {
    const { id, imageEntityId } = req.params as unknown as z.infer<typeof imageParams>;
    const ok = await imageService.setFeaturedImage(imageEntityId, id, 'products');
    if (!ok) throw new NotFoundError('Image not found');
    invalidateCatalog();
    return sendSuccess(res, { images: await imageService.listImages(id, 'products') });
  })
);

router.delete(
  '/products/:id/images/:imageEntityId',
  can('catalog.write'),
  validate({ params: imageParams }),
  asyncHandler(async (req, res) => {
    const { id, imageEntityId } = req.params as unknown as z.infer<typeof imageParams>;
    await imageService.deleteImage(imageEntityId);
    await audit(req, { action: 'products.images.delete', entityType: 'product', entityId: id, after: { imageEntityId } });
    invalidateCatalog();
    return sendSuccess(res, { images: await imageService.listImages(id, 'products') });
  })
);

export default router;
