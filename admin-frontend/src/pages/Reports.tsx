import { useQuery } from '@tanstack/react-query';
import { endOfMonth, startOfMonth, subDays } from 'date-fns';
import { Download } from 'lucide-react';
import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader, CardTitle, EmptyState, PageHeader, Skeleton, Table, TD, TH, THead, Tabs, TabsContent, TabsList, TabsTrigger, TR } from '@/components/ui/data';
import { Field, Input, Select } from '@/components/ui/form';
import { api } from '@/lib/api-client';
import { dateOnly, dec, isoDay, money } from '@/lib/format';
import { toastError } from '@/lib/hooks';

interface SalesRow {
  period: string;
  orders: number;
  revenue: string;
  cost: string;
  profit: string;
}
interface ProductRow {
  product_id: number;
  product: string;
  units_sold: number;
  revenue: string;
  cost: string;
  profit: string;
}
interface StockRow {
  product: string;
  variant: string;
  sku: string;
  stock: number;
  unit_cost: string;
  stock_value: string;
}

export default function Reports() {
  const [from, setFrom] = useState(isoDay(startOfMonth(new Date())));
  const [to, setTo] = useState(isoDay(endOfMonth(new Date())));
  const [interval, setInterval] = useState('day');
  const range = { from, to };

  const sales = useQuery({ queryKey: ['reports', 'sales', from, to, interval], queryFn: () => api.get<SalesRow[]>('/reports/sales', { ...range, interval }) });
  const products = useQuery({ queryKey: ['reports', 'products', from, to], queryFn: () => api.get<ProductRow[]>('/reports/products', range) });
  const stock = useQuery({ queryKey: ['reports', 'stock'], queryFn: () => api.get<StockRow[]>('/reports/stock-valuation') });

  const totals = (sales.data ?? []).reduce(
    (t, r) => ({ orders: t.orders + r.orders, revenue: t.revenue.plus(dec(r.revenue)), profit: t.profit.plus(dec(r.profit)) }),
    { orders: 0, revenue: dec(0), profit: dec(0) },
  );
  const download = (path: string, name: string, q: Record<string, string>) => api.download(path, { ...q, format: 'csv' }, name).catch((e) => toastError(e));
  const preset = (days: number) => {
    setFrom(isoDay(subDays(new Date(), days - 1)));
    setTo(isoDay(new Date()));
  };

  return (
    <>
      <PageHeader title="Reports" subtitle="Sales, profit and stock value. Cancelled orders are not counted." />
      <Card className="mb-6">
        <CardBody className="flex flex-wrap items-end gap-4">
          <Field label="From">{(id) => <Input id={id} type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-44" />}</Field>
          <Field label="To">{(id) => <Input id={id} type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-44" />}</Field>
          <Field label="Group by">
            {(id) => (
              <Select id={id} value={interval} onChange={(e) => setInterval(e.target.value)} className="w-36">
                <option value="day">Day</option>
                <option value="week">Week</option>
                <option value="month">Month</option>
              </Select>
            )}
          </Field>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => preset(7)}>
              Last 7 days
            </Button>
            <Button variant="outline" size="sm" onClick={() => preset(30)}>
              Last 30 days
            </Button>
            <Button variant="outline" size="sm" onClick={() => { setFrom(isoDay(startOfMonth(new Date()))); setTo(isoDay(endOfMonth(new Date()))); }}>
              This month
            </Button>
          </div>
        </CardBody>
      </Card>

      <Tabs defaultValue="sales">
        <TabsList>
          <TabsTrigger value="sales">Sales</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="stock">Stock value</TabsTrigger>
        </TabsList>

        <TabsContent value="sales">
          <Card>
            <CardHeader>
              <CardTitle>
                {money(totals.revenue.toString())} from {totals.orders} orders · profit {money(totals.profit.toString())}
              </CardTitle>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => download('/reports/sales', `sales-${from}-to-${to}.csv`, { ...range, interval })}>
                  <Download className="h-4 w-4" /> CSV
                </Button>
                <Button size="sm" variant="outline" onClick={() => download('/reports/orders', `orders-${from}-to-${to}.csv`, range)}>
                  <Download className="h-4 w-4" /> All orders CSV
                </Button>
              </div>
            </CardHeader>
            {sales.isLoading ? (
              <Skeleton className="m-5 h-64" />
            ) : !sales.data || sales.data.length === 0 ? (
              <EmptyState title="No sales in this period" />
            ) : (
              <>
                <CardBody>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={sales.data.map((r) => ({ period: dateOnly(r.period).replace(/ \d{4}$/, ''), revenue: dec(r.revenue).toNumber() }))}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgb(217 217 217 / 0.6)" />
                        <XAxis dataKey="period" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} width={56} tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))} />
                        <Tooltip formatter={(v: number) => [money(v), 'Sales']} />
                        <Bar dataKey="revenue" fill="rgb(75 104 255)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardBody>
                <Table>
                  <THead>
                    <tr>
                      <TH>Period</TH>
                      <TH className="text-right">Orders</TH>
                      <TH className="text-right">Sales</TH>
                      <TH className="text-right">Cost</TH>
                      <TH className="text-right">Profit</TH>
                    </tr>
                  </THead>
                  <tbody>
                    {sales.data.map((r) => (
                      <TR key={r.period}>
                        <TD>{dateOnly(r.period)}</TD>
                        <TD className="text-right tabular-nums">{r.orders}</TD>
                        <TD className="text-right tabular-nums">{money(r.revenue)}</TD>
                        <TD className="text-right tabular-nums">{money(r.cost)}</TD>
                        <TD className="text-right font-semibold tabular-nums">{money(r.profit)}</TD>
                      </TR>
                    ))}
                  </tbody>
                </Table>
              </>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="products">
          <Card>
            <CardHeader>
              <CardTitle>Best performing products</CardTitle>
              <Button size="sm" variant="outline" onClick={() => download('/reports/products', `products-${from}-to-${to}.csv`, range)}>
                <Download className="h-4 w-4" /> CSV
              </Button>
            </CardHeader>
            {products.isLoading ? (
              <Skeleton className="m-5 h-64" />
            ) : !products.data || products.data.length === 0 ? (
              <EmptyState title="No sales in this period" />
            ) : (
              <Table>
                <THead>
                  <tr>
                    <TH>Product</TH>
                    <TH className="text-right">Units</TH>
                    <TH className="text-right">Sales</TH>
                    <TH className="text-right">Profit</TH>
                  </tr>
                </THead>
                <tbody>
                  {products.data.map((r) => (
                    <TR key={r.product_id}>
                      <TD className="font-medium">{r.product}</TD>
                      <TD className="text-right tabular-nums">{r.units_sold}</TD>
                      <TD className="text-right tabular-nums">{money(r.revenue)}</TD>
                      <TD className="text-right tabular-nums">{money(r.profit)}</TD>
                    </TR>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="stock">
          <Card>
            <CardHeader>
              <CardTitle>Stock valuation (at cost)</CardTitle>
              <Button size="sm" variant="outline" onClick={() => download('/reports/stock-valuation', 'stock-valuation.csv', {})}>
                <Download className="h-4 w-4" /> CSV
              </Button>
            </CardHeader>
            {stock.isLoading ? (
              <Skeleton className="m-5 h-64" />
            ) : !stock.data || stock.data.length === 0 ? (
              <EmptyState title="No stock" />
            ) : (
              <>
                <CardBody className="border-b border-border text-sm">
                  Total value: <strong>{money(stock.data.reduce((s, r) => s.plus(dec(r.stock_value)), dec(0)).toString())}</strong>
                </CardBody>
                <Table>
                  <THead>
                    <tr>
                      <TH>Product</TH>
                      <TH>Variant</TH>
                      <TH className="text-right">Stock</TH>
                      <TH className="text-right">Unit cost</TH>
                      <TH className="text-right">Value</TH>
                    </tr>
                  </THead>
                  <tbody>
                    {stock.data.slice(0, 300).map((r, i) => (
                      <TR key={i}>
                        <TD className="font-medium">{r.product}</TD>
                        <TD className="text-muted">{r.variant}</TD>
                        <TD className="text-right tabular-nums">{r.stock}</TD>
                        <TD className="text-right tabular-nums">{money(r.unit_cost)}</TD>
                        <TD className="text-right tabular-nums">{money(r.stock_value)}</TD>
                      </TR>
                    ))}
                  </tbody>
                </Table>
                {stock.data.length > 300 && <p className="p-4 text-sm text-muted">Showing the first 300 rows. Download the CSV for everything.</p>}
              </>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}
