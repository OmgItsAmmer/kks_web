import { useQuery } from '@tanstack/react-query';
import { Printer } from 'lucide-react';
import { useParams } from 'react-router';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api-client';
import { dateOnly, dec, money } from '@/lib/format';
import { methodLabel } from './Orders';
import type { OrderFull } from './OrderDetail';

/** A4 invoice / packing slip. Use the browser's Print (or Save as PDF). The app chrome is hidden when printing. */
export default function Invoice() {
  const { id } = useParams();
  const { data: o, isLoading, error } = useQuery({ queryKey: ['orders', 'detail', id], queryFn: () => api.get<OrderFull>(`/orders/${id}`) });
  if (isLoading) return <p className="p-10 text-center text-muted">Loading…</p>;
  if (error || !o) return <p className="p-10 text-center text-danger">Could not load the order.</p>;

  return (
    <div className="min-h-full bg-soft p-4 print:bg-white print:p-0">
      <div className="mx-auto mb-4 flex max-w-[800px] justify-end no-print">
        <Button onClick={() => window.print()}>
          <Printer className="h-4 w-4" /> Print / Save as PDF
        </Button>
      </div>
      <div className="mx-auto max-w-[800px] bg-white p-10 text-[13px] text-black shadow-card print:max-w-none print:p-0 print:shadow-none">
        <div className="flex items-start justify-between border-b-2 border-black pb-4">
          <div>
            <h1 className="text-2xl font-bold">KKS Online</h1>
            <p className="text-neutral-600">Invoice / packing slip</p>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold">Order #{o.id}</p>
            <p>{dateOnly(o.date)}</p>
            <p>{methodLabel(o.paymentMethod)}</p>
          </div>
        </div>

        <div className="my-5 grid grid-cols-2 gap-6">
          <div>
            <p className="mb-1 font-bold uppercase text-neutral-500">Customer</p>
            <p className="font-semibold">{o.customer?.name ?? 'Guest'}</p>
            <p>{o.customer?.phone}</p>
          </div>
          <div>
            <p className="mb-1 font-bold uppercase text-neutral-500">{o.shippingMethod === 'pickup' ? 'Pickup' : 'Ship to'}</p>
            {o.shippingAddress ? (
              <>
                <p className="font-semibold">{o.shippingAddress.fullName}</p>
                <p>{o.shippingAddress.phone}</p>
                <p>{o.shippingAddress.address}</p>
                <p>{[o.shippingAddress.city, o.shippingAddress.postalCode].filter(Boolean).join(', ')}</p>
              </>
            ) : (
              <p>Collect from store</p>
            )}
          </div>
        </div>

        <table className="w-full border-collapse">
          <thead>
            <tr className="border-y border-black text-left">
              <th className="py-2">Item</th>
              <th className="py-2 text-right">Price</th>
              <th className="py-2 text-right">Qty</th>
              <th className="py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {o.items.map((i) => (
              <tr key={i.variantId} className="border-b border-neutral-300">
                <td className="py-2">
                  <span className="font-semibold">{i.productName}</span>
                  <span className="block text-neutral-600">
                    {i.variantName}
                    {i.sku ? ` · ${i.sku}` : ''}
                  </span>
                </td>
                <td className="py-2 text-right tabular-nums">{money(i.price)}</td>
                <td className="py-2 text-right tabular-nums">{i.quantity}</td>
                <td className="py-2 text-right tabular-nums">{money(i.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="ml-auto mt-4 w-64 space-y-1">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span className="tabular-nums">{money(o.totals.subTotal)}</span>
          </div>
          {dec(o.totals.discount).gt(0) && (
            <div className="flex justify-between">
              <span>Discount</span>
              <span className="tabular-nums">− {money(o.totals.discount)}</span>
            </div>
          )}
          {dec(o.totals.tax).gt(0) && (
            <div className="flex justify-between">
              <span>Tax</span>
              <span className="tabular-nums">{money(o.totals.tax)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>Shipping</span>
            <span className="tabular-nums">{money(o.totals.shipping)}</span>
          </div>
          <div className="flex justify-between border-t border-black pt-1 text-base font-bold">
            <span>Total</span>
            <span className="tabular-nums">{money(o.totals.total)}</span>
          </div>
          <div className="flex justify-between">
            <span>Paid</span>
            <span className="tabular-nums">{money(o.totals.amountPaid)}</span>
          </div>
          <div className="flex justify-between font-bold">
            <span>Balance due</span>
            <span className="tabular-nums">{money(o.totals.balance)}</span>
          </div>
        </div>
        <p className="mt-10 text-center text-neutral-500">Thank you for shopping with us.</p>
      </div>
    </div>
  );
}
