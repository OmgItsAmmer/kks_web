import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge, Card, CardBody, CardHeader, CardTitle, EmptyState, PageHeader, Skeleton, Table, TD, TH, THead, Tabs, TabsContent, TabsList, TabsTrigger, TR } from '@/components/ui/data';
import { Field, Input, Switch, Textarea } from '@/components/ui/form';
import { Dialog } from '@/components/ui/overlay';
import { api } from '@/lib/api-client';
import { dateOnly, num } from '@/lib/format';
import { toastError } from '@/lib/hooks';

interface Shop {
  shopname: string;
  taxrate: string;
  shipping_price: string;
  threshold_free_shipping: string | null;
  is_shipping_enable: boolean;
  max_allowed_item_quantity: number;
  is_advance_payment_receipt_mandatory: boolean;
}

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" subtitle="Owner only" />
      <Tabs defaultValue="shop">
        <TabsList>
          <TabsTrigger value="shop">Shop</TabsTrigger>
          <TabsTrigger value="versions">App versions</TabsTrigger>
          <TabsTrigger value="usage">Usage</TabsTrigger>
        </TabsList>
        <TabsContent value="shop">
          <ShopForm />
        </TabsContent>
        <TabsContent value="versions">
          <Versions />
        </TabsContent>
        <TabsContent value="usage">
          <Usage />
        </TabsContent>
      </Tabs>
    </>
  );
}

function ShopForm() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['settings', 'shop'], queryFn: () => api.get<Shop | null>('/settings/shop') });
  const [s, setS] = useState({ shopname: '', taxrate: '0', shipping_price: '0', threshold: '', ship: false, max: '50', receipt: true });
  useEffect(() => {
    if (!data) return;
    setS({ shopname: data.shopname, taxrate: data.taxrate, shipping_price: data.shipping_price, threshold: data.threshold_free_shipping ?? '', ship: data.is_shipping_enable, max: String(data.max_allowed_item_quantity), receipt: data.is_advance_payment_receipt_mandatory });
  }, [data]);
  const money = /^\d+(\.\d{1,2})?$/;
  const valid = s.shopname.trim() && money.test(s.taxrate) && Number(s.taxrate) <= 100 && money.test(s.shipping_price) && (s.threshold === '' || money.test(s.threshold)) && /^\d+$/.test(s.max) && Number(s.max) >= 1;
  const save = useMutation({
    mutationFn: () =>
      api.put('/settings/shop', {
        shopname: s.shopname.trim(),
        taxrate: s.taxrate,
        shipping_price: s.shipping_price,
        threshold_free_shipping: s.threshold === '' ? null : s.threshold,
        is_shipping_enable: s.ship,
        max_allowed_item_quantity: Number(s.max),
        is_advance_payment_receipt_mandatory: s.receipt,
      }),
    onSuccess: () => {
      toast.success('Settings saved. The store updates within a minute.');
      void qc.invalidateQueries({ queryKey: ['settings', 'shop'] });
    },
    onError: (e) => toastError(e),
  });
  if (isLoading) return <Skeleton className="h-80" />;
  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Shop settings</CardTitle>
      </CardHeader>
      <CardBody className="space-y-5">
        <Field label="Shop name">{(id) => <Input id={id} value={s.shopname} onChange={(e) => setS({ ...s, shopname: e.target.value })} maxLength={120} />}</Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Tax rate (%)" hint="0 to 100" error={s.taxrate && (!money.test(s.taxrate) || Number(s.taxrate) > 100) ? 'Enter 0 to 100' : undefined}>
            {(id) => <Input id={id} inputMode="decimal" value={s.taxrate} onChange={(e) => setS({ ...s, taxrate: e.target.value })} />}
          </Field>
          <Field label="Max quantity per item in one order">{(id) => <Input id={id} inputMode="numeric" value={s.max} onChange={(e) => setS({ ...s, max: e.target.value })} />}</Field>
        </div>
        <Switch checked={s.ship} onChange={(v) => setS({ ...s, ship: v })} label="Charge shipping" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Shipping price (Rs)">{(id) => <Input id={id} inputMode="decimal" value={s.shipping_price} onChange={(e) => setS({ ...s, shipping_price: e.target.value })} disabled={!s.ship} />}</Field>
          <Field label="Free shipping above (Rs)" hint="Leave empty for never free">
            {(id) => <Input id={id} inputMode="decimal" value={s.threshold} onChange={(e) => setS({ ...s, threshold: e.target.value })} disabled={!s.ship} />}
          </Field>
        </div>
        <Switch checked={s.receipt} onChange={(v) => setS({ ...s, receipt: v })} label="Require a payment receipt for advance payments" />
        <Button loading={save.isPending} disabled={!valid} onClick={() => save.mutate()}>
          Save settings
        </Button>
      </CardBody>
    </Card>
  );
}

interface Version {
  id: number;
  version: string;
  force_update: boolean;
  app_locked: boolean;
  redirect_url: string;
  description: string | null;
  created_at: string | null;
}

function Versions() {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: ['settings', 'versions'], queryFn: () => api.get<Version[]>('/settings/app-versions') });
  const [open, setOpen] = useState(false);
  const [v, setV] = useState({ version: '', url: '', description: '', force: false, locked: false });
  const create = useMutation({
    mutationFn: () => api.post('/settings/app-versions', { version: v.version.trim(), redirect_url: v.url.trim(), description: v.description.trim() || null, force_update: v.force, app_locked: v.locked }),
    onSuccess: () => {
      toast.success('Version added');
      setOpen(false);
      setV({ version: '', url: '', description: '', force: false, locked: false });
      void qc.invalidateQueries({ queryKey: ['settings', 'versions'] });
    },
    onError: (e) => toastError(e),
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle>App versions</CardTitle>
        <Button size="sm" onClick={() => setOpen(true)}>
          Add version
        </Button>
      </CardHeader>
      {isLoading ? (
        <Skeleton className="m-5 h-40" />
      ) : error ? (
        <EmptyState title="Could not load versions" hint={(error as Error).message} />
      ) : !data || data.length === 0 ? (
        <EmptyState title="No versions" hint="Used to tell installed apps when an update is required." />
      ) : (
        <Table>
          <THead>
            <tr>
              <TH>Version</TH>
              <TH>Added</TH>
              <TH>Flags</TH>
              <TH>Link</TH>
            </tr>
          </THead>
          <tbody>
            {data.map((r) => (
              <TR key={r.id}>
                <TD className="font-semibold">{r.version}</TD>
                <TD>{dateOnly(r.created_at)}</TD>
                <TD className="space-x-1">
                  {r.force_update && <Badge color="warning">Force update</Badge>}
                  {r.app_locked && <Badge color="danger">Locked</Badge>}
                </TD>
                <TD className="max-w-xs truncate text-muted">{r.redirect_url}</TD>
              </TR>
            ))}
          </tbody>
        </Table>
      )}
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Add an app version"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button loading={create.isPending} disabled={!v.version.trim() || !/^https?:\/\//.test(v.url)} onClick={() => create.mutate()}>
              Add
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Version">{(id) => <Input id={id} value={v.version} onChange={(e) => setV({ ...v, version: e.target.value })} placeholder="1.2.0" />}</Field>
          <Field label="Download link">{(id) => <Input id={id} value={v.url} onChange={(e) => setV({ ...v, url: e.target.value })} placeholder="https://" />}</Field>
          <Field label="What changed">{(id) => <Textarea id={id} rows={2} value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} />}</Field>
          <Switch checked={v.force} onChange={(x) => setV({ ...v, force: x })} label="Force users to update" />
          <Switch checked={v.locked} onChange={(x) => setV({ ...v, locked: x })} label="Lock the app" />
        </div>
      </Dialog>
    </Card>
  );
}

interface UsageData {
  database: { bytes: number; limitBytes: number; percent: number };
  largestTables: { name: string; bytes: number; rows: number }[];
}
const mb = (b: number) => `${(b / 1024 / 1024).toFixed(1)} MB`;

function Usage() {
  const { data, isLoading, error } = useQuery({ queryKey: ['settings', 'usage'], queryFn: () => api.get<UsageData>('/settings/usage') });
  if (isLoading) return <Skeleton className="h-60" />;
  if (error || !data) return <EmptyState title="Could not load usage" hint={(error as Error)?.message} />;
  const pct = Math.min(100, data.database.percent);
  return (
    <div className="space-y-6">
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Database size</CardTitle>
          <span className="text-sm text-muted">
            {mb(data.database.bytes)} of {mb(data.database.limitBytes)} on the free plan
          </span>
        </CardHeader>
        <CardBody>
          <div className="h-3 overflow-hidden rounded-full bg-soft">
            <div className={`h-full rounded-full ${pct >= 80 ? 'bg-danger' : pct >= 60 ? 'bg-warning' : 'bg-success'}`} style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-2 text-sm text-muted">{data.database.percent}% used. You get a notification at 80%.</p>
        </CardBody>
      </Card>
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Largest tables</CardTitle>
        </CardHeader>
        <Table>
          <THead>
            <tr>
              <TH>Table</TH>
              <TH className="text-right">Rows</TH>
              <TH className="text-right">Size</TH>
            </tr>
          </THead>
          <tbody>
            {data.largestTables.map((t) => (
              <TR key={t.name}>
                <TD className="font-medium">{t.name}</TD>
                <TD className="text-right tabular-nums">{num(t.rows)}</TD>
                <TD className="text-right tabular-nums">{mb(t.bytes)}</TD>
              </TR>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
