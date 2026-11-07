import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { Link } from 'react-router';
import { Can } from '@/components/Can';
import { Button } from '@/components/ui/button';
import { Card, EmptyState, PageHeader, Pager, StatusBadge, Table, TableSkeleton, TD, TH, THead, TR } from '@/components/ui/data';
import { Select } from '@/components/ui/form';
import { api } from '@/lib/api-client';
import { dateOnly, money } from '@/lib/format';
import { useUrlState } from '@/lib/hooks';

interface Row {
  id: number;
  date: string;
  supplierName: string | null;
  reference: string | null;
  status: string;
  itemCount: number;
  total?: string;
  createdBy: string | null;
}

export default function Receipts() {
  const [f, set] = useUrlState({ status: '', page: '1' });
  const { data, isLoading, error } = useQuery({
    queryKey: ['receipts', f],
    queryFn: () => api.list<Row>('/inventory/receipts', { status: f.status, page: f.page, pageSize: 25 }),
    placeholderData: (prev) => prev,
  });
  const showTotal = data?.items.some((r) => r.total !== undefined);
  return (
    <>
      <PageHeader
        title="Stock receipts"
        subtitle="Record stock that arrives from your suppliers. Receiving a receipt adds the stock and updates the cost."
        actions={
          <Can permission="inventory.receive">
            <Link to="/receipts/new">
              <Button>
                <Plus className="h-4 w-4" /> New receipt
              </Button>
            </Link>
          </Can>
        }
      />
      <Card>
        <div className="border-b border-border p-4">
          <Select className="w-44" value={f.status} onChange={(e) => set({ status: e.target.value })} aria-label="Status">
            <option value="">All receipts</option>
            <option value="draft">Draft</option>
            <option value="received">Received</option>
            <option value="cancelled">Cancelled</option>
          </Select>
        </div>
        {isLoading ? (
          <TableSkeleton />
        ) : error ? (
          <EmptyState title="Could not load receipts" hint={(error as Error).message} />
        ) : !data || data.items.length === 0 ? (
          <EmptyState title="No receipts yet" hint="Create one when new stock arrives." />
        ) : (
          <>
            <Table>
              <THead>
                <tr>
                  <TH>Receipt</TH>
                  <TH>Date</TH>
                  <TH>Supplier</TH>
                  <TH>Reference</TH>
                  <TH>Status</TH>
                  <TH className="text-right">Items</TH>
                  {showTotal && <TH className="text-right">Total</TH>}
                </tr>
              </THead>
              <tbody>
                {data.items.map((r) => (
                  <TR key={r.id} className="hover:bg-soft/50">
                    <TD>
                      <Link to={`/receipts/${r.id}`} className="font-semibold text-primary hover:underline">
                        #{r.id}
                      </Link>
                    </TD>
                    <TD>{dateOnly(r.date)}</TD>
                    <TD>{r.supplierName ?? '—'}</TD>
                    <TD className="text-muted">{r.reference ?? '—'}</TD>
                    <TD>
                      <StatusBadge status={r.status} />
                    </TD>
                    <TD className="text-right tabular-nums">{r.itemCount}</TD>
                    {showTotal && <TD className="text-right tabular-nums">{money(r.total)}</TD>}
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
