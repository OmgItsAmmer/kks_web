import { useQuery } from '@tanstack/react-query';
import { Printer } from 'lucide-react';
import { useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api-client';
import { dateOnly, dec, money } from '@/lib/format';
import { methodLabel } from './Orders';
import type { OrderFull } from './OrderDetail';

const n = (v: string) => money(v, false);

/**
 * Invoice / packing slip. Opened normally it is a preview; with ?autoprint=1 (used by the hidden
 * "Print" button on the order page) it prints itself as soon as it has loaded and tells the parent when done.
 * All text is solid black for thermal/laser clarity; amounts have no "Rs" (the column headers say Rs).
 */
export default function Invoice() {
  const { id } = useParams();
  const [sp] = useSearchParams();
  const autoprint = sp.get('autoprint') === '1';
  const { data: o, isLoading, error } = useQuery({ queryKey: ['orders', 'detail', id], queryFn: () => api.get<OrderFull>(`/orders/${id}`) });

  useEffect(() => {
    if (!autoprint || !o) return;
    const done = () => window.parent !== window && window.parent.postMessage({ type: 'invoice-printed' }, window.location.origin);
    window.addEventListener('afterprint', done);
    const t = window.setTimeout(() => window.print(), 300);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('afterprint', done);
    };
  }, [autoprint, o]);

  if (isLoading) return <p className="p-10 text-center text-black">Loading…</p>;
  if (error || !o) return <p className="p-10 text-center text-danger">Could not load the order.</p>;

  return (
    <div className="invoice-root min-h-full bg-soft p-4 print:min-h-0 print:bg-white print:p-0">
      <style>{`@page { size: auto; margin: 0; }
        @media print { html, body, #root { height: auto !important; min-height: 0 !important; margin: 0 !important; background: #fff !important; } }`}</style>
      {!autoprint && (
        <div className="mx-auto mb-4 flex max-w-[800px] justify-end no-print">
          <Button onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> Print
          </Button>
        </div>
      )}
      <div className="mx-auto max-w-[800px] bg-white p-10 text-[14px] font-medium leading-snug text-black shadow-card print:max-w-none print:p-[6mm] print:shadow-none">
        <div className="flex items-start justify-between border-b-2 border-black pb-3">
          <div>
            <h1 className="text-2xl font-extrabold">KKS Online</h1>
            <p className="font-semibold">Invoice / packing slip</p>
          </div>
          <div className="text-right">
            <p className="text-xl font-extrabold">Order #{o.id}</p>
            <p>{dateOnly(o.date)}</p>
            <p>{methodLabel(o.paymentMethod)}</p>
          </div>
        </div>

        <div className="my-4 grid grid-cols-2 gap-6">
          <div>
            <p className="mb-1 text-xs font-extrabold uppercase tracking-wide">Customer</p>
            <p className="font-bold">{o.customer?.name ?? 'Guest'}</p>
            <p>{o.customer?.phone}</p>
          </div>
          <div>
            <p className="mb-1 text-xs font-extrabold uppercase tracking-wide">{o.shippingMethod === 'pickup' ? 'Pickup' : 'Ship to'}</p>
            {o.shippingAddress ? (
              <>
                <p className="font-bold">{o.shippingAddress.fullName}</p>
                <p>{o.shippingAddress.phone}</p>
                <p>{o.shippingAddress.address}</p>
                <p>{[o.shippingAddress.city, o.shippingAddress.postalCode].filter(Boolean).join(', ')}</p>
              </>
            ) : (
              <p>Collect from store</p>
            )}
          </div>
        </div>

        <table className="w-full table-fixed border-collapse">
          <colgroup>
            <col />
            <col className="w-[22%]" />
            <col className="w-[10%]" />
            <col className="w-[24%]" />
          </colgroup>
          <thead>
            <tr className="border-y-2 border-black text-left font-extrabold">
              <th className="py-1.5">Item</th>
              <th className="whitespace-nowrap py-1.5 text-right">Price (Rs)</th>
              <th className="py-1.5 text-right">Qty</th>
              <th className="whitespace-nowrap py-1.5 text-right">Total (Rs)</th>
            </tr>
          </thead>
          <tbody>
            {o.items.map((i) => (
              <tr key={i.variantId} className="break-inside-avoid border-b border-black/60">
                <td className="py-1.5 pr-2">
                  <span className="font-bold">{i.productName}</span>
                  <span className="block text-[12px] font-medium">
                    {i.variantName}
                    {i.sku ? ` · ${i.sku}` : ''}
                  </span>
                </td>
                <td className="whitespace-nowrap py-1.5 text-right font-semibold tabular-nums">{n(i.price)}</td>
                <td className="py-1.5 text-right font-bold tabular-nums">{i.quantity}</td>
                <td className="whitespace-nowrap py-1.5 text-right font-bold tabular-nums">{n(i.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="ml-auto mt-3 w-full max-w-[17rem] space-y-0.5 break-inside-avoid">
          <Row label="Subtotal" value={n(o.totals.subTotal)} />
          {dec(o.totals.discount).gt(0) && <Row label="Discount" value={`− ${n(o.totals.discount)}`} />}
          {dec(o.totals.tax).gt(0) && <Row label="Tax" value={n(o.totals.tax)} />}
          <Row label="Shipping" value={n(o.totals.shipping)} />
          <div className="flex justify-between border-t-2 border-black pt-1 text-lg font-extrabold">
            <span>Total (Rs)</span>
            <span className="tabular-nums">{n(o.totals.total)}</span>
          </div>
          <Row label="Paid" value={n(o.totals.amountPaid)} />
          <div className="flex justify-between font-extrabold">
            <span>Balance due</span>
            <span className="tabular-nums">{n(o.totals.balance)}</span>
          </div>
        </div>
        <p className="mt-4 text-center font-semibold">Thank you for shopping with us.</p>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between font-semibold">
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
