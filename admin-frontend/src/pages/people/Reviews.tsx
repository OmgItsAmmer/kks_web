import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, EyeOff, Star, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { Can } from '@/components/Can';
import { Button } from '@/components/ui/button';
import { Badge, Card, EmptyState, PageHeader, Pager, Table, TableSkeleton, TD, TH, THead, TR } from '@/components/ui/data';
import { Select } from '@/components/ui/form';
import { ConfirmDialog } from '@/components/ui/overlay';
import { api } from '@/lib/api-client';
import { dateOnly } from '@/lib/format';
import { toastError, useUrlState } from '@/lib/hooks';

interface Row {
  id: number;
  productId: number | null;
  productName: string;
  customerName: string;
  rating: number | null;
  review: string;
  sentAt: string;
  isHidden: boolean;
}

export default function Reviews() {
  const [f, set] = useUrlState({ hidden: '', rating: '', page: '1' });
  const qc = useQueryClient();
  const [deleting, setDeleting] = useState<Row | null>(null);
  const { data, isLoading, error } = useQuery({
    queryKey: ['reviews', f],
    queryFn: () => api.list<Row>('/reviews', { hidden: f.hidden, rating: f.rating, page: f.page, pageSize: 25 }),
    placeholderData: (prev) => prev,
  });
  const toggle = useMutation({
    mutationFn: (r: Row) => api.patch(`/reviews/${r.id}`, { isHidden: !r.isHidden }),
    onSuccess: (_d, r) => {
      toast.success(r.isHidden ? 'Review is visible again' : 'Review hidden from the store');
      void qc.invalidateQueries({ queryKey: ['reviews'] });
    },
    onError: (e) => toastError(e),
  });
  const del = useMutation({
    mutationFn: (id: number) => api.del(`/reviews/${id}`),
    onSuccess: () => {
      toast.success('Review deleted');
      void qc.invalidateQueries({ queryKey: ['reviews'] });
    },
    onError: (e) => toastError(e),
  });
  return (
    <>
      <PageHeader title="Reviews" subtitle="What customers say. Hidden reviews disappear from the store but are kept here." />
      <Card>
        <div className="flex flex-wrap gap-3 border-b border-border p-4">
          <Select className="w-40" value={f.rating} onChange={(e) => set({ rating: e.target.value })} aria-label="Rating">
            <option value="">Any rating</option>
            {[5, 4, 3, 2, 1].map((r) => (
              <option key={r} value={r}>
                {r} stars
              </option>
            ))}
          </Select>
          <Select className="w-40" value={f.hidden} onChange={(e) => set({ hidden: e.target.value })} aria-label="Visibility">
            <option value="">Shown and hidden</option>
            <option value="false">Shown</option>
            <option value="true">Hidden</option>
          </Select>
        </div>
        {isLoading ? (
          <TableSkeleton />
        ) : error ? (
          <EmptyState title="Could not load reviews" hint={(error as Error).message} />
        ) : !data || data.items.length === 0 ? (
          <EmptyState title="No reviews" />
        ) : (
          <>
            <Table>
              <THead>
                <tr>
                  <TH>Product</TH>
                  <TH>Rating</TH>
                  <TH>Review</TH>
                  <TH>Date</TH>
                  <TH />
                </tr>
              </THead>
              <tbody>
                {data.items.map((r) => (
                  <TR key={r.id} className={r.isHidden ? 'opacity-60' : ''}>
                    <TD>
                      {r.productId ? (
                        <Link to={`/products/${r.productId}`} className="font-semibold hover:text-primary">
                          {r.productName}
                        </Link>
                      ) : (
                        r.productName
                      )}
                      <div className="text-xs text-muted">{r.customerName}</div>
                    </TD>
                    <TD>
                      <span className="inline-flex items-center gap-1 font-semibold tabular-nums">
                        <Star className="h-4 w-4 fill-secondary text-secondary" /> {r.rating ?? '—'}
                      </span>
                    </TD>
                    <TD className="max-w-md">
                      <p className="line-clamp-3 whitespace-pre-wrap">{r.review || <span className="text-muted">(no text)</span>}</p>
                      {r.isHidden && <Badge className="mt-1">Hidden</Badge>}
                    </TD>
                    <TD className="whitespace-nowrap">{dateOnly(r.sentAt)}</TD>
                    <TD className="text-right">
                      <Can permission="reviews.moderate">
                        <Button variant="ghost" size="sm" onClick={() => toggle.mutate(r)}>
                          {r.isHidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />} {r.isHidden ? 'Show' : 'Hide'}
                        </Button>
                        <Button variant="ghost" size="icon" aria-label="Delete" onClick={() => setDeleting(r)}>
                          <Trash2 className="h-4 w-4 text-danger" />
                        </Button>
                      </Can>
                    </TD>
                  </TR>
                ))}
              </tbody>
            </Table>
            <Pager pagination={data.pagination} onPage={(p) => set({ page: String(p) }, false)} />
          </>
        )}
      </Card>
      <ConfirmDialog open={deleting !== null} onOpenChange={(o) => !o && setDeleting(null)} title="Delete this review?" description="This cannot be undone. Hiding it is usually enough." confirmLabel="Delete" danger onConfirm={() => deleting && del.mutateAsync(deleting.id)} />
    </>
  );
}
