import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ImagePlus, Pencil, Plus, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Can } from '@/components/Can';
import { Button } from '@/components/ui/button';
import { Badge, Card, EmptyState, PageHeader, Table, TableSkeleton, TD, TH, THead, Tabs, TabsContent, TabsList, TabsTrigger, TR } from '@/components/ui/data';
import { Field, Input, Switch } from '@/components/ui/form';
import { ConfirmDialog, Dialog } from '@/components/ui/overlay';
import { api } from '@/lib/api-client';
import { toastError } from '@/lib/hooks';
import type { Lookup } from './Products';

function LookupTable({ kind, label }: { kind: 'categories' | 'brands'; label: string }) {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: [kind], queryFn: () => api.get<Lookup[]>(`/${kind}`) });
  const [editing, setEditing] = useState<Lookup | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Lookup | null>(null);
  const [name, setName] = useState('');
  const [featured, setFeatured] = useState(false);
  const [verified, setVerified] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploadFor, setUploadFor] = useState<number | null>(null);

  const open = (item: Lookup | 'new') => {
    setEditing(item);
    setName(item === 'new' ? '' : item.name);
    setFeatured(item === 'new' ? false : item.isFeatured);
    setVerified(item === 'new' ? false : Boolean(item.extra.isVerified));
  };
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: [kind] });
    void qc.invalidateQueries({ queryKey: ['products'] });
  };
  const save = useMutation({
    mutationFn: () => {
      const body = { name: name.trim(), isFeatured: featured, ...(kind === 'brands' ? { isVerified: verified } : {}) };
      return editing === 'new' ? api.post(`/${kind}`, body) : api.patch(`/${kind}/${(editing as Lookup).id}`, body);
    },
    onSuccess: () => {
      toast.success(`${label} saved`);
      setEditing(null);
      refresh();
    },
    onError: (e) => toastError(e),
  });
  const del = useMutation({
    mutationFn: (id: number) => api.del(`/${kind}/${id}`),
    onSuccess: () => {
      toast.success(`${label} deleted`);
      refresh();
    },
    onError: (e) => toastError(e),
  });
  const upload = useMutation({
    mutationFn: ({ id, file }: { id: number; file: File }) => {
      const fd = new FormData();
      fd.append('file', file);
      return api.post(`/${kind}/${id}/image`, fd);
    },
    onSuccess: () => {
      toast.success('Picture updated');
      refresh();
    },
    onError: (e) => toastError(e),
  });

  return (
    <Card>
      <div className="flex items-center justify-between border-b border-border p-4">
        <p className="text-sm text-muted">{data?.length ?? 0} {kind}</p>
        <Can permission="catalog.write">
          <Button size="sm" onClick={() => open('new')}>
            <Plus className="h-4 w-4" /> Add {label.toLowerCase()}
          </Button>
        </Can>
      </div>
      <input
        ref={fileInput}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && uploadFor) upload.mutate({ id: uploadFor, file });
          e.target.value = '';
        }}
      />
      {isLoading ? (
        <TableSkeleton rows={5} cols={4} />
      ) : error ? (
        <EmptyState title={`Could not load ${kind}`} hint={(error as Error).message} />
      ) : !data || data.length === 0 ? (
        <EmptyState title={`No ${kind} yet`} />
      ) : (
        <Table>
          <THead>
            <tr>
              <TH>{label}</TH>
              <TH className="text-right">Products</TH>
              <TH>Flags</TH>
              <TH />
            </tr>
          </THead>
          <tbody>
            {data.map((l) => (
              <TR key={l.id}>
                <TD>
                  <div className="flex items-center gap-3">
                    {l.imageUrl ? <img src={l.imageUrl} alt="" className="h-10 w-10 rounded object-cover" loading="lazy" /> : <div className="h-10 w-10 rounded bg-soft" />}
                    <span className="font-semibold">{l.name}</span>
                  </div>
                </TD>
                <TD className="text-right tabular-nums">{l.productCount}</TD>
                <TD className="space-x-1">
                  {l.isFeatured && <Badge color="primary">Featured</Badge>}
                  {l.extra.isVerified && <Badge color="success">Verified</Badge>}
                </TD>
                <TD className="text-right">
                  <Can permission="catalog.write">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Change picture"
                      onClick={() => {
                        setUploadFor(l.id);
                        fileInput.current?.click();
                      }}
                    >
                      <ImagePlus className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" aria-label="Edit" onClick={() => open(l)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" aria-label="Delete" onClick={() => setDeleting(l)}>
                      <Trash2 className="h-4 w-4 text-danger" />
                    </Button>
                  </Can>
                </TD>
              </TR>
            ))}
          </tbody>
        </Table>
      )}
      <Dialog
        open={editing !== null}
        onOpenChange={(o) => !o && setEditing(null)}
        title={editing === 'new' ? `Add ${label.toLowerCase()}` : `Edit ${label.toLowerCase()}`}
        footer={
          <>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button loading={save.isPending} disabled={!name.trim()} onClick={() => save.mutate()}>
              Save
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Name">{(id) => <Input id={id} value={name} onChange={(e) => setName(e.target.value)} maxLength={120} autoFocus />}</Field>
          <Switch checked={featured} onChange={setFeatured} label="Featured on the home page" />
          {kind === 'brands' && <Switch checked={verified} onChange={setVerified} label="Verified brand" />}
        </div>
      </Dialog>
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Delete "${deleting?.name}"?`}
        description={deleting && deleting.productCount > 0 ? `${deleting.productCount} products use it. Move them to another ${label.toLowerCase()} first.` : 'This cannot be undone.'}
        confirmLabel="Delete"
        danger
        onConfirm={() => deleting && del.mutateAsync(deleting.id)}
      />
    </Card>
  );
}

export default function Lookups() {
  return (
    <>
      <PageHeader title="Categories & brands" subtitle="How products are grouped in the store" />
      <Tabs defaultValue="categories">
        <TabsList>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="brands">Brands</TabsTrigger>
        </TabsList>
        <TabsContent value="categories">
          <LookupTable kind="categories" label="Category" />
        </TabsContent>
        <TabsContent value="brands">
          <LookupTable kind="brands" label="Brand" />
        </TabsContent>
      </Tabs>
    </>
  );
}
