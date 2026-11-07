import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, ArrowDown, ArrowLeft, ArrowUp, Check, Crown, ImagePlus, Layers, Minus, Package, Plus, Search, Sparkles, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import { Badge, Card, CardBody, CardHeader, CardTitle, EmptyState, PageHeader, Skeleton } from '@/components/ui/data';
import { Button } from '@/components/ui/button';
import { Field, Input, Switch, Textarea } from '@/components/ui/form';
import { ConfirmDialog, Dialog } from '@/components/ui/overlay';
import { useDebounce } from '@/hooks/use-debounce';
import { api } from '@/lib/api-client';
import { useAuth } from '@/lib/auth';
import { dec, money } from '@/lib/format';
import { toastError } from '@/lib/hooks';
import { cn } from '@/lib/utils';
import { COLLECTIONS_KEY, type CollectionRow } from './Collections';

interface Item {
  variantId: number;
  productId: number;
  productName: string;
  variantName: string;
  sku: string | null;
  sellPrice: string;
  stock: number;
  isVisible: boolean;
  defaultQuantity: number;
  imageUrl: string | null;
}
interface Detail extends CollectionRow {
  items: Item[];
}
interface VariantHit {
  variantId: number;
  productId: number;
  productName: string;
  variantName: string;
  sku: string | null;
  sellPrice: string;
  stock: number;
  isVisible: boolean;
  imageUrl: string | null;
}
interface Form {
  name: string;
  description: string;
  isActive: boolean;
  isFeatured: boolean;
  isPremium: boolean;
}

const EMPTY: Form = { name: '', description: '', isActive: true, isFeatured: false, isPremium: false };
const itemsKey = (items: Item[]) => JSON.stringify(items.map((i) => [i.variantId, i.defaultQuantity]));

function Thumb({ url, className }: { url: string | null; className?: string }) {
  return url ? (
    <img src={url} alt="" loading="lazy" className={cn('rounded object-cover', className)} />
  ) : (
    <div className={cn('flex items-center justify-center rounded bg-soft text-muted', className)}>
      <Package className="h-4 w-4" />
    </div>
  );
}

function StockHint({ stock, qty, visible }: { stock: number; qty: number; visible: boolean }) {
  if (!visible) return <Badge color="neutral">Hidden in shop</Badge>;
  if (stock <= 0) return <Badge color="danger">Out of stock</Badge>;
  if (stock < qty) return <Badge color="warning">Only {stock} left</Badge>;
  return <span className="text-xs text-muted">{stock} in stock</span>;
}

/** The "Add products" picker: search any product option and tick the ones to include. */
function ProductPicker({ open, onClose, chosen, onAdd, onRemove }: { open: boolean; onClose: () => void; chosen: Set<number>; onAdd: (v: VariantHit) => void; onRemove: (id: number) => void }) {
  const [q, setQ] = useState('');
  const term = useDebounce(q.trim());
  const { data, isFetching } = useQuery({
    queryKey: ['collection-variant-search', term],
    queryFn: () => api.get<VariantHit[]>('/collections/variant-search', { q: term, limit: 30 }),
    enabled: open,
    placeholderData: (prev) => prev,
  });
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => !o && onClose()}
      wide
      title="Add products"
      description="Search by product name, option (for example 'Queen') or SKU. Tick as many as you like."
      footer={
        <Button onClick={onClose}>
          Done{chosen.size > 0 ? ` (${chosen.size} in collection)` : ''}
        </Button>
      }
    >
      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <Input className="pl-9" autoFocus placeholder="Search products" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search products" />
      </div>
      <div className="max-h-[50vh] overflow-y-auto rounded border border-border" aria-busy={isFetching}>
        {!data ? (
          <div className="space-y-2 p-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : data.length === 0 ? (
          <EmptyState title="No products found" hint="Check the spelling, or try the SKU." />
        ) : (
          <ul className="divide-y divide-border">
            {data.map((v) => {
              const added = chosen.has(v.variantId);
              return (
                <li key={v.variantId}>
                  <button
                    type="button"
                    onClick={() => (added ? onRemove(v.variantId) : onAdd(v))}
                    className={cn('flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-soft', added && 'bg-primary/5')}
                  >
                    <Thumb url={v.imageUrl} className="h-11 w-11 shrink-0" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{v.productName}</span>
                      <span className="block truncate text-xs text-muted">
                        {v.variantName}
                        {v.sku ? ` · ${v.sku}` : ''}
                      </span>
                    </span>
                    <span className="hidden text-right sm:block">
                      <span className="block text-sm font-semibold tabular-nums">{money(v.sellPrice)}</span>
                      <StockHint stock={v.stock} qty={1} visible={v.isVisible} />
                    </span>
                    <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-full border', added ? 'border-primary bg-primary text-white' : 'border-border text-muted')}>
                      {added ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Dialog>
  );
}

export default function CollectionEditor() {
  const { id } = useParams<{ id: string }>();
  const isNew = !id;
  const collectionId = id ? Number(id) : null;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { can } = useAuth();
  const editable = can('catalog.write');

  const detail = useQuery({
    queryKey: ['collection', collectionId],
    queryFn: () => api.get<Detail>(`/collections/${collectionId}`),
    enabled: !isNew,
  });
  const all = useQuery({ queryKey: COLLECTIONS_KEY, queryFn: () => api.get<CollectionRow[]>('/collections') });

  const [form, setForm] = useState<Form>(EMPTY);
  const [items, setItems] = useState<Item[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [baseline, setBaseline] = useState<{ form: Form; items: string }>({ form: EMPTY, items: itemsKey([]) });
  const fileInput = useRef<HTMLInputElement>(null);

  // Load the saved values once they arrive (and again after a save).
  const loadedAt = detail.data?.updatedAt;
  useEffect(() => {
    const d = detail.data;
    if (!d) return;
    const f: Form = { name: d.name, description: d.description ?? '', isActive: d.isActive, isFeatured: d.isFeatured, isPremium: d.isPremium };
    setForm(f);
    setItems(d.items);
    setFile(null);
    setPreview(null);
    setBaseline({ form: f, items: itemsKey(d.items) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadedAt, detail.data?.items.length]);

  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

  const dirty = useMemo(
    () => isNew ? form.name.trim() !== '' || items.length > 0 || file !== null : JSON.stringify(form) !== JSON.stringify(baseline.form) || itemsKey(items) !== baseline.items || file !== null,
    [form, items, file, baseline, isNew],
  );

  // Warn before closing the tab with unsaved work.
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  const total = useMemo(() => items.filter((i) => i.isVisible).reduce((sum, i) => sum.plus(dec(i.sellPrice).times(i.defaultQuantity)), dec(0)), [items]);
  const otherPremium = all.data?.find((c) => c.isPremium && c.id !== collectionId);
  const nameError = form.name.trim() === '' ? 'Give the collection a name' : undefined;
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  const patchItem = (variantId: number, p: Partial<Item>) => setItems((list) => list.map((i) => (i.variantId === variantId ? { ...i, ...p } : i)));
  const moveItem = (index: number, dir: -1 | 1) =>
    setItems((list) => {
      const next = [...list];
      const to = index + dir;
      if (to < 0 || to >= next.length) return list;
      [next[index], next[to]] = [next[to]!, next[index]!];
      return next;
    });
  const addVariant = (v: VariantHit) =>
    setItems((list) => (list.some((i) => i.variantId === v.variantId) ? list : [...list, { ...v, defaultQuantity: 1 }]));
  const chosen = useMemo(() => new Set(items.map((i) => i.variantId)), [items]);

  const pickFile = (f: File | undefined) => {
    if (!f) return;
    if (!/^image\/(jpeg|png|webp|gif)$/.test(f.type)) return toast.error('Choose a JPG, PNG, WebP or GIF picture');
    if (f.size > 8 * 1024 * 1024) return toast.error('That picture is over 8 MB. Choose a smaller one.');
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const save = useMutation({
    mutationFn: async () => {
      const body = { name: form.name.trim(), description: form.description.trim() || null, isActive: form.isActive, isFeatured: form.isFeatured, isPremium: form.isPremium };
      let cid = collectionId;
      if (isNew) cid = (await api.post<{ id: number }>('/collections', body)).id;
      else if (JSON.stringify(form) !== JSON.stringify(baseline.form)) await api.patch(`/collections/${cid}`, body);
      if (isNew ? items.length > 0 : itemsKey(items) !== baseline.items) {
        await api.put(`/collections/${cid}/items`, { items: items.map((i) => ({ variantId: i.variantId, defaultQuantity: i.defaultQuantity })) });
      }
      if (file) {
        const fd = new FormData();
        fd.append('file', file);
        await api.post(`/collections/${cid}/image`, fd);
      }
      return cid!;
    },
    onSuccess: async (cid) => {
      toast.success('Collection saved');
      await qc.invalidateQueries({ queryKey: COLLECTIONS_KEY });
      await qc.invalidateQueries({ queryKey: ['collection', cid] });
      if (isNew) navigate(`/collections/${cid}`, { replace: true });
    },
    onError: (e) => toastError(e),
  });

  const del = useMutation({
    mutationFn: () => api.del(`/collections/${collectionId}`),
    onSuccess: () => {
      toast.success('Collection deleted');
      void qc.invalidateQueries({ queryKey: COLLECTIONS_KEY });
      navigate('/collections', { replace: true });
    },
    onError: (e) => toastError(e),
  });

  const back = () => (dirty ? setConfirmLeave(true) : navigate('/collections'));

  if (!isNew && detail.isLoading) {
    return (
      <div className="grid gap-5 lg:grid-cols-3">
        <Skeleton className="h-96 lg:col-span-2" />
        <Skeleton className="h-96" />
      </div>
    );
  }
  if (!isNew && detail.error) {
    return (
      <Card>
        <EmptyState
          title="Collection not found"
          hint={(detail.error as Error).message}
          action={
            <Link to="/collections">
              <Button variant="outline" className="mt-2">
                Back to collections
              </Button>
            </Link>
          }
        />
      </Card>
    );
  }

  const imageSrc = preview ?? detail.data?.imageUrl ?? null;

  return (
    <>
      <button type="button" onClick={back} className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Collections
      </button>
      <PageHeader
        title={isNew ? 'New collection' : form.name || 'Collection'}
        subtitle={isNew ? 'Pick the products that sell well together.' : 'Changes appear in the shop about a minute after you save.'}
        actions={
          !isNew && editable ? (
            <Button variant="outline" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="h-4 w-4 text-danger" /> Delete
            </Button>
          ) : undefined
        }
      />

      {!editable && <p className="mb-4 rounded bg-soft px-3 py-2 text-sm text-muted">You can look at this collection but only a manager or owner can change it.</p>}

      <div className="grid items-start gap-5 pb-24 lg:grid-cols-3">
        {/* Products ------------------------------------------------------------------ */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle>Products in this collection</CardTitle>
              <p className="text-xs text-muted">
                {items.length} {items.length === 1 ? 'product' : 'products'} · customers see the list in this order
              </p>
            </div>
            {editable && (
              <Button size="sm" onClick={() => setPickerOpen(true)}>
                <Plus className="h-4 w-4" /> Add products
              </Button>
            )}
          </CardHeader>

          {items.length === 0 ? (
            <EmptyState
              title="No products yet"
              hint="Add the products customers should be able to buy together. Each one gets a default quantity, which they can change in the shop."
              action={
                editable ? (
                  <Button className="mt-2" onClick={() => setPickerOpen(true)}>
                    <Layers className="h-4 w-4" /> Add products
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <>
              <ul className="divide-y divide-border">
                {items.map((item, index) => (
                  <li key={item.variantId} className="flex flex-wrap items-center gap-3 px-4 py-3 sm:flex-nowrap">
                    <span className="w-5 shrink-0 text-center text-xs font-semibold text-muted tabular-nums">{index + 1}</span>
                    <Thumb url={item.imageUrl} className="h-14 w-14 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{item.productName}</p>
                      <p className="truncate text-xs text-muted">
                        {item.variantName}
                        {item.sku ? ` · ${item.sku}` : ''} · {money(item.sellPrice)} each
                      </p>
                      <div className="mt-1">
                        <StockHint stock={item.stock} qty={item.defaultQuantity} visible={item.isVisible} />
                      </div>
                    </div>
                    <div className="flex items-center gap-1" aria-label={`Quantity of ${item.productName}`}>
                      <Button variant="outline" size="icon" aria-label="One less" disabled={!editable || item.defaultQuantity <= 1} onClick={() => patchItem(item.variantId, { defaultQuantity: item.defaultQuantity - 1 })}>
                        <Minus className="h-4 w-4" />
                      </Button>
                      <Input
                        className="h-9 w-14 px-1 text-center tabular-nums"
                        inputMode="numeric"
                        value={item.defaultQuantity}
                        disabled={!editable}
                        aria-label="Quantity"
                        onChange={(e) => {
                          const n = Number(e.target.value.replace(/\D/g, ''));
                          patchItem(item.variantId, { defaultQuantity: Math.min(999, Math.max(1, n || 1)) });
                        }}
                      />
                      <Button variant="outline" size="icon" aria-label="One more" disabled={!editable || item.defaultQuantity >= 999} onClick={() => patchItem(item.variantId, { defaultQuantity: item.defaultQuantity + 1 })}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="w-24 shrink-0 text-right text-sm font-bold tabular-nums">{money(dec(item.sellPrice).times(item.defaultQuantity).toString())}</p>
                    {editable && (
                      <div className="flex shrink-0 items-center">
                        <Button variant="ghost" size="icon" aria-label="Move up" disabled={index === 0} onClick={() => moveItem(index, -1)}>
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" aria-label="Move down" disabled={index === items.length - 1} onClick={() => moveItem(index, 1)}>
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" aria-label={`Remove ${item.productName}`} onClick={() => setItems((l) => l.filter((i) => i.variantId !== item.variantId))}>
                          <X className="h-4 w-4 text-danger" />
                        </Button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
              <div className="flex items-center justify-between border-t border-border bg-soft/60 px-4 py-3">
                <span className="text-sm text-muted">Bundle price shown to customers</span>
                <span className="text-lg font-bold tabular-nums">{money(total.toString())}</span>
              </div>
              {items.some((i) => !i.isVisible) && (
                <p className="flex items-start gap-1.5 border-t border-border px-4 py-2.5 text-xs text-warning">
                  <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" />
                  Hidden products are not shown or counted in the price. Make them visible in Products, or remove them here.
                </p>
              )}
            </>
          )}
        </Card>

        {/* Details ------------------------------------------------------------------- */}
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardBody className="space-y-4">
              <Field label="Name" error={dirty ? nameError : undefined}>
                {(fid) => <Input id={fid} value={form.name} maxLength={120} disabled={!editable} placeholder="For example: Bedroom set" onChange={(e) => set('name', e.target.value)} autoFocus={isNew} />}
              </Field>
              <Field label="Description" hint="One or two lines shown under the name. Optional.">
                {(fid) => <Textarea id={fid} rows={3} value={form.description} maxLength={2000} disabled={!editable} onChange={(e) => set('description', e.target.value)} />}
              </Field>
              <div>
                <p className="mb-1.5 text-sm font-semibold">Picture</p>
                <input ref={fileInput} type="file" hidden accept="image/jpeg,image/png,image/webp,image/gif" onChange={(e) => { pickFile(e.target.files?.[0]); e.target.value = ''; }} />
                <button
                  type="button"
                  disabled={!editable}
                  onClick={() => fileInput.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (editable) pickFile(e.dataTransfer.files?.[0]);
                  }}
                  className="group relative block aspect-[16/9] w-full overflow-hidden rounded border-2 border-dashed border-border bg-soft text-muted transition-colors hover:border-primary enabled:cursor-pointer"
                  aria-label="Choose a picture"
                >
                  {imageSrc ? (
                    <>
                      <img src={imageSrc} alt="" className="h-full w-full object-cover" />
                      {editable && (
                        <span className="absolute inset-0 flex items-center justify-center bg-black/45 text-sm font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100">
                          <ImagePlus className="mr-1.5 h-4 w-4" /> Change picture
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="flex h-full flex-col items-center justify-center gap-1 text-sm">
                      <ImagePlus className="h-6 w-6" />
                      Click or drop a picture here
                      <span className="text-xs">Wide pictures (16:9) look best</span>
                    </span>
                  )}
                </button>
                {file && <p className="mt-1 text-xs text-muted">New picture will be uploaded when you save.</p>}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Where it shows in the shop</CardTitle>
            </CardHeader>
            <CardBody className="space-y-4">
              <div>
                <Switch checked={form.isActive} onChange={(v) => set('isActive', v)} disabled={!editable} label="Visible to customers" />
                <p className="mt-1 pl-[52px] text-xs text-muted">Turn off to hide it without deleting it.</p>
              </div>
              <div>
                <Switch checked={form.isFeatured} onChange={(v) => set('isFeatured', v)} disabled={!editable} label="Featured card" />
                <p className="mt-1 flex items-center gap-1 pl-[52px] text-xs text-muted">
                  <Sparkles className="h-3 w-3" /> Shown in the row of collection cards on the home page.
                </p>
              </div>
              <div>
                <Switch checked={form.isPremium} onChange={(v) => set('isPremium', v)} disabled={!editable} label="Main banner" />
                <p className="mt-1 flex items-center gap-1 pl-[52px] text-xs text-muted">
                  <Crown className="h-3 w-3" /> The big banner at the top. Only one collection can be the main banner.
                </p>
                {form.isPremium && otherPremium && (
                  <p className="mt-2 rounded bg-warning/10 px-2.5 py-1.5 text-xs font-medium text-warning">
                    "{otherPremium.name}" is the main banner now. Saving will replace it with this one.
                  </p>
                )}
              </div>
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Save bar ---------------------------------------------------------------------- */}
      {editable && (
        <div className={cn('fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 px-4 py-3 backdrop-blur transition-transform lg:left-64', dirty ? 'translate-y-0' : 'translate-y-full')} role="region" aria-label="Unsaved changes">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
            <p className="text-sm font-medium">{isNew ? 'Ready to create this collection?' : 'You have unsaved changes'}</p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  if (isNew) navigate('/collections');
                  else {
                    setForm(baseline.form);
                    setItems(detail.data?.items ?? []);
                    setFile(null);
                    setPreview(null);
                  }
                }}
              >
                {isNew ? 'Cancel' : 'Discard'}
              </Button>
              <Button loading={save.isPending} disabled={!!nameError} onClick={() => save.mutate()}>
                {isNew ? 'Create collection' : 'Save changes'}
              </Button>
            </div>
          </div>
        </div>
      )}

      <ProductPicker open={pickerOpen} onClose={() => setPickerOpen(false)} chosen={chosen} onAdd={addVariant} onRemove={(vid) => setItems((l) => l.filter((i) => i.variantId !== vid))} />

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Delete "${form.name}"?`}
        description="The collection and its picture are removed from the shop, and from any customer's collection cart. The products themselves are not touched. This cannot be undone."
        confirmLabel="Delete collection"
        danger
        onConfirm={() => del.mutateAsync()}
      />
      <ConfirmDialog
        open={confirmLeave}
        onOpenChange={setConfirmLeave}
        title="Leave without saving?"
        description="Your changes to this collection will be lost."
        confirmLabel="Leave"
        danger
        onConfirm={() => navigate('/collections')}
      />
    </>
  );
}
