import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CreditCard, Pencil, Printer, XCircle } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { toast } from 'sonner';
import { Can } from '@/components/Can';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader, CardTitle, EmptyState, PageHeader, Skeleton, StatusBadge, Table, TD, TH, THead, TR } from '@/components/ui/data';
import { Field, Input, Select, Textarea } from '@/components/ui/form';
import { ConfirmDialog, Dialog } from '@/components/ui/overlay';
import { api } from '@/lib/api-client';
import { useAuth } from '@/lib/auth';
import { dateOnly, dateTime, dec, money, statusLabel } from '@/lib/format';
import { toastError } from '@/lib/hooks';
import { PAYMENT_METHODS, methodLabel } from './Orders';

interface Item {
  productId: number;
  variantId: number;
  productName: string;
  variantName: string;
  sku: string | null;
  imageUrl: string | null;
  quantity: number;
  price: string;
  lineTotal: string;
  totalBuyPrice?: string;
  stockNow: number | null;
}
export interface OrderFull {
  id: number;
  date: string;
  createdAt: string;
  updatedAt: string;
  status: string;
  nextStatuses: string[];
  itemsEditable: boolean;
  cancelReason: string | null;
  adminNote: string | null;
  paymentMethod: string | null;
  shippingMethod: string | null;
  receiptUrl: string | null;
  customer: { id: number; name: string; phone: string | null; email: string } | null;
  shippingAddress: { fullName: string; phone: string | null; address: string | null; city: string | null; postalCode: string | null; country: string | null } | null;
  items: Item[];
  totals: { subTotal: string; tax: string; shipping: string; discount: string; total: string; amountPaid: string; balance: string; cost?: string | null; profit?: string | null };
  payments: { id: number; amount: string; method: string; reference: string | null; note: string | null; receivedBy: string | null; createdAt: string }[];
  history: { id: number; from: string | null; to: string; note: string | null; actor: string | null; createdAt: string }[];
}

const ACTION_LABEL: Record<string, string> = {
  confirmed: 'Confirm order',
  processing: 'Start processing',
  ready: 'Mark ready',
  delivered: 'Mark delivered',
  completed: 'Complete order',
};

export default function OrderDetail() {
  const { id } = useParams();
  const { can } = useAuth();
  const qc = useQueryClient();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const { data: order, isLoading, error } = useQuery({ queryKey: ['orders', 'detail', id], queryFn: () => api.get<OrderFull>(`/orders/${id}`) });

  const refresh = (o: OrderFull) => {
    qc.setQueryData(['orders', 'detail', id], o);
    void qc.invalidateQueries({ queryKey: ['orders'], exact: false });
    void qc.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const move = useMutation({
    mutationFn: (v: { to: string; note?: string }) => api.post<OrderFull>(`/orders/${id}/transition`, { ...v, expectedUpdatedAt: order?.updatedAt }),
    onSuccess: (o) => {
      refresh(o);
      toast.success(`Order is now ${statusLabel(o.status).toLowerCase()}`);
    },
    onError: (e) => {
      toastError(e);
      void qc.invalidateQueries({ queryKey: ['orders', 'detail', id] });
    },
  });

  if (isLoading) return <Skeleton className="h-96" />;
  if (error || !order) return <EmptyState title="Order not found" hint={(error as Error)?.message} action={<Link to="/orders" className="font-semibold text-primary">Back to orders</Link>} />;

  const forward = order.nextStatuses.filter((s) => s !== 'cancelled');
  const canCancel = order.nextStatuses.includes('cancelled') && can('orders.cancel');
  const final = order.status === 'completed' || order.status === 'cancelled';
  const showCost = order.totals.cost !== undefined;

  return (
    <>
      <Link to="/orders" className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-foreground no-print">
        <ArrowLeft className="h-4 w-4" /> Orders
      </Link>
      <PageHeader
        title={`Order #${order.id}`}
        subtitle={`Placed ${dateTime(order.createdAt)}`}
        actions={
          <>
            <StatusBadge status={order.status} />
            <Link to={`/orders/${order.id}/invoice`} target="_blank">
              <Button variant="outline" size="sm">
                <Printer className="h-4 w-4" /> Invoice
              </Button>
            </Link>
            {!final &&
              forward.map((s, i) => (
                <Button key={s} size="sm" variant={i === 0 ? 'primary' : 'soft'} loading={move.isPending && move.variables?.to === s} onClick={() => move.mutate({ to: s })}>
                  {ACTION_LABEL[s] ?? statusLabel(s)}
                </Button>
              ))}
            {canCancel && (
              <Button size="sm" variant="danger" onClick={() => setCancelOpen(true)}>
                <XCircle className="h-4 w-4" /> Cancel order
              </Button>
            )}
          </>
        }
      />

      {order.status === 'cancelled' && (
        <div className="mb-4 rounded bg-danger/10 px-4 py-3 text-sm text-danger">
          <strong>Cancelled.</strong> {order.cancelReason} The items were returned to stock.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Items</CardTitle>
              {order.itemsEditable && can('orders.payment') && (
                <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
                  <Pencil className="h-4 w-4" /> Edit items
                </Button>
              )}
            </CardHeader>
            <Table>
              <THead>
                <tr>
                  <TH>Product</TH>
                  <TH className="text-right">Price</TH>
                  <TH className="text-right">Qty</TH>
                  <TH className="text-right">Total</TH>
                </tr>
              </THead>
              <tbody>
                {order.items.map((i) => (
                  <TR key={i.variantId}>
                    <TD>
                      <div className="flex items-center gap-3">
                        {i.imageUrl ? <img src={i.imageUrl} alt="" className="h-11 w-11 rounded object-cover" loading="lazy" /> : <div className="h-11 w-11 rounded bg-soft" />}
                        <div className="min-w-0">
                          <Link to={`/products/${i.productId}`} className="font-semibold hover:text-primary">
                            {i.productName}
                          </Link>
                          <div className="text-xs text-muted">
                            {i.variantName}
                            {i.sku ? ` · ${i.sku}` : ''}
                          </div>
                        </div>
                      </div>
                    </TD>
                    <TD className="text-right tabular-nums">{money(i.price)}</TD>
                    <TD className="text-right tabular-nums">{i.quantity}</TD>
                    <TD className="text-right font-semibold tabular-nums">{money(i.lineTotal)}</TD>
                  </TR>
                ))}
              </tbody>
            </Table>
            <CardBody className="ml-auto max-w-xs space-y-1.5 text-sm">
              <Row label="Subtotal" value={money(order.totals.subTotal)} />
              {dec(order.totals.discount).gt(0) && <Row label="Discount" value={`− ${money(order.totals.discount)}`} />}
              {dec(order.totals.tax).gt(0) && <Row label="Tax" value={money(order.totals.tax)} />}
              <Row label="Shipping" value={money(order.totals.shipping)} />
              <div className="border-t border-border pt-2">
                <Row label="Total" value={money(order.totals.total)} bold />
              </div>
              <Row label="Paid" value={money(order.totals.amountPaid)} />
              <Row label="Balance due" value={money(order.totals.balance)} bold />
              {showCost && order.totals.profit != null && <Row label="Estimated profit" value={money(order.totals.profit)} />}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payments</CardTitle>
              <Can permission="orders.payment">
                {order.status !== 'cancelled' && dec(order.totals.balance).gt(0) && (
                  <Button size="sm" variant="outline" onClick={() => setPayOpen(true)}>
                    <CreditCard className="h-4 w-4" /> Record payment
                  </Button>
                )}
              </Can>
            </CardHeader>
            {order.payments.length === 0 ? (
              <p className="px-5 py-6 text-sm text-muted">No payment recorded yet. Method chosen by the customer: {methodLabel(order.paymentMethod)}.</p>
            ) : (
              <Table>
                <THead>
                  <tr>
                    <TH>Date</TH>
                    <TH>Method</TH>
                    <TH>Reference</TH>
                    <TH>Recorded by</TH>
                    <TH className="text-right">Amount</TH>
                  </tr>
                </THead>
                <tbody>
                  {order.payments.map((p) => (
                    <TR key={p.id}>
                      <TD>{dateTime(p.createdAt)}</TD>
                      <TD>{methodLabel(p.method)}</TD>
                      <TD>{p.reference ?? '—'}</TD>
                      <TD className="text-muted">{p.receivedBy}</TD>
                      <TD className="text-right font-semibold tabular-nums">{money(p.amount)}</TD>
                    </TR>
                  ))}
                </tbody>
              </Table>
            )}
            {order.receiptUrl && (
              <CardBody className="border-t border-border">
                <p className="mb-2 text-sm font-semibold">Payment receipt uploaded by the customer</p>
                <a href={order.receiptUrl} target="_blank" rel="noreferrer">
                  <img src={order.receiptUrl} alt="Payment receipt" className="max-h-64 rounded border border-border" />
                </a>
              </CardBody>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Customer</CardTitle>
            </CardHeader>
            <CardBody className="space-y-1 text-sm">
              {order.customer ? (
                <>
                  <Link to={`/customers/${order.customer.id}`} className="font-semibold text-primary hover:underline">
                    {order.customer.name}
                  </Link>
                  <p>{order.customer.phone}</p>
                  <p className="text-muted">{order.customer.email}</p>
                </>
              ) : (
                <p className="text-muted">Guest</p>
              )}
            </CardBody>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{order.shippingMethod === 'pickup' ? 'Pickup' : 'Ship to'}</CardTitle>
            </CardHeader>
            <CardBody className="space-y-0.5 text-sm">
              {order.shippingAddress ? (
                <>
                  <p className="font-semibold">{order.shippingAddress.fullName}</p>
                  <p>{order.shippingAddress.phone}</p>
                  <p>{order.shippingAddress.address}</p>
                  <p>{[order.shippingAddress.city, order.shippingAddress.postalCode].filter(Boolean).join(', ')}</p>
                </>
              ) : (
                <p className="text-muted">No address (pickup).</p>
              )}
            </CardBody>
          </Card>
          <NoteCard order={order} onSaved={refresh} />
          <Card>
            <CardHeader>
              <CardTitle>History</CardTitle>
            </CardHeader>
            <CardBody>
              <ol className="relative space-y-4 border-l border-border pl-5">
                <li className="relative">
                  <span className="absolute -left-[26px] top-1 h-3 w-3 rounded-full bg-border" />
                  <p className="text-sm font-semibold">Placed by customer</p>
                  <p className="text-xs text-muted">{dateTime(order.createdAt)}</p>
                </li>
                {order.history.map((h) => (
                  <li key={h.id} className="relative">
                    <span className="absolute -left-[26px] top-1 h-3 w-3 rounded-full bg-primary" />
                    <p className="text-sm font-semibold">{statusLabel(h.to)}</p>
                    <p className="text-xs text-muted">
                      {dateTime(h.createdAt)} · {h.actor}
                    </p>
                    {h.note && <p className="mt-0.5 text-sm">{h.note}</p>}
                  </li>
                ))}
              </ol>
              <p className="mt-4 text-xs text-muted">Order date {dateOnly(order.date)}</p>
            </CardBody>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title={`Cancel order #${order.id}?`}
        description="All items go back into stock. This cannot be undone: a cancelled order is never reopened."
        confirmLabel="Cancel the order"
        danger
        reasonLabel="Reason (kept in the order history)"
        onConfirm={(reason) => move.mutateAsync({ to: 'cancelled', note: reason })}
      />
      <PaymentDialog open={payOpen} onOpenChange={setPayOpen} order={order} onSaved={refresh} />
      <EditItemsDialog open={editOpen} onOpenChange={setEditOpen} order={order} onSaved={refresh} />
    </>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between gap-6 ${bold ? 'font-bold' : ''}`}>
      <span className={bold ? '' : 'text-muted'}>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

function NoteCard({ order, onSaved }: { order: OrderFull; onSaved: (o: OrderFull) => void }) {
  const [note, setNote] = useState(order.adminNote ?? '');
  const save = useMutation({
    mutationFn: () => api.patch<OrderFull>(`/orders/${order.id}/note`, { note }),
    onSuccess: (o) => {
      onSaved(o);
      toast.success('Note saved');
    },
    onError: (e) => toastError(e),
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle>Internal note</CardTitle>
      </CardHeader>
      <CardBody className="space-y-3">
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Only staff can see this" maxLength={1000} />
        <Button size="sm" variant="outline" onClick={() => save.mutate()} loading={save.isPending} disabled={note === (order.adminNote ?? '')}>
          Save note
        </Button>
      </CardBody>
    </Card>
  );
}

function PaymentDialog({ open, onOpenChange, order, onSaved }: { open: boolean; onOpenChange: (o: boolean) => void; order: OrderFull; onSaved: (o: OrderFull) => void }) {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState(order.paymentMethod ?? 'cod');
  const [reference, setReference] = useState('');
  const save = useMutation({
    mutationFn: () => api.post<OrderFull>(`/orders/${order.id}/payments`, { amount, method, reference: reference || undefined }),
    onSuccess: (o) => {
      onSaved(o);
      onOpenChange(false);
      setAmount('');
      setReference('');
      toast.success('Payment recorded');
    },
    onError: (e) => toastError(e),
  });
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Record a payment"
      description={`Balance due: ${money(order.totals.balance)}`}
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button loading={save.isPending} disabled={!/^\d+(\.\d{1,2})?$/.test(amount) || Number(amount) <= 0} onClick={() => save.mutate()}>
            Save payment
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Amount (Rs)">{(id) => <Input id={id} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={dec(order.totals.balance).toString()} autoFocus />}</Field>
        <Field label="Method">
          {(id) => (
            <Select id={id} value={method} onChange={(e) => setMethod(e.target.value)}>
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {methodLabel(m)}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Reference" hint="Optional: transaction number, receipt number">
          {(id) => <Input id={id} value={reference} onChange={(e) => setReference(e.target.value)} maxLength={120} />}
        </Field>
      </div>
    </Dialog>
  );
}

function EditItemsDialog({ open, onOpenChange, order, onSaved }: { open: boolean; onOpenChange: (o: boolean) => void; order: OrderFull; onSaved: (o: OrderFull) => void }) {
  const [rows, setRows] = useState(() => order.items.map((i) => ({ variantId: i.variantId, name: `${i.productName} (${i.variantName})`, quantity: String(i.quantity), price: dec(i.price).toString() })));
  const save = useMutation({
    mutationFn: () =>
      api.put<OrderFull>(`/orders/${order.id}/items`, {
        items: rows.map((r) => ({ variantId: r.variantId, quantity: Number(r.quantity), price: r.price })),
        expectedUpdatedAt: order.updatedAt,
      }),
    onSuccess: (o) => {
      onSaved(o);
      onOpenChange(false);
      toast.success('Order items updated and stock adjusted');
    },
    onError: (e) => toastError(e),
  });
  const valid = rows.length > 0 && rows.every((r) => Number.isInteger(Number(r.quantity)) && Number(r.quantity) >= 1 && /^\d+(\.\d{1,2})?$/.test(r.price));
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      wide
      title="Edit items"
      description="Stock is adjusted automatically by the difference. The total is recalculated by the server."
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button loading={save.isPending} disabled={!valid} onClick={() => save.mutate()}>
            Save changes
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        {rows.map((r, idx) => (
          <div key={r.variantId} className="grid grid-cols-[1fr_88px_120px_auto] items-center gap-2">
            <span className="truncate text-sm font-medium">{r.name}</span>
            <Input aria-label="Quantity" inputMode="numeric" value={r.quantity} onChange={(e) => setRows(rows.map((x, i) => (i === idx ? { ...x, quantity: e.target.value } : x)))} />
            <Input aria-label="Unit price" inputMode="decimal" value={r.price} onChange={(e) => setRows(rows.map((x, i) => (i === idx ? { ...x, price: e.target.value } : x)))} />
            <Button variant="ghost" size="sm" disabled={rows.length === 1} onClick={() => setRows(rows.filter((_, i) => i !== idx))}>
              Remove
            </Button>
          </div>
        ))}
      </div>
    </Dialog>
  );
}
