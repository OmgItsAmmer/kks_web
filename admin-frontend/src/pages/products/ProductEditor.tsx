import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ImagePlus, Sparkles, Star, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import { z } from 'zod';
import { Can } from '@/components/Can';
import { Button } from '@/components/ui/button';
import { Badge, Card, CardBody, CardHeader, CardTitle, EmptyState, PageHeader, Skeleton, Table, TD, TH, THead, TR } from '@/components/ui/data';
import { Field, Input, Select, Switch, Textarea } from '@/components/ui/form';
import { ConfirmDialog, Dialog } from '@/components/ui/overlay';
import { api, ApiError } from '@/lib/api-client';
import { useAuth } from '@/lib/auth';
import { money } from '@/lib/format';
import { toastError } from '@/lib/hooks';
import { useLookups } from './Products';

interface Variant {
  id: number;
  variantName: string;
  sku: string | null;
  sellPrice: string;
  buyPrice?: string;
  stock: number;
  alertStock: number;
  isVisible: boolean;
  updatedAt: string;
}
interface ProductImage {
  imageEntityId: number;
  isFeatured: boolean;
  url: string | null;
  thumbUrl: string | null;
}
interface ProductFull {
  id: number;
  name: string;
  description: string;
  categoryId: number | null;
  brandId: number | null;
  isVisible: boolean;
  isPopular: boolean;
  tag: string | null;
  alertStock: number | null;
  stockQuantity: number;
  priceRange: string | null;
  updatedAt: string;
  variants: Variant[];
  images: ProductImage[];
}

const TAGS = ['CHOICE', 'RECOMMENDED', 'TRENDING', 'hotSeller', 'flashSale', 'newArrival', 'AUTHENTIC'];
const price = z.string().trim().regex(/^\d+(\.\d{1,2})?$/, 'Enter a number like 1500 or 1499.50');
const intStr = z.string().trim().regex(/^\d+$/, 'Whole number');

const schema = z.object({
  name: z.string().trim().min(1, 'Give the product a name').max(200),
  description: z.string().max(10000),
  categoryId: z.string(),
  brandId: z.string(),
  tag: z.string(),
  isVisible: z.boolean(),
  isPopular: z.boolean(),
  variants: z.array(
    z.object({
      id: z.number().optional(),
      variantName: z.string().trim().min(1, 'Name the variant').max(120),
      sku: z.string().trim().max(80),
      sellPrice: price,
      buyPrice: price,
      stock: intStr,
      alertStock: intStr,
      isVisible: z.boolean(),
    }),
  ).min(1),
});
type FormValues = z.infer<typeof schema>;

const blankVariant = { variantName: 'Standard', sku: '', sellPrice: '', buyPrice: '0', stock: '0', alertStock: '0', isVisible: true };

export default function ProductEditor() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { can } = useAuth();
  const canWrite = can('catalog.write');
  const canCost = can('cost.view');
  const { categories, brands } = useLookups();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const updatedAt = useRef<string | undefined>(undefined);

  const { data: product, isLoading, error } = useQuery({
    queryKey: ['products', 'detail', id],
    queryFn: () => api.get<ProductFull>(`/products/${id}`),
    enabled: !isNew,
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', description: '', categoryId: '', brandId: '', tag: '', isVisible: false, isPopular: false, variants: [blankVariant] },
  });
  const variants = useFieldArray({ control: form.control, name: 'variants' });

  useEffect(() => {
    if (!product) return;
    updatedAt.current = product.updatedAt;
    form.reset({
      name: product.name,
      description: product.description,
      categoryId: product.categoryId ? String(product.categoryId) : '',
      brandId: product.brandId ? String(product.brandId) : '',
      tag: product.tag ?? '',
      isVisible: product.isVisible,
      isPopular: product.isPopular,
      variants: product.variants.map((v) => ({
        id: v.id,
        variantName: v.variantName,
        sku: v.sku ?? '',
        sellPrice: v.sellPrice.replace(/\.00$/, ''),
        buyPrice: (v.buyPrice ?? '0').replace(/\.00$/, ''),
        stock: String(v.stock),
        alertStock: String(v.alertStock),
        isVisible: v.isVisible,
      })),
    });
  }, [product, form]);

  const save = useMutation({
    mutationFn: async (v: FormValues) => {
      const common = {
        name: v.name,
        description: v.description,
        categoryId: v.categoryId ? Number(v.categoryId) : null,
        brandId: v.brandId ? Number(v.brandId) : null,
        tag: v.tag || null,
        isVisible: v.isVisible,
        isPopular: v.isPopular,
      };
      if (isNew) {
        return api.post<ProductFull>('/products', {
          ...common,
          variants: v.variants.map((x) => ({ variantName: x.variantName, sku: x.sku || null, sellPrice: x.sellPrice, buyPrice: x.buyPrice, stock: Number(x.stock), alertStock: Number(x.alertStock), isVisible: x.isVisible })),
        });
      }
      // Existing product: save the product, then each variant that changed or was added.
      await api.patch<ProductFull>(`/products/${id}`, { ...common, expectedUpdatedAt: updatedAt.current });
      let latest: ProductFull | undefined;
      for (const x of v.variants) {
        const original = product?.variants.find((o) => o.id === x.id);
        if (x.id && original) {
          const body = {
            variantName: x.variantName,
            sku: x.sku || null,
            sellPrice: x.sellPrice,
            ...(canCost ? { buyPrice: x.buyPrice } : {}),
            alertStock: Number(x.alertStock),
            isVisible: x.isVisible,
            expectedUpdatedAt: original.updatedAt,
          };
          latest = await api.patch<ProductFull>(`/variants/${x.id}`, body);
        } else if (!x.id) {
          latest = await api.post<ProductFull>(`/products/${id}/variants`, { variantName: x.variantName, sku: x.sku || null, sellPrice: x.sellPrice, buyPrice: x.buyPrice, stock: Number(x.stock), alertStock: Number(x.alertStock), isVisible: x.isVisible });
        }
      }
      return latest ?? api.get<ProductFull>(`/products/${id}`);
    },
    onSuccess: (p) => {
      toast.success(isNew ? 'Product created' : 'Product saved');
      void qc.invalidateQueries({ queryKey: ['products'] });
      void qc.invalidateQueries({ queryKey: ['categories'] });
      if (isNew) navigate(`/products/${p.id}`, { replace: true });
      else qc.setQueryData(['products', 'detail', id], p);
    },
    onError: (e) => {
      if (e instanceof ApiError && e.isStale) {
        toast.error('Someone else changed this product', { description: 'Reload the page to see their changes before saving yours.', action: { label: 'Reload', onClick: () => window.location.reload() } });
      } else toastError(e);
    },
  });

  const del = useMutation({
    mutationFn: () => api.del(`/products/${id}`),
    onSuccess: () => {
      toast.success('Product deleted');
      void qc.invalidateQueries({ queryKey: ['products'] });
      navigate('/products', { replace: true });
    },
    onError: (e) => toastError(e),
  });

  if (!isNew && isLoading) return <Skeleton className="h-96" />;
  if (!isNew && (error || !product)) return <EmptyState title="Product not found" hint={(error as Error)?.message} action={<Link to="/products" className="font-semibold text-primary">Back to products</Link>} />;

  const errs = form.formState.errors;
  const disabled = !canWrite;

  return (
    <form onSubmit={form.handleSubmit((v) => save.mutate(v))} noValidate>
      <Link to="/products" className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Products
      </Link>
      <PageHeader
        title={isNew ? 'New product' : (product?.name ?? 'Product')}
        subtitle={isNew ? 'Add the details, variants and prices. Add pictures after saving.' : `Product #${id} · ${product?.stockQuantity ?? 0} in stock`}
        actions={
          <Can permission="catalog.write">
            {!isNew && (
              <Button type="button" variant="outline" onClick={() => setDeleteOpen(true)}>
                <Trash2 className="h-4 w-4" /> Delete
              </Button>
            )}
            <Button type="submit" loading={save.isPending}>
              {isNew ? 'Create product' : 'Save changes'}
            </Button>
          </Can>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardBody className="space-y-4">
              <Field label="Name" error={errs.name?.message}>
                {(fid) => <Input id={fid} invalid={!!errs.name} disabled={disabled} {...form.register('name')} />}
              </Field>
              <Field label="Description" hint="Shown on the product page. Plain text with line breaks.">
                {(fid) => (
                  <div className="space-y-2">
                    <Textarea id={fid} rows={8} disabled={disabled} {...form.register('description')} />
                    <Can permission="ai.use">
                      <Button type="button" size="sm" variant="soft" onClick={() => setAiOpen(true)}>
                        <Sparkles className="h-4 w-4" /> Write with AI
                      </Button>
                    </Can>
                  </div>
                )}
              </Field>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Variants and prices</CardTitle>
              <Can permission="catalog.write">
                <Button type="button" size="sm" variant="outline" onClick={() => variants.append(blankVariant)}>
                  Add variant
                </Button>
              </Can>
            </CardHeader>
            <CardBody className="space-y-4">
              {!isNew && <p className="rounded bg-info/10 px-3 py-2 text-xs text-info">Stock of an existing variant is changed on the Stock levels page (so every change is recorded), not here.</p>}
              {variants.fields.map((field, idx) => {
                const existing = Boolean(form.getValues(`variants.${idx}.id`));
                const ve = errs.variants?.[idx];
                return (
                  <div key={field.id} className="rounded-lg border border-border p-4">
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      <Field label="Variant name" error={ve?.variantName?.message}>
                        {(fid) => <Input id={fid} disabled={disabled} invalid={!!ve?.variantName} {...form.register(`variants.${idx}.variantName`)} />}
                      </Field>
                      <Field label="SKU" hint="Optional, must be unique">
                        {(fid) => <Input id={fid} disabled={disabled} {...form.register(`variants.${idx}.sku`)} />}
                      </Field>
                      <Field label="Selling price (Rs)" error={ve?.sellPrice?.message}>
                        {(fid) => <Input id={fid} inputMode="decimal" disabled={disabled} invalid={!!ve?.sellPrice} {...form.register(`variants.${idx}.sellPrice`)} />}
                      </Field>
                      {(canCost || isNew) && (
                        <Field label="Cost price (Rs)" hint="Only owners and managers see this" error={ve?.buyPrice?.message}>
                          {(fid) => <Input id={fid} inputMode="decimal" disabled={disabled} invalid={!!ve?.buyPrice} {...form.register(`variants.${idx}.buyPrice`)} />}
                        </Field>
                      )}
                      <Field label={existing ? 'Stock now' : 'Starting stock'} error={ve?.stock?.message}>
                        {(fid) => <Input id={fid} inputMode="numeric" disabled={disabled || existing} {...form.register(`variants.${idx}.stock`)} />}
                      </Field>
                      <Field label="Low-stock alert at" error={ve?.alertStock?.message}>
                        {(fid) => <Input id={fid} inputMode="numeric" disabled={disabled} {...form.register(`variants.${idx}.alertStock`)} />}
                      </Field>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <Controller control={form.control} name={`variants.${idx}.isVisible`} render={({ field: f }) => <Switch checked={f.value} onChange={f.onChange} label="Show this variant in the store" disabled={disabled} />} />
                      {canWrite && variants.fields.length > 1 && !existing && (
                        <Button type="button" variant="ghost" size="sm" onClick={() => variants.remove(idx)}>
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardBody>
          </Card>

          {!isNew && product && <ImagesCard productId={product.id} images={product.images} canWrite={canWrite} />}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Visibility</CardTitle>
            </CardHeader>
            <CardBody className="space-y-4">
              <Controller control={form.control} name="isVisible" render={({ field }) => <Switch checked={field.value} onChange={field.onChange} label="Show in the store" disabled={disabled} />} />
              <Controller control={form.control} name="isPopular" render={({ field }) => <Switch checked={field.value} onChange={field.onChange} label="Mark as popular" disabled={disabled} />} />
            </CardBody>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Organise</CardTitle>
            </CardHeader>
            <CardBody className="space-y-4">
              <Field label="Category">
                {(fid) => (
                  <Select id={fid} disabled={disabled} {...form.register('categoryId')}>
                    <option value="">None</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <Field label="Brand">
                {(fid) => (
                  <Select id={fid} disabled={disabled} {...form.register('brandId')}>
                    <option value="">None</option>
                    {brands.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <Field label="Badge">
                {(fid) => (
                  <Select id={fid} disabled={disabled} {...form.register('tag')}>
                    <option value="">None</option>
                    {TAGS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
            </CardBody>
          </Card>
          {!isNew && product && (
            <Card>
              <CardHeader>
                <CardTitle>Summary</CardTitle>
              </CardHeader>
              <Table>
                <THead>
                  <tr>
                    <TH>Variant</TH>
                    <TH className="text-right">Stock</TH>
                    <TH className="text-right">Price</TH>
                  </tr>
                </THead>
                <tbody>
                  {product.variants.map((v) => (
                    <TR key={v.id}>
                      <TD>{v.variantName}</TD>
                      <TD className="text-right tabular-nums">
                        {v.alertStock > 0 && v.stock <= v.alertStock ? <Badge color={v.stock === 0 ? 'danger' : 'warning'}>{v.stock}</Badge> : v.stock}
                      </TD>
                      <TD className="text-right tabular-nums">{money(v.sellPrice)}</TD>
                    </TR>
                  ))}
                </tbody>
              </Table>
            </Card>
          )}
        </div>
      </div>

      <ConfirmDialog open={deleteOpen} onOpenChange={setDeleteOpen} title="Delete this product?" description="Products that have orders or stock receipts cannot be deleted; hide them instead." confirmLabel="Delete product" danger onConfirm={() => del.mutateAsync()} />
      <AiDialog
        open={aiOpen}
        onOpenChange={setAiOpen}
        productId={isNew ? undefined : Number(id)}
        name={form.watch('name')}
        category={categories.find((c) => String(c.id) === form.watch('categoryId'))?.name}
        brand={brands.find((b) => String(b.id) === form.watch('brandId'))?.name}
        variantNames={form.watch('variants').map((v) => v.variantName)}
        onUse={(text) => form.setValue('description', text, { shouldDirty: true })}
      />
    </form>
  );
}

function ImagesCard({ productId, images, canWrite }: { productId: number; images: ProductImage[]; canWrite: boolean }) {
  const qc = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const sync = (res: { images: ProductImage[] }) => {
    qc.setQueryData<ProductFull>(['products', 'detail', String(productId)], (old) => (old ? { ...old, images: res.images } : old));
    void qc.invalidateQueries({ queryKey: ['products'], exact: false });
  };
  const upload = useMutation({
    mutationFn: (files: File[]) => {
      const fd = new FormData();
      files.forEach((f) => fd.append('files', f));
      return api.post<{ images: ProductImage[] }>(`/products/${productId}/images`, fd);
    },
    onSuccess: (r) => {
      sync(r);
      toast.success('Pictures added');
    },
    onError: (e) => toastError(e),
  });
  const feature = useMutation({ mutationFn: (eid: number) => api.patch<{ images: ProductImage[] }>(`/products/${productId}/images/${eid}/featured`), onSuccess: sync, onError: (e) => toastError(e) });
  const remove = useMutation({ mutationFn: (eid: number) => api.del<{ images: ProductImage[] }>(`/products/${productId}/images/${eid}`), onSuccess: sync, onError: (e) => toastError(e) });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pictures</CardTitle>
        {canWrite && (
          <>
            <input
              ref={input}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              hidden
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                if (files.length) upload.mutate(files);
                e.target.value = '';
              }}
            />
            <Button type="button" size="sm" variant="outline" loading={upload.isPending} onClick={() => input.current?.click()}>
              <ImagePlus className="h-4 w-4" /> Add pictures
            </Button>
          </>
        )}
      </CardHeader>
      <CardBody>
        {images.length === 0 ? (
          <p className="text-sm text-muted">No pictures yet. JPEG, PNG, WebP or GIF up to 8 MB; they are resized and converted automatically.</p>
        ) : (
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {images.map((im) => (
              <li key={im.imageEntityId} className="group relative overflow-hidden rounded-lg border border-border">
                <img src={im.thumbUrl ?? im.url ?? ''} alt="" className="aspect-square w-full object-cover" loading="lazy" onError={(e) => { if (im.url && e.currentTarget.src !== im.url) e.currentTarget.src = im.url; }} />
                {im.isFeatured && <Badge color="primary" className="absolute left-2 top-2">Main picture</Badge>}
                {canWrite && (
                  <div className="absolute inset-x-0 bottom-0 flex justify-between gap-1 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                    {!im.isFeatured ? (
                      <Button type="button" size="sm" variant="secondary" onClick={() => feature.mutate(im.imageEntityId)}>
                        <Star className="h-3.5 w-3.5" /> Make main
                      </Button>
                    ) : (
                      <span />
                    )}
                    <Button type="button" size="sm" variant="danger" onClick={() => remove.mutate(im.imageEntityId)} aria-label="Delete picture">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}

function AiDialog({ open, onOpenChange, productId, name, category, brand, variantNames, onUse }: { open: boolean; onOpenChange: (o: boolean) => void; productId?: number; name: string; category?: string; brand?: string; variantNames: string[]; onUse: (text: string) => void }) {
  const [features, setFeatures] = useState('');
  const [tone, setTone] = useState('professional');
  const [length, setLength] = useState('medium');
  const [result, setResult] = useState<{ description: string; highlights: string[] } | null>(null);
  const gen = useMutation({
    mutationFn: () =>
      api.post<{ description: string; highlights: string[] }>('/ai/product-description', {
        productId,
        name: name || undefined,
        category,
        brand,
        variants: variantNames.filter(Boolean),
        keyFeatures: features.split('\n').map((s) => s.trim()).filter(Boolean),
        tone,
        length,
      }),
    onSuccess: setResult,
    onError: (e) => toastError(e),
  });
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      wide
      title="Write a description with AI"
      description="It is a draft: read it, fix anything wrong, then use it. Nothing is saved until you save the product."
      footer={
        result ? (
          <>
            <Button variant="outline" onClick={() => gen.mutate()} loading={gen.isPending}>
              Try again
            </Button>
            <Button
              onClick={() => {
                onUse(`${result.description}${result.highlights.length ? `\n\n${result.highlights.map((h) => `• ${h}`).join('\n')}` : ''}`);
                onOpenChange(false);
              }}
            >
              Use this text
            </Button>
          </>
        ) : (
          <Button onClick={() => gen.mutate()} loading={gen.isPending} disabled={!name.trim()}>
            <Sparkles className="h-4 w-4" /> Write it
          </Button>
        )
      }
    >
      <div className="space-y-4">
        <Field label="Key features" hint="One per line. The AI only uses facts you give it here and the product details.">
          {(id) => <Textarea id={id} rows={4} value={features} onChange={(e) => setFeatures(e.target.value)} placeholder={'6.5 inch display\n5000 mAh battery'} />}
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tone">
            {(id) => (
              <Select id={id} value={tone} onChange={(e) => setTone(e.target.value)}>
                <option value="professional">Professional</option>
                <option value="friendly">Friendly</option>
                <option value="premium">Premium</option>
              </Select>
            )}
          </Field>
          <Field label="Length">
            {(id) => (
              <Select id={id} value={length} onChange={(e) => setLength(e.target.value)}>
                <option value="short">Short</option>
                <option value="medium">Medium</option>
                <option value="long">Long</option>
              </Select>
            )}
          </Field>
        </div>
        {!name.trim() && <p className="text-sm text-warning">Type the product name first.</p>}
        {result && (
          <div className="rounded-lg border border-border bg-soft p-4">
            <p className="whitespace-pre-wrap text-sm">{result.description}</p>
            {result.highlights.length > 0 && (
              <ul className="mt-3 list-disc space-y-0.5 pl-5 text-sm">
                {result.highlights.map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </Dialog>
  );
}
