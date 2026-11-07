import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle2, Search, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import { Can } from '@/components/Can';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader, CardTitle, EmptyState, PageHeader, Skeleton, StatusBadge, Table, TD, TH, THead, TR } from '@/components/ui/data';
import { Field, Input, Textarea } from '@/components/ui/form';
import { ConfirmDialog } from '@/components/ui/overlay';
import { useDebounce } from '@/hooks/use-debounce';
import { api } from '@/lib/api-client';
import { useAuth } from '@/lib/auth';
import { dateOnly, dec, money } from '@/lib/format';
import { toastError } from '@/lib/hooks';

interface ReceiptItem {
  id?: number;
  variantId: number;
  productName: string;
  variantName: string;
  sku: string | null;
  quantity: number;
  unitCost?: string;
  stockNow: number;
}
interface Receipt {
  id: number;
  date: string;
  supplierName: string | null;
  reference: string | null;
  note: string | null;
  status: string;
  shippingFee: string;
  discount: string;
  subTotal: string;
  total: string;
  receivedAt: string | null;
  createdBy: string | null;
  items: ReceiptItem[];
}
interface StockHit {
  variantId: number;
  productName: string;
  variantName: string;
  sku: string | null;
  stock: number;
  buyPrice?: string;
}
interface Line {
  variantId: number;
  name: string;
  stockNow: number;
  quantity: string;
  unitCost: string;
}

export default function ReceiptEditor() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { can } = useAuth();
  const [cancelOpen, setCancelOpen] = useState(false);

  const { data: receipt, isLoading, error } = useQuery({ queryKey: ['receipts', 'detail', id], queryFn: () => api.get<Receipt>(`/inventory/receipts/${id}`), enabled: !isNew });

  const [supplier, setSupplier] = useState('');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [shipping, setShipping] = useState('0');
  const [discount, setDiscount] = useState('0');
  const [lines, setLines] = useState<Line[]>([]);

  useEffect(() => {
    if (!receipt) return;
    setSupplier(receipt.supplierName ?? '');
    setReference(receipt.reference ?? '');
    setNote(receipt.note ?? '');
    setShipping(dec(receipt.shippingFee).toString());
    setDiscount(dec(receipt.discount).toString());
    setLines(receipt.items.map((i) => ({ variantId: i.variantId, name: `${i.productName} (${i.variantName})`, stockNow: i.stockNow, quantity: String(i.quantity), unitCost: dec(i.unitCost).toString() })));
  }, [receipt]);

  const editable = isNew || receipt?.status === 'draft';
  const canReceive = can('inventory.receive');

  const body = () => ({
    supplierName: supplier || null,
    reference: reference || null,
    note: note || null,
    shippingFee: shipping || '0',
    discount: discount || '0',
    items: lines.map((l) => ({ variantId: l.variantId, quantity: Number(l.quantity), unitCost: l.unitCost })),
  });
  const valid = lines.length > 0 && lines.every((l) => Number.isInteger(Number(l.quantity)) && Number(l.quantity) > 0 && /^\d+(\.\d{1,2})?$/.test(l.unitCost)) && /^\d+(\.\d{1,2})?$/.test(shipping || '0') && /^\d+(\.\d{1,2})?$/.test(discount || '0');
  const sub = lines.reduce((s, l) => s.plus(dec(l.unitCost).times(Number(l.quantity) || 0)), dec(0));
  const total = sub.plus(dec(shipping)).minus(dec(discount));

  const save = useMutation({
    mutationFn: () => (isNew ? api.post<Receipt>('/inventory/receipts', body()) : api.put<Receipt>(`/inventory/receipts/${id}`, body())),
    onSuccess: (r) => {
      toast.success('Receipt saved as draft');
      void qc.invalidateQueries({ queryKey: ['receipts'] });
      if (isNew) navigate(`/receipts/${r.id}`, { replace: true });
      else qc.setQueryData(['receipts', 'detail', id], r);
    },
    onError: (e) => toastError(e),
  });
  const receive = useMutation({
    mutationFn: async () => {
      if (!isNew) await api.put(`/inventory/receipts/${id}`, body()); // save the latest edits first
      return api.post<Receipt>(`/inventory/receipts/${id}/receive`);
    },
    onSuccess: (r) => {
      toast.success('Stock received and added');
      qc.setQueryData(['receipts', 'detail', id], r);
      void qc.invalidateQueries({ queryKey: ['receipts'] });
      void qc.invalidateQueries({ queryKey: ['inventory'] });
      void qc.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (e) => toastError(e),
  });
  const cancel = useMutation({
    mutationFn: () => api.post<Receipt>(`/inventory/receipts/${id}/cancel`),
    onSuccess: (r) => {
      toast.success(r.status === 'cancelled' ? 'Receipt cancelled' : 'Done');
      qc.setQueryData(['receipts', 'detail', id], r);
      void qc.invalidateQueries({ queryKey: ['receipts'] });
      void qc.invalidateQueries({ queryKey: ['inventory'] });
    },
    onError: (e) => toastError(e),
  });
  const remove = useMutation({
    mutationFn: () => api.del(`/inventory/receipts/${id}`),
    onSuccess: () => {
      toast.success('Draft deleted');
      void qc.invalidateQueries({ queryKey: ['receipts'] });
      navigate('/receipts', { replace: true });
    },
    onError: (e) => toastError(e),
  });

  if (!isNew && isLoading) return <Skeleton className="h-96" />;
  if (!isNew && (error || !receipt)) return <EmptyState title="Receipt not found" hint={(error as Error)?.message} action={<Link to="/receipts" className="font-semibold text-primary">Back to receipts</Link>} />;

  const showCost = can('cost.view') || isNew;

  return (
    <>
      <Link to="/receipts" className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Stock receipts
      </Link>
      <PageHeader
        title={isNew ? 'New stock receipt' : `Receipt #${id}`}
        subtitle={receipt ? `${dateOnly(receipt.date)}${receipt.receivedAt ? ` · received ${dateOnly(receipt.receivedAt)}` : ''} · by ${receipt.createdBy}` : 'List what arrived, then receive it to add it to stock.'}
        actions={
          <>
            {receipt && <StatusBadge status={receipt.status} />}
            {editable && canReceive && (
              <>
                {!isNew && (
                  <Button variant="outline" onClick={() => remove.mutate()} loading={remove.isPending}>
                    <Trash2 className="h-4 w-4" /> Delete draft
                  </Button>
                )}
                <Button variant="outline" loading={save.isPending} disabled={!valid} onClick={() => save.mutate()}>
                  Save draft
                </Button>
                {!isNew && (
                  <Button loading={receive.isPending} disabled={!valid} onClick={() => receive.mutate()}>
                    <CheckCircle2 className="h-4 w-4" /> Receive stock
                  </Button>
                )}
              </>
            )}
            {receipt && receipt.status !== 'cancelled' && (
              <Can permission="inventory.adjust">
                <Button variant="danger" onClick={() => setCancelOpen(true)}>
                  Cancel receipt
                </Button>
              </Can>
            )}
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Items</CardTitle>
            </CardHeader>
            {editable && <VariantPicker onPick={(h) => !lines.some((l) => l.variantId === h.variantId) && setLines([...lines, { variantId: h.variantId, name: `${h.productName} (${h.variantName})`, stockNow: h.stock, quantity: '1', unitCost: dec(h.buyPrice).toString() }])} />}
            {lines.length === 0 ? (
              <EmptyState title="No items yet" hint="Search above and click an item to add it." />
            ) : (
              <Table>
                <THead>
                  <tr>
                    <TH>Item</TH>
                    <TH className="text-right">In stock</TH>
                    <TH className="w-28 text-right">Quantity</TH>
                    {showCost && <TH className="w-32 text-right">Unit cost</TH>}
                    {showCost && <TH className="text-right">Total</TH>}
                    {editable && <TH />}
                  </tr>
                </THead>
                <tbody>
                  {lines.map((l, idx) => (
                    <TR key={l.variantId}>
                      <TD className="font-medium">{l.name}</TD>
                      <TD className="text-right tabular-nums text-muted">{l.stockNow}</TD>
                      <TD className="text-right">
                        {editable ? <Input aria-label="Quantity" inputMode="numeric" className="h-9 text-right" value={l.quantity} onChange={(e) => setLines(lines.map((x, i) => (i === idx ? { ...x, quantity: e.target.value } : x)))} /> : <span className="tabular-nums">{l.quantity}</span>}
                      </TD>
                      {showCost && (
                        <TD className="text-right">
                          {editable ? <Input aria-label="Unit cost" inputMode="decimal" className="h-9 text-right" value={l.unitCost} onChange={(e) => setLines(lines.map((x, i) => (i === idx ? { ...x, unitCost: e.target.value } : x)))} /> : <span className="tabular-nums">{money(l.unitCost)}</span>}
                        </TD>
                      )}
                      {showCost && <TD className="text-right tabular-nums">{money(dec(l.unitCost).times(Number(l.quantity) || 0).toString())}</TD>}
                      {editable && (
                        <TD>
                          <Button variant="ghost" size="icon" aria-label="Remove" onClick={() => setLines(lines.filter((_, i) => i !== idx))}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TD>
                      )}
                    </TR>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardBody className="space-y-4">
              <Field label="Supplier name" hint="Just a name, for your own reference">
                {(fid) => <Input id={fid} value={supplier} onChange={(e) => setSupplier(e.target.value)} disabled={!editable} maxLength={120} />}
              </Field>
              <Field label="Invoice / reference">{(fid) => <Input id={fid} value={reference} onChange={(e) => setReference(e.target.value)} disabled={!editable} maxLength={120} />}</Field>
              <Field label="Note">{(fid) => <Textarea id={fid} rows={2} value={note} onChange={(e) => setNote(e.target.value)} disabled={!editable} maxLength={1000} />}</Field>
              {showCost && (
                <>
                  <Field label="Shipping / freight (Rs)">{(fid) => <Input id={fid} inputMode="decimal" value={shipping} onChange={(e) => setShipping(e.target.value)} disabled={!editable} />}</Field>
                  <Field label="Discount (Rs)">{(fid) => <Input id={fid} inputMode="decimal" value={discount} onChange={(e) => setDiscount(e.target.value)} disabled={!editable} />}</Field>
                  <div className="space-y-1 border-t border-border pt-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted">Items</span>
                      <span className="tabular-nums">{money(sub.toString())}</span>
                    </div>
                    <div className="flex justify-between font-bold">
                      <span>Total</span>
                      <span className="tabular-nums">{money(total.toString())}</span>
                    </div>
                  </div>
                </>
              )}
            </CardBody>
          </Card>
          {editable && <p className="rounded bg-info/10 px-3 py-2 text-xs text-info">The cost of each item is averaged with what is already in stock when you receive it.</p>}
        </div>
      </div>

      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Cancel this receipt?"
        description={receipt?.status === 'received' ? 'The stock it added is taken back out. This fails if some of it has already been sold.' : 'The draft is marked cancelled.'}
        confirmLabel="Cancel receipt"
        danger
        onConfirm={() => cancel.mutateAsync()}
      />
    </>
  );
}

function VariantPicker({ onPick }: { onPick: (hit: StockHit) => void }) {
  const [q, setQ] = useState('');
  const debounced = useDebounce(q, 300);
  const { data } = useQuery({
    queryKey: ['inventory', 'picker', debounced],
    queryFn: () => api.list<StockHit>('/inventory/stock', { q: debounced, pageSize: 8 }),
    enabled: debounced.trim().length >= 2,
  });
  return (
    <div className="relative border-b border-border p-4">
      <Search className="pointer-events-none absolute left-7 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
      <Input className="pl-9" placeholder="Search a product, variant or SKU to add" value={q} onChange={(e) => setQ(e.target.value)} />
      {q.trim().length >= 2 && data && (
        <ul className="absolute inset-x-4 top-[62px] z-20 max-h-72 overflow-y-auto rounded-lg border border-border bg-surface shadow-lg">
          {data.items.length === 0 && <li className="px-4 py-3 text-sm text-muted">Nothing found</li>}
          {data.items.map((h) => (
            <li key={h.variantId}>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm hover:bg-soft"
                onClick={() => {
                  onPick(h);
                  setQ('');
                }}
              >
                <span>
                  <span className="font-semibold">{h.productName}</span> <span className="text-muted">({h.variantName})</span>
                </span>
                <span className="text-xs text-muted">{h.stock} in stock</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
