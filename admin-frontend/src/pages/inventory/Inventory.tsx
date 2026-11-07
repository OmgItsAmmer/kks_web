import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { SlidersHorizontal } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { Can } from '@/components/Can';
import { Button } from '@/components/ui/button';
import { Badge, Card, EmptyState, PageHeader, Pager, Table, TableSkeleton, TD, TH, THead, Tabs, TabsContent, TabsList, TabsTrigger, TR } from '@/components/ui/data';
import { Field, Input, Select, Textarea } from '@/components/ui/form';
import { Dialog } from '@/components/ui/overlay';
import { useDebounce } from '@/hooks/use-debounce';
import { api } from '@/lib/api-client';
import { useAuth } from '@/lib/auth';
import { dateTime, money, num, statusLabel } from '@/lib/format';
import { toastError, useUrlState } from '@/lib/hooks';

interface StockRow {
  variantId: number;
  productId: number;
  productName: string;
  variantName: string;
  sku: string | null;
  stock: number;
  alertStock: number;
  isLow: boolean;
  isVisible: boolean;
  sellPrice: string;
  buyPrice?: string;
  stockValue?: string;
}
interface MovementRow {
  id: number;
  createdAt: string;
  productId: number;
  productName: string;
  variantName: string;
  delta: number;
  stockAfter: number;
  reason: string;
  refType: string | null;
  refId: string | null;
  note: string | null;
  actor: string | null;
}

export default function Inventory() {
  return (
    <>
      <PageHeader title="Stock levels" subtitle="What is on the shelf, and every change that got it there" />
      <Tabs defaultValue="levels">
        <TabsList>
          <TabsTrigger value="levels">Levels</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
        <TabsContent value="levels">
          <Levels />
        </TabsContent>
        <TabsContent value="history">
          <History />
        </TabsContent>
      </Tabs>
    </>
  );
}

function Levels() {
  const [f, set] = useUrlState({ q: '', filter: 'all', page: '1' });
  const [q, setQ] = useState(f.q);
  const debounced = useDebounce(q);
  useEffect(() => {
    if (debounced !== f.q) set({ q: debounced });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);
  const { can } = useAuth();
  const [adjusting, setAdjusting] = useState<StockRow | null>(null);

  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ['inventory', 'stock', f],
    queryFn: () => api.list<StockRow>('/inventory/stock', { q: f.q, filter: f.filter, page: f.page, pageSize: 25 }),
    placeholderData: (prev) => prev,
  });
  const showCost = can('cost.view');

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
        <Input className="min-w-[220px] flex-1" placeholder="Search product, variant or SKU" value={q} onChange={(e) => setQ(e.target.value)} />
        <Select className="w-44" value={f.filter} onChange={(e) => set({ filter: e.target.value })} aria-label="Filter">
          <option value="all">All items</option>
          <option value="low">Low stock</option>
          <option value="out">Out of stock</option>
        </Select>
        {showCost && data?.summary?.totalValue != null && (
          <span className="ml-auto text-sm text-muted">
            Stock value (at cost): <strong className="text-foreground">{money(String(data.summary.totalValue))}</strong>
          </span>
        )}
      </div>
      {isLoading ? (
        <TableSkeleton />
      ) : error ? (
        <EmptyState title="Could not load stock" hint={(error as Error).message} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState title="Nothing here" hint="No items match this filter." />
      ) : (
        <div className={isFetching ? 'opacity-70 transition-opacity' : ''}>
          <Table>
            <THead>
              <tr>
                <TH>Product</TH>
                <TH>SKU</TH>
                <TH className="text-right">Stock</TH>
                <TH className="text-right">Alert at</TH>
                {showCost && <TH className="text-right">Cost</TH>}
                <TH className="text-right">Price</TH>
                <TH />
              </tr>
            </THead>
            <tbody>
              {data.items.map((r) => (
                <TR key={r.variantId}>
                  <TD>
                    <Link to={`/products/${r.productId}`} className="font-semibold hover:text-primary">
                      {r.productName}
                    </Link>
                    <div className="text-xs text-muted">
                      {r.variantName}
                      {!r.isVisible && ' · hidden'}
                    </div>
                  </TD>
                  <TD className="text-muted">{r.sku ?? '—'}</TD>
                  <TD className="text-right tabular-nums">
                    {r.stock === 0 ? <Badge color="danger">Out</Badge> : r.isLow ? <Badge color="warning">{r.stock} low</Badge> : num(r.stock)}
                  </TD>
                  <TD className="text-right tabular-nums text-muted">{r.alertStock || '—'}</TD>
                  {showCost && <TD className="text-right tabular-nums">{money(r.buyPrice)}</TD>}
                  <TD className="text-right tabular-nums">{money(r.sellPrice)}</TD>
                  <TD className="text-right">
                    <Can permission="inventory.adjust">
                      <Button variant="ghost" size="sm" onClick={() => setAdjusting(r)}>
                        <SlidersHorizontal className="h-4 w-4" /> Adjust
                      </Button>
                    </Can>
                  </TD>
                </TR>
              ))}
            </tbody>
          </Table>
          <Pager pagination={data.pagination} onPage={(p) => set({ page: String(p) }, false)} />
        </div>
      )}
      <AdjustDialog row={adjusting} onClose={() => setAdjusting(null)} />
    </Card>
  );
}

function AdjustDialog({ row, onClose }: { row: StockRow | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [mode, setMode] = useState<'set' | 'delta'>('delta');
  const [value, setValue] = useState('');
  const [reason, setReason] = useState('manual_adjustment');
  const [note, setNote] = useState('');
  useEffect(() => {
    setMode('delta');
    setValue('');
    setReason('manual_adjustment');
    setNote('');
  }, [row]);
  const save = useMutation({
    mutationFn: () => api.post('/inventory/adjustments', { variantId: row!.variantId, mode, value: Number(value), reason, note }),
    onSuccess: () => {
      toast.success('Stock updated');
      void qc.invalidateQueries({ queryKey: ['inventory'] });
      void qc.invalidateQueries({ queryKey: ['products'] });
      void qc.invalidateQueries({ queryKey: ['dashboard'] });
      onClose();
    },
    onError: (e) => toastError(e),
  });
  const n = Number(value);
  const result = value !== '' && Number.isInteger(n) ? (mode === 'set' ? n : (row?.stock ?? 0) + n) : null;
  const valid = value !== '' && Number.isInteger(n) && note.trim().length >= 3 && result !== null && result >= 0 && result !== row?.stock;
  return (
    <Dialog
      open={row !== null}
      onOpenChange={(o) => !o && onClose()}
      title="Adjust stock"
      description={row ? `${row.productName} · ${row.variantName} (now ${row.stock})` : undefined}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={save.isPending} disabled={!valid} onClick={() => save.mutate()}>
            Save adjustment
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="How">
            {(id) => (
              <Select id={id} value={mode} onChange={(e) => setMode(e.target.value as 'set' | 'delta')}>
                <option value="delta">Add or remove</option>
                <option value="set">Set to an exact number</option>
              </Select>
            )}
          </Field>
          <Field label={mode === 'set' ? 'New stock' : 'Change (+ or −)'} hint={result !== null ? `Result: ${result}` : undefined} error={result !== null && result < 0 ? 'Stock cannot go below zero' : undefined}>
            {(id) => <Input id={id} inputMode="numeric" value={value} onChange={(e) => setValue(e.target.value)} placeholder={mode === 'set' ? '12' : '-2'} autoFocus />}
          </Field>
        </div>
        <Field label="Reason">
          {(id) => (
            <Select id={id} value={reason} onChange={(e) => setReason(e.target.value)}>
              <option value="manual_adjustment">Stock count / damaged / lost</option>
              <option value="correction">Fixing a mistake</option>
              <option value="return">Customer return</option>
            </Select>
          )}
        </Field>
        <Field label="Note" hint="Required. Kept in the stock history.">
          {(id) => <Textarea id={id} rows={2} value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />}
        </Field>
      </div>
    </Dialog>
  );
}

function History() {
  const [f, set] = useUrlState({ reason: '', page: '1' });
  const { data, isLoading, error } = useQuery({
    queryKey: ['inventory', 'movements', f],
    queryFn: () => api.list<MovementRow>('/inventory/movements', { reason: f.reason, page: f.page, pageSize: 30 }),
    placeholderData: (prev) => prev,
  });
  return (
    <Card>
      <div className="flex items-center gap-3 border-b border-border p-4">
        <Select className="w-56" value={f.reason} onChange={(e) => set({ reason: e.target.value })} aria-label="Reason">
          <option value="">All changes</option>
          {['initial', 'order_placed', 'order_cancelled', 'purchase_received', 'purchase_reversed', 'manual_adjustment', 'correction', 'return'].map((r) => (
            <option key={r} value={r}>
              {statusLabel(r)}
            </option>
          ))}
        </Select>
      </div>
      {isLoading ? (
        <TableSkeleton />
      ) : error ? (
        <EmptyState title="Could not load history" hint={(error as Error).message} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState title="No stock changes yet" />
      ) : (
        <>
          <Table>
            <THead>
              <tr>
                <TH>When</TH>
                <TH>Item</TH>
                <TH>Reason</TH>
                <TH className="text-right">Change</TH>
                <TH className="text-right">Stock after</TH>
                <TH>By</TH>
              </tr>
            </THead>
            <tbody>
              {data.items.map((m) => (
                <TR key={m.id}>
                  <TD className="whitespace-nowrap text-muted">{dateTime(m.createdAt)}</TD>
                  <TD>
                    <Link to={`/products/${m.productId}`} className="font-semibold hover:text-primary">
                      {m.productName}
                    </Link>
                    <div className="text-xs text-muted">{m.variantName}</div>
                  </TD>
                  <TD>
                    {statusLabel(m.reason)}
                    {m.refType === 'order' && m.refId && (
                      <Link to={`/orders/${m.refId}`} className="ml-1 text-primary hover:underline">
                        #{m.refId}
                      </Link>
                    )}
                    {m.refType === 'receipt' && m.refId && (
                      <Link to={`/receipts/${m.refId}`} className="ml-1 text-primary hover:underline">
                        receipt #{m.refId}
                      </Link>
                    )}
                    {m.note && <div className="text-xs text-muted">{m.note}</div>}
                  </TD>
                  <TD className={`text-right font-semibold tabular-nums ${m.delta < 0 ? 'text-danger' : 'text-success'}`}>{m.delta > 0 ? `+${m.delta}` : m.delta}</TD>
                  <TD className="text-right tabular-nums">{m.stockAfter}</TD>
                  <TD className="text-muted">{m.actor}</TD>
                </TR>
              ))}
            </tbody>
          </Table>
          <Pager pagination={data.pagination} onPage={(p) => set({ page: String(p) }, false)} />
        </>
      )}
    </Card>
  );
}
