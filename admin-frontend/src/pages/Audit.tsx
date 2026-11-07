import { useQuery } from '@tanstack/react-query';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { Card, EmptyState, PageHeader, Pager, Table, TableSkeleton, TD, TH, THead, TR } from '@/components/ui/data';
import { Input } from '@/components/ui/form';
import { api } from '@/lib/api-client';
import { dateTime } from '@/lib/format';
import { useUrlState } from '@/lib/hooks';

interface Row {
  id: number;
  actor: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  before: unknown;
  after: unknown;
  ip: string | null;
  requestId: string | null;
  createdAt: string;
}

export default function Audit() {
  const [f, set] = useUrlState({ actor: '', action: '', from: '', to: '', page: '1' });
  const [open, setOpen] = useState<number | null>(null);
  const { data, isLoading, error } = useQuery({
    queryKey: ['audit', f],
    queryFn: () => api.list<Row>('/audit', { actor: f.actor, action: f.action, from: f.from, to: f.to, page: f.page, pageSize: 30 }),
    placeholderData: (prev) => prev,
  });
  return (
    <>
      <PageHeader title="Activity log" subtitle="Who changed what, and when. Only owners can see this." />
      <Card>
        <div className="flex flex-wrap gap-3 border-b border-border p-4">
          <Input className="w-56" placeholder="Person (email)" defaultValue={f.actor} onBlur={(e) => set({ actor: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && set({ actor: e.currentTarget.value })} />
          <Input className="w-56" placeholder="Action, e.g. orders" defaultValue={f.action} onBlur={(e) => set({ action: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && set({ action: e.currentTarget.value })} />
          <Input type="date" className="w-40" value={f.from} onChange={(e) => set({ from: e.target.value })} aria-label="From date" />
          <Input type="date" className="w-40" value={f.to} onChange={(e) => set({ to: e.target.value })} aria-label="To date" />
        </div>
        {isLoading ? (
          <TableSkeleton />
        ) : error ? (
          <EmptyState title="Could not load the log" hint={(error as Error).message} />
        ) : !data || data.items.length === 0 ? (
          <EmptyState title="Nothing recorded" />
        ) : (
          <>
            <Table>
              <THead>
                <tr>
                  <TH className="w-8" />
                  <TH>When</TH>
                  <TH>Who</TH>
                  <TH>Action</TH>
                  <TH>On</TH>
                  <TH>IP</TH>
                </tr>
              </THead>
              <tbody>
                {data.items.flatMap((r) => [
                  <TR key={r.id} className="cursor-pointer hover:bg-soft/50" onClick={() => setOpen(open === r.id ? null : r.id)}>
                    <TD>{open === r.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</TD>
                    <TD className="whitespace-nowrap text-muted">{dateTime(r.createdAt)}</TD>
                    <TD>{r.actor}</TD>
                    <TD className="font-semibold">{r.action}</TD>
                    <TD>{r.entityType ? `${r.entityType} ${r.entityId ?? ''}` : '—'}</TD>
                    <TD className="text-muted">{r.ip}</TD>
                  </TR>,
                  open === r.id && (
                    <TR key={`${r.id}-d`}>
                      <TD />
                      <TD colSpan={5} className="bg-soft/50">
                        <div className="grid gap-3 text-xs sm:grid-cols-2">
                          <div>
                            <p className="mb-1 font-bold text-muted">Before</p>
                            <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded bg-surface p-2">{r.before ? JSON.stringify(r.before, null, 2) : '—'}</pre>
                          </div>
                          <div>
                            <p className="mb-1 font-bold text-muted">After</p>
                            <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded bg-surface p-2">{r.after ? JSON.stringify(r.after, null, 2) : '—'}</pre>
                          </div>
                        </div>
                        {r.requestId && <p className="mt-2 text-xs text-muted">Request {r.requestId}</p>}
                      </TD>
                    </TR>
                  ),
                ])}
              </tbody>
            </Table>
            <Pager pagination={data.pagination} onPage={(p) => set({ page: String(p) }, false)} />
          </>
        )}
      </Card>
    </>
  );
}
