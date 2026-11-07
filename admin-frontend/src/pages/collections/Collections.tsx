import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, ArrowDown, ArrowUp, Crown, EyeOff, ImageOff, Layers, Pencil, Plus, Search, Sparkles, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { Can } from '@/components/Can';
import { Button } from '@/components/ui/button';
import { Badge, Card, EmptyState, PageHeader, Skeleton } from '@/components/ui/data';
import { Input, Switch } from '@/components/ui/form';
import { ConfirmDialog } from '@/components/ui/overlay';
import { api } from '@/lib/api-client';
import { money } from '@/lib/format';
import { toastError } from '@/lib/hooks';
import { cn } from '@/lib/utils';

export interface CollectionRow {
  id: number;
  name: string;
  description: string | null;
  isActive: boolean;
  isFeatured: boolean;
  isPremium: boolean;
  displayOrder: number;
  imageUrl: string | null;
  itemCount: number;
  total: string;
  updatedAt: string;
  problems: { empty: boolean; outOfStock: number; hidden: number };
}

export const COLLECTIONS_KEY = ['collections'];

function CollectionCard({
  c,
  index,
  last,
  onMove,
  onToggle,
  onDelete,
}: {
  c: CollectionRow;
  index: number;
  last: boolean;
  onMove: (dir: -1 | 1) => void;
  onToggle: (active: boolean) => void;
  onDelete: () => void;
}) {
  const navigate = useNavigate();
  const warnings: string[] = [];
  if (c.problems.empty) warnings.push('No products yet');
  if (c.problems.outOfStock > 0) warnings.push(`${c.problems.outOfStock} out of stock`);
  if (c.problems.hidden > 0) warnings.push(`${c.problems.hidden} hidden in the shop`);

  return (
    <Card className={cn('group flex flex-col overflow-hidden transition-shadow hover:shadow-md', !c.isActive && 'opacity-75')}>
      <Link to={`/collections/${c.id}`} className="relative block aspect-[16/9] bg-soft" aria-label={`Edit ${c.name}`}>
        {c.imageUrl ? (
          <img src={c.imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-muted">
            <ImageOff className="h-7 w-7" />
            <span className="text-xs">No picture yet</span>
          </div>
        )}
        <div className="absolute left-2 top-2 flex flex-wrap gap-1">
          {c.isPremium && (
            <Badge color="warning" className="gap-1 shadow-sm">
              <Crown className="h-3 w-3" /> Main banner
            </Badge>
          )}
          {c.isFeatured && (
            <Badge color="primary" className="gap-1 bg-surface shadow-sm">
              <Sparkles className="h-3 w-3" /> Featured
            </Badge>
          )}
          {!c.isActive && (
            <Badge color="neutral" className="gap-1 bg-surface shadow-sm">
              <EyeOff className="h-3 w-3" /> Hidden
            </Badge>
          )}
        </div>
      </Link>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <Link to={`/collections/${c.id}`} className="line-clamp-1 text-base font-bold hover:text-primary">
            {c.name}
          </Link>
          <p className="mt-0.5 text-sm text-muted">
            {c.itemCount} {c.itemCount === 1 ? 'product' : 'products'} · <span className="font-semibold text-foreground">{money(c.total)}</span>
          </p>
        </div>

        {warnings.length > 0 && (
          <p className="flex items-start gap-1.5 rounded bg-warning/10 px-2.5 py-1.5 text-xs font-medium text-warning">
            <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" />
            {warnings.join(' · ')}
          </p>
        )}

        <Can permission="catalog.write">
          <div className="mt-auto flex items-center justify-between gap-2 border-t border-border pt-3">
            <Switch checked={c.isActive} onChange={onToggle} label={c.isActive ? 'Shown' : 'Hidden'} />
            <div className="flex items-center">
              <Button variant="ghost" size="icon" aria-label="Move earlier" disabled={index === 0} onClick={() => onMove(-1)}>
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" aria-label="Move later" disabled={last} onClick={() => onMove(1)}>
                <ArrowDown className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" aria-label="Edit" onClick={() => navigate(`/collections/${c.id}`)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" aria-label="Delete" onClick={onDelete}>
                <Trash2 className="h-4 w-4 text-danger" />
              </Button>
            </div>
          </div>
        </Can>
      </div>
    </Card>
  );
}

export default function Collections() {
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const [deleting, setDeleting] = useState<CollectionRow | null>(null);
  const { data, isLoading, error } = useQuery({ queryKey: COLLECTIONS_KEY, queryFn: () => api.get<CollectionRow[]>('/collections') });

  const refresh = () => void qc.invalidateQueries({ queryKey: COLLECTIONS_KEY });

  const toggle = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) => api.patch(`/collections/${id}`, { isActive }),
    onMutate: async ({ id, isActive }) => {
      await qc.cancelQueries({ queryKey: COLLECTIONS_KEY });
      const prev = qc.getQueryData<CollectionRow[]>(COLLECTIONS_KEY);
      qc.setQueryData<CollectionRow[]>(COLLECTIONS_KEY, (rows) => rows?.map((r) => (r.id === id ? { ...r, isActive } : r)));
      return { prev };
    },
    onError: (e, _v, ctx) => {
      qc.setQueryData(COLLECTIONS_KEY, ctx?.prev);
      toastError(e);
    },
    onSettled: refresh,
  });

  const reorder = useMutation({
    mutationFn: (ids: number[]) => api.put('/collections-order', { ids }),
    onError: (e) => {
      toastError(e);
      refresh();
    },
    onSuccess: () => toast.success('Order saved'),
  });

  const del = useMutation({
    mutationFn: (id: number) => api.del(`/collections/${id}`),
    onSuccess: () => {
      toast.success('Collection deleted');
      refresh();
    },
    onError: (e) => toastError(e),
  });

  const move = (id: number, dir: -1 | 1) => {
    const rows = [...(data ?? [])];
    const from = rows.findIndex((r) => r.id === id);
    const to = from + dir;
    if (from < 0 || to < 0 || to >= rows.length) return;
    [rows[from], rows[to]] = [rows[to]!, rows[from]!];
    qc.setQueryData(COLLECTIONS_KEY, rows);
    reorder.mutate(rows.map((r) => r.id));
  };

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (data ?? []).filter((c) => !term || c.name.toLowerCase().includes(term));
  }, [data, q]);

  const premium = data?.find((c) => c.isPremium && c.isActive);
  const searching = q.trim().length > 0;

  return (
    <>
      <PageHeader
        title="Collections"
        subtitle="Bundles of products your customers can buy together. They are shown on the home page."
        actions={
          <Can permission="catalog.write">
            <Link to="/collections/new">
              <Button>
                <Plus className="h-4 w-4" /> New collection
              </Button>
            </Link>
          </Can>
        }
      />

      {data && data.length > 0 && (
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <div className="relative w-full max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input className="pl-9" placeholder="Search collections" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search collections" />
          </div>
          <p className="flex items-center gap-1.5 text-sm text-muted">
            <Crown className="h-4 w-4 text-warning" />
            {premium ? (
              <>
                Main banner: <span className="font-semibold text-foreground">{premium.name}</span>
              </>
            ) : (
              'No main banner collection is set. Open one and turn on "Main banner".'
            )}
          </p>
          {!searching && data.length > 1 && <p className="ml-auto hidden text-xs text-muted md:block">Use the arrows to change the order on the home page</p>}
        </div>
      )}

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <Skeleton className="aspect-[16/9] w-full rounded-none" />
              <div className="space-y-2 p-4">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-4 w-1/3" />
              </div>
            </Card>
          ))}
        </div>
      ) : error ? (
        <Card>
          <EmptyState title="Could not load collections" hint={(error as Error).message} />
        </Card>
      ) : !data || data.length === 0 ? (
        <Card>
          <EmptyState
            title="No collections yet"
            hint="A collection groups products that sell well together, for example a bedroom set. Customers can add the whole set to their cart in one tap."
            action={
              <Can permission="catalog.write">
                <Link to="/collections/new">
                  <Button className="mt-2">
                    <Layers className="h-4 w-4" /> Create your first collection
                  </Button>
                </Link>
              </Can>
            }
          />
        </Card>
      ) : shown.length === 0 ? (
        <Card>
          <EmptyState title={`Nothing matches "${q}"`} hint="Try a different word." />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {shown.map((c) => {
            const index = data.findIndex((r) => r.id === c.id);
            return (
              <CollectionCard
                key={c.id}
                c={c}
                index={searching ? 1 : index}
                last={searching ? false : index === data.length - 1}
                onMove={(dir) => !searching && move(c.id, dir)}
                onToggle={(isActive) => toggle.mutate({ id: c.id, isActive })}
                onDelete={() => setDeleting(c)}
              />
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Delete "${deleting?.name}"?`}
        description="The collection and its picture are removed from the shop, and from any customer's collection cart. The products themselves are not touched. This cannot be undone."
        confirmLabel="Delete collection"
        danger
        onConfirm={() => deleting && del.mutateAsync(deleting.id)}
      />
    </>
  );
}
