import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { Link, useParams } from 'react-router';
import { Card, CardBody, CardHeader, CardTitle, EmptyState, PageHeader, Skeleton, StatCard, StatusBadge, Table, TD, TH, THead, TR } from '@/components/ui/data';
import { api } from '@/lib/api-client';
import { dateOnly, money } from '@/lib/format';

interface Detail {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  gender: string | null;
  joinedAt: string | null;
  stats: { orders: number; totalSpent: string; averageOrder: string; reviews: number };
  addresses: { id: number; fullName: string; phone: string | null; address: string | null; city: string | null; postalCode: string | null }[];
  recentOrders: { id: number; date: string; status: string; total: string }[];
}

export default function CustomerDetail() {
  const { id } = useParams();
  const { data, isLoading, error } = useQuery({ queryKey: ['customers', 'detail', id], queryFn: () => api.get<Detail>(`/customers/${id}`) });
  if (isLoading) return <Skeleton className="h-96" />;
  if (error || !data) return <EmptyState title="Customer not found" hint={(error as Error)?.message} />;
  return (
    <>
      <Link to="/customers" className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Customers
      </Link>
      <PageHeader title={data.name || `Customer #${data.id}`} subtitle={`${data.email}${data.phone ? ` · ${data.phone}` : ''} · joined ${dateOnly(data.joinedAt)}`} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Orders" value={data.stats.orders} />
        <StatCard label="Total spent" value={money(data.stats.totalSpent)} color="success" />
        <StatCard label="Average order" value={money(data.stats.averageOrder)} />
        <StatCard label="Reviews written" value={data.stats.reviews} color="warning" />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent orders</CardTitle>
            <Link to={`/orders?q=${encodeURIComponent(data.phone ?? data.name)}`} className="text-sm font-semibold text-primary hover:underline">
              Search all
            </Link>
          </CardHeader>
          {data.recentOrders.length === 0 ? (
            <EmptyState title="No orders yet" />
          ) : (
            <Table>
              <THead>
                <tr>
                  <TH>Order</TH>
                  <TH>Date</TH>
                  <TH>Status</TH>
                  <TH className="text-right">Total</TH>
                </tr>
              </THead>
              <tbody>
                {data.recentOrders.map((o) => (
                  <TR key={o.id}>
                    <TD>
                      <Link to={`/orders/${o.id}`} className="font-semibold text-primary hover:underline">
                        #{o.id}
                      </Link>
                    </TD>
                    <TD>{dateOnly(o.date)}</TD>
                    <TD>
                      <StatusBadge status={o.status} />
                    </TD>
                    <TD className="text-right tabular-nums">{money(o.total)}</TD>
                  </TR>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Saved addresses</CardTitle>
          </CardHeader>
          <CardBody className="space-y-4 text-sm">
            {data.addresses.length === 0 && <p className="text-muted">None saved.</p>}
            {data.addresses.map((a) => (
              <div key={a.id}>
                <p className="font-semibold">{a.fullName}</p>
                <p>{a.phone}</p>
                <p>{a.address}</p>
                <p className="text-muted">{[a.city, a.postalCode].filter(Boolean).join(', ')}</p>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>
    </>
  );
}
