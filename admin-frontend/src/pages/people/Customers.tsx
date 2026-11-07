import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Card, EmptyState, PageHeader, Pager, Table, TableSkeleton, TD, TH, THead, TR } from '@/components/ui/data';
import { Input } from '@/components/ui/form';
import { useDebounce } from '@/hooks/use-debounce';
import { api } from '@/lib/api-client';
import { dateOnly, money } from '@/lib/format';
import { useUrlState } from '@/lib/hooks';

interface Row {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  joinedAt: string | null;
  orders: number;
  totalSpent: string;
  lastOrder: string | null;
}

export default function Customers() {
  const [f, set] = useUrlState({ q: '', page: '1' });
  const [q, setQ] = useState(f.q);
  const debounced = useDebounce(q);
  useEffect(() => {
    if (debounced !== f.q) set({ q: debounced });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);
  const { data, isLoading, error } = useQuery({
    queryKey: ['customers', f],
    queryFn: () => api.list<Row>('/customers', { q: f.q, page: f.page, pageSize: 25 }),
    placeholderData: (prev) => prev,
  });
  return (
    <>
      <PageHeader title="Customers" subtitle="People who have signed up to shop" />
      <Card>
        <div className="relative border-b border-border p-4">
          <Search className="pointer-events-none absolute left-7 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input className="pl-9" placeholder="Search name, email, phone or customer number" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        {isLoading ? (
          <TableSkeleton />
        ) : error ? (
          <EmptyState title="Could not load customers" hint={(error as Error).message} />
        ) : !data || data.items.length === 0 ? (
          <EmptyState title="No customers found" />
        ) : (
          <>
            <Table>
              <THead>
                <tr>
                  <TH>Customer</TH>
                  <TH>Phone</TH>
                  <TH>Joined</TH>
                  <TH className="text-right">Orders</TH>
                  <TH className="text-right">Spent</TH>
                  <TH>Last order</TH>
                </tr>
              </THead>
              <tbody>
                {data.items.map((c) => (
                  <TR key={c.id} className="hover:bg-soft/50">
                    <TD>
                      <Link to={`/customers/${c.id}`} className="font-semibold text-primary hover:underline">
                        {c.name || `Customer #${c.id}`}
                      </Link>
                      <div className="text-xs text-muted">{c.email}</div>
                    </TD>
                    <TD>{c.phone ?? '—'}</TD>
                    <TD>{dateOnly(c.joinedAt)}</TD>
                    <TD className="text-right tabular-nums">{c.orders}</TD>
                    <TD className="text-right tabular-nums">{money(c.totalSpent)}</TD>
                    <TD>{dateOnly(c.lastOrder)}</TD>
                  </TR>
                ))}
              </tbody>
            </Table>
            <Pager pagination={data.pagination} onPage={(p) => set({ page: String(p) }, false)} />
          </>
        )}
      </Card>
    </>
  );
}
