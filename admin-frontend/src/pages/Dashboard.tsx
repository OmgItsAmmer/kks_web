import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, PackageX, ShoppingCart, Wallet } from 'lucide-react';
import { Link } from 'react-router';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Can } from '@/components/Can';
import { Card, CardBody, CardHeader, CardTitle, EmptyState, PageHeader, Skeleton, StatCard, StatusBadge, Table, TD, TH, THead, TR } from '@/components/ui/data';
import { api } from '@/lib/api-client';
import { useAuth } from '@/lib/auth';
import { dateOnly, dec, money, num } from '@/lib/format';

interface Overview {
  ordersByStatus: Record<string, number>;
  openOrders: number;
  ordersToday: number;
  lowStockVariants: number;
  outOfStockVariants: number;
  revenue: { today: string; last7Days: string; last30Days: string } | null;
  salesSeries: { day: string; orders: number; revenue: string }[] | null;
  topProducts: { productId: number; name: string; units: number; imageUrl: string | null }[];
  recentOrders: { id: number; status: string; date: string; customerName: string; total: string }[];
}

export default function Dashboard() {
  const { me } = useAuth();
  const { data, isLoading, error } = useQuery({ queryKey: ['dashboard'], queryFn: () => api.get<Overview>('/dashboard'), staleTime: 60_000 });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-72" />
      </div>
    );
  }
  if (error || !data) return <EmptyState title="Could not load the dashboard" hint={(error as Error)?.message} />;

  const series = (data.salesSeries ?? []).map((s) => ({ day: dateOnly(s.day).replace(/ \d{4}$/, ''), revenue: dec(s.revenue).toNumber() }));

  return (
    <>
      <PageHeader title={`Welcome back, ${me?.name.split(' ')[0] ?? ''}`} subtitle="Here is what is happening in the store." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Open orders" value={num(data.openOrders)} hint={`${num(data.ordersToday)} placed today`} icon={<ShoppingCart className="h-5 w-5" />} />
        <Can permission="dashboard.revenue">
          <StatCard label="Sales today" value={money(data.revenue?.today)} hint={`Last 7 days: ${money(data.revenue?.last7Days)}`} icon={<Wallet className="h-5 w-5" />} color="success" />
        </Can>
        <StatCard label="Low stock" value={num(data.lowStockVariants)} hint="Items at or below their alert level" icon={<AlertTriangle className="h-5 w-5" />} color="warning" />
        <StatCard label="Out of stock" value={num(data.outOfStockVariants)} hint="Visible items with no stock" icon={<PackageX className="h-5 w-5" />} color="danger" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Can permission="dashboard.revenue">
          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle>Sales, last 30 days</CardTitle>
              <span className="text-sm text-muted">{money(data.revenue?.last30Days)}</span>
            </CardHeader>
            <CardBody>
              {series.length === 0 ? (
                <EmptyState title="No sales yet" hint="Orders will appear here as they come in." />
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={series} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                      <defs>
                        <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="rgb(75 104 255)" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="rgb(75 104 255)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgb(217 217 217 / 0.6)" />
                      <XAxis dataKey="day" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} width={56} tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))} />
                      <Tooltip formatter={(v: number) => [money(v), 'Sales']} />
                      <Area type="monotone" dataKey="revenue" stroke="rgb(75 104 255)" strokeWidth={2.5} fill="url(#rev)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardBody>
          </Card>
        </Can>

        <Card>
          <CardHeader>
            <CardTitle>Best sellers (30 days)</CardTitle>
          </CardHeader>
          <CardBody className="space-y-3">
            {data.topProducts.length === 0 && <p className="text-sm text-muted">No sales in the last 30 days.</p>}
            {data.topProducts.map((p) => (
              <Link key={p.productId} to={`/products/${p.productId}`} className="flex items-center gap-3 rounded hover:bg-soft">
                {p.imageUrl ? <img src={p.imageUrl} alt="" className="h-10 w-10 rounded object-cover" loading="lazy" /> : <div className="h-10 w-10 rounded bg-soft" />}
                <span className="min-w-0 flex-1 truncate text-sm font-semibold">{p.name}</span>
                <span className="text-sm tabular-nums text-muted">{p.units} sold</span>
              </Link>
            ))}
          </CardBody>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Recent orders</CardTitle>
          <Link to="/orders" className="text-sm font-semibold text-primary hover:underline">
            View all
          </Link>
        </CardHeader>
        {data.recentOrders.length === 0 ? (
          <EmptyState title="No orders yet" />
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>Order</TH>
                <TH>Customer</TH>
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
                  <TD>{o.customerName}</TD>
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
    </>
  );
}
