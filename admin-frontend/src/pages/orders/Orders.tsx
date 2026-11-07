import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { Card, EmptyState, PageHeader, Pager, StatusBadge, Table, TableSkeleton, TD, TH, THead, TR } from '@/components/ui/data';
import { Input, Select } from '@/components/ui/form';
import { useDebounce } from '@/hooks/use-debounce';
import { api } from '@/lib/api-client';
import { dateOnly, money, statusLabel } from '@/lib/format';
import { useUrlState } from '@/lib/hooks';
import { useEffect, useState } from 'react';

export interface OrderRow {
  id: number;
  date: string;
  status: string;
  customerName: string;
  phone: string | null;
  itemCount: number;
  total: string;
  amountPaid: string;
  balance: string;
  paymentMethod: string | null;
  hasReceipt: boolean;
}

export const ORDER_STATUSES = ['pending', 'confirmed', 'processing', 'ready', 'delivered', 'completed', 'cancelled'];
export const PAYMENT_METHODS = ['cod', 'credit_card', 'bank_transfer', 'pickup', 'jazzcash'];
export const methodLabel = (m: string | null) => (m ? ({ cod: 'Cash on delivery', credit_card: 'Card', bank_transfer: 'Bank transfer', pickup: 'Pay at pickup', jazzcash: 'JazzCash' } as Record<string, string>)[m] ?? m : '—');

export default function Orders() {
  const [f, set] = useUrlState({ q: '', status: '', from: '', to: '', method: '', page: '1' });
  const [q, setQ] = useState(f.q);
  const debounced = useDebounce(q);
  useEffect(() => {
    if (debounced !== f.q) set({ q: debounced });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ['orders', f],
    queryFn: () => api.list<OrderRow>('/orders', { q: f.q, status: f.status, from: f.from, to: f.to, paymentMethod: f.method, page: f.page, pageSize: 25 }),
    placeholderData: (prev) => prev,
  });

  return (
    <>
      <PageHeader title="Orders" subtitle="Everything customers have placed" />
      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-border p-4 no-print">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input className="pl-9" placeholder="Search order number, name or phone" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Select className="w-44" value={f.status} onChange={(e) => set({ status: e.target.value })} aria-label="Status">
            <option value="">All statuses</option>
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {statusLabel(s)}
              </option>
            ))}
          </Select>
          <Select className="w-44" value={f.method} onChange={(e) => set({ method: e.target.value })} aria-label="Payment method">
            <option value="">Any payment</option>
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>
                {methodLabel(m)}
              </option>
            ))}
          </Select>
          <Input type="date" className="w-40" value={f.from} onChange={(e) => set({ from: e.target.value })} aria-label="From date" />
          <Input type="date" className="w-40" value={f.to} onChange={(e) => set({ to: e.target.value })} aria-label="To date" />
          {(f.q || f.status || f.from || f.to || f.method) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setQ('');
                set({ q: '', status: '', from: '', to: '', method: '' });
              }}
            >
              Clear
            </Button>
          )}
        </div>
        {isLoading ? (
          <TableSkeleton />
        ) : error ? (
          <EmptyState title="Could not load orders" hint={(error as Error).message} />
        ) : !data || data.items.length === 0 ? (
          <EmptyState title="No orders found" hint="Try a different search or filter." />
        ) : (
          <div className={isFetching ? 'opacity-70 transition-opacity' : ''}>
            <Table>
              <THead>
                <tr>
                  <TH>Order</TH>
                  <TH>Date</TH>
                  <TH>Customer</TH>
                  <TH>Status</TH>
                  <TH>Payment</TH>
                  <TH className="text-right">Items</TH>
                  <TH className="text-right">Total</TH>
                  <TH className="text-right">Due</TH>
                </tr>
              </THead>
              <tbody>
                {data.items.map((o) => (
                  <TR key={o.id} className="hover:bg-soft/50">
                    <TD>
                      <Link to={`/orders/${o.id}`} className="font-semibold text-primary hover:underline">
                        #{o.id}
                      </Link>
                    </TD>
                    <TD>{dateOnly(o.date)}</TD>
                    <TD>
                      <div className="font-medium">{o.customerName}</div>
                      <div className="text-xs text-muted">{o.phone}</div>
                    </TD>
                    <TD>
                      <StatusBadge status={o.status} />
                    </TD>
                    <TD>
                      {methodLabel(o.paymentMethod)}
                      {o.hasReceipt && <span className="ml-1 text-xs text-info">· receipt</span>}
                    </TD>
                    <TD className="text-right tabular-nums">{o.itemCount}</TD>
                    <TD className="text-right font-semibold tabular-nums">{money(o.total)}</TD>
                    <TD className="text-right tabular-nums">{o.status === 'cancelled' ? '—' : money(o.balance)}</TD>
                  </TR>
                ))}
              </tbody>
            </Table>
            <Pager pagination={data.pagination} onPage={(p) => set({ page: String(p) }, false)} />
          </div>
        )}
      </Card>
    </>
  );
}
