import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, EyeOff, Plus, Search, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { Can } from '@/components/Can';
import { Badge, Card, EmptyState, PageHeader, Pager, Table, TableSkeleton, TD, TH, THead, TR } from '@/components/ui/data';
import { Button } from '@/components/ui/button';
import { Checkbox, Input, Select } from '@/components/ui/form';
import { ConfirmDialog } from '@/components/ui/overlay';
import { useDebounce } from '@/hooks/use-debounce';
import { api } from '@/lib/api-client';
import { money, num } from '@/lib/format';
import { toastError, useUrlState } from '@/lib/hooks';

export interface ProductRow {
  id: number;
  name: string;
  categoryName: string | null;
  brandName: string | null;
  isVisible: boolean;
  stockQuantity: number;
  priceRange: string | null;
  variantCount: number;
  lowStock: boolean;
  imageUrl: string | null;
  updatedAt: string;
}
export interface Lookup {
  id: number;
  name: string;
  productCount: number;
  imageUrl: string | null;
  isFeatured: boolean;
  extra: { isVerified?: boolean };
}

export const useLookups = () => {
  const categories = useQuery({ queryKey: ['categories'], queryFn: () => api.get<Lookup[]>('/categories'), staleTime: 5 * 60_000 });
  const brands = useQuery({ queryKey: ['brands'], queryFn: () => api.get<Lookup[]>('/brands'), staleTime: 5 * 60_000 });
  return { categories: categories.data ?? [], brands: brands.data ?? [] };
};

export default function Products() {
  const [f, set] = useUrlState({ q: '', categoryId: '', brandId: '', visible: '', stock: '', page: '1' });
  const [q, setQ] = useState(f.q);
  const debounced = useDebounce(q);
  useEffect(() => {
    if (debounced !== f.q) set({ q: debounced });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);
  const { categories, brands } = useLookups();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<number[]>([]);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ['products', f],
    queryFn: () => api.list<ProductRow>('/products', { q: f.q, categoryId: f.categoryId, brandId: f.brandId, visible: f.visible, stock: f.stock, page: f.page, pageSize: 25 }),
    placeholderData: (prev) => prev,
  });
  useEffect(() => setSelected([]), [data]);

  const bulk = useMutation({
    mutationFn: (v: { action: 'hide' | 'show' | 'delete'; ids: number[] }) => api.post('/products/bulk', v),
    onSuccess: (_d, v) => {
      toast.success(v.action === 'delete' ? 'Products deleted' : v.action === 'hide' ? 'Products hidden' : 'Products are now visible');
      void qc.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (e) => toastError(e),
  });

  const rows = data?.items ?? [];
  const allSelected = rows.length > 0 && selected.length === rows.length;

  return (
    <>
      <PageHeader
        title="Products"
        subtitle="What the store sells"
        actions={
          <Can permission="catalog.write">
            <Link to="/products/new">
              <Button>
                <Plus className="h-4 w-4" /> New product
              </Button>
            </Link>
          </Can>
        }
      />
      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input className="pl-9" placeholder="Search name, SKU or product number" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Select className="w-44" value={f.categoryId} onChange={(e) => set({ categoryId: e.target.value })} aria-label="Category">
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Select className="w-40" value={f.brandId} onChange={(e) => set({ brandId: e.target.value })} aria-label="Brand">
            <option value="">All brands</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
          <Select className="w-36" value={f.stock} onChange={(e) => set({ stock: e.target.value })} aria-label="Stock">
            <option value="">Any stock</option>
            <option value="in">In stock</option>
            <option value="low">Low stock</option>
            <option value="out">Out of stock</option>
          </Select>
          <Select className="w-36" value={f.visible} onChange={(e) => set({ visible: e.target.value })} aria-label="Visibility">
            <option value="">Shown or hidden</option>
            <option value="true">Shown</option>
            <option value="false">Hidden</option>
          </Select>
        </div>

        {selected.length > 0 && (
          <Can permission="catalog.write">
            <div className="flex flex-wrap items-center gap-2 border-b border-border bg-primary/5 px-4 py-2.5 text-sm">
              <strong>{selected.length} selected</strong>
              <Button size="sm" variant="outline" onClick={() => bulk.mutate({ action: 'show', ids: selected })}>
                <Eye className="h-4 w-4" /> Show
              </Button>
              <Button size="sm" variant="outline" onClick={() => bulk.mutate({ action: 'hide', ids: selected })}>
                <EyeOff className="h-4 w-4" /> Hide
              </Button>
              <Button size="sm" variant="danger" onClick={() => setDeleteOpen(true)}>
                <Trash2 className="h-4 w-4" /> Delete
              </Button>
            </div>
          </Can>
        )}

        {isLoading ? (
          <TableSkeleton />
        ) : error ? (
          <EmptyState title="Could not load products" hint={(error as Error).message} />
        ) : rows.length === 0 ? (
          <EmptyState title="No products found" hint="Try different filters, or add your first product." />
        ) : (
          <div className={isFetching ? 'opacity-70 transition-opacity' : ''}>
            <Table>
              <THead>
                <tr>
                  <TH className="w-10">
                    <Checkbox checked={allSelected} onChange={(v) => setSelected(v ? rows.map((r) => r.id) : [])} />
                  </TH>
                  <TH>Product</TH>
                  <TH>Category</TH>
                  <TH>Price</TH>
                  <TH className="text-right">Stock</TH>
                  <TH>Status</TH>
                </tr>
              </THead>
              <tbody>
                {rows.map((p) => (
                  <TR key={p.id} className="hover:bg-soft/50">
                    <TD>
                      <Checkbox checked={selected.includes(p.id)} onChange={(v) => setSelected(v ? [...selected, p.id] : selected.filter((x) => x !== p.id))} />
                    </TD>
                    <TD>
                      <Link to={`/products/${p.id}`} className="flex items-center gap-3">
                        {p.imageUrl ? <img src={p.imageUrl} alt="" className="h-11 w-11 rounded object-cover" loading="lazy" /> : <div className="h-11 w-11 rounded bg-soft" />}
                        <div className="min-w-0">
                          <div className="truncate font-semibold hover:text-primary">{p.name}</div>
                          <div className="text-xs text-muted">
                            #{p.id} · {p.variantCount} variant{p.variantCount === 1 ? '' : 's'}
                            {p.brandName ? ` · ${p.brandName}` : ''}
                          </div>
                        </div>
                      </Link>
                    </TD>
                    <TD>{p.categoryName ?? '—'}</TD>
                    <TD className="tabular-nums">{p.priceRange && p.priceRange !== '--' ? p.priceRange.split(' - ').map((x) => money(x, false)).join(' – ') : '—'}</TD>
                    <TD className="text-right tabular-nums">
                      <span className={p.stockQuantity === 0 ? 'font-semibold text-danger' : p.lowStock ? 'font-semibold text-warning' : ''}>{num(p.stockQuantity)}</span>
                    </TD>
                    <TD>{p.isVisible ? <Badge color="success">Shown</Badge> : <Badge>Hidden</Badge>}</TD>
                  </TR>
                ))}
              </tbody>
            </Table>
            <Pager pagination={data?.pagination} onPage={(p) => set({ page: String(p) }, false)} />
          </div>
        )}
      </Card>
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete ${selected.length} product${selected.length === 1 ? '' : 's'}?`}
        description="Products that have orders or stock receipts cannot be deleted; hide them instead. This cannot be undone."
        confirmLabel="Delete"
        danger
        onConfirm={() => bulk.mutateAsync({ action: 'delete', ids: selected })}
      />
    </>
  );
}
