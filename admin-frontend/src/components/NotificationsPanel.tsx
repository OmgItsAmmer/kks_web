import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck, PackageX, ShoppingBag, TriangleAlert } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { api } from '@/lib/api-client';
import { ago } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/overlay';
import { EmptyState } from '@/components/ui/data';

interface Latest {
  latestId: number;
  unread: number;
}
interface Notification {
  id: number;
  type: string | null;
  title: string | null;
  detail: string | null;
  isRead: boolean;
  createdAt: string;
  orderId: number | null;
  productId: number | null;
}

const POLL_MS = 30_000;
const PAUSE_AFTER_MS = 15 * 60 * 1000;

/**
 * The bell. It checks one tiny endpoint every 30 s, but only while this tab is visible and the person
 * has touched the page in the last 15 minutes (plan 7.3). The server answers from memory, so this never
 * wakes the sleeping database. The full list loads only when the newest id changes.
 */
export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const lastActivity = useRef(Date.now());
  const seenId = useRef<number | null>(null);

  useEffect(() => {
    const touch = () => {
      lastActivity.current = Date.now();
    };
    const events = ['mousemove', 'keydown', 'click', 'touchstart'] as const;
    events.forEach((e) => window.addEventListener(e, touch, { passive: true }));
    return () => events.forEach((e) => window.removeEventListener(e, touch));
  }, []);

  const latest = useQuery({
    queryKey: ['notifications', 'latest'],
    queryFn: () => api.get<Latest>('/notifications/latest'),
    refetchInterval: () => (document.visibilityState === 'visible' && Date.now() - lastActivity.current < PAUSE_AFTER_MS ? POLL_MS : false),
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    const id = latest.data?.latestId;
    if (id === undefined) return;
    if (seenId.current !== null && id > seenId.current) {
      toast.info('New notification', { description: 'Open the bell to see it.' });
      void qc.invalidateQueries({ queryKey: ['notifications', 'list'] });
      void qc.invalidateQueries({ queryKey: ['dashboard'] });
      void qc.invalidateQueries({ queryKey: ['orders'] });
    }
    seenId.current = id;
  }, [latest.data?.latestId, qc]);

  const list = useQuery({
    queryKey: ['notifications', 'list'],
    queryFn: () => api.list<Notification>('/notifications', { pageSize: 30 }),
    enabled: open,
  });
  const markAll = useMutation({
    mutationFn: () => api.post('/notifications/read', { all: true }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const unread = latest.data?.unread ?? 0;
  return (
    <>
      <Button variant="ghost" size="icon" className="relative" onClick={() => setOpen(true)} aria-label={`Notifications, ${unread} unread`}>
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </Button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Notifications"
        footer={
          <Button variant="outline" size="sm" onClick={() => markAll.mutate()} loading={markAll.isPending} disabled={unread === 0}>
            <CheckCheck className="h-4 w-4" /> Mark all as read
          </Button>
        }
      >
        {list.isLoading ? (
          <p className="py-8 text-center text-sm text-muted">Loading…</p>
        ) : !list.data || list.data.items.length === 0 ? (
          <EmptyState title="Nothing new" hint="New orders and low-stock alerts show up here." />
        ) : (
          <ul className="-mx-2 divide-y divide-border">
            {list.data.items.map((n) => {
              const Icon = n.type === 'new_order' ? ShoppingBag : n.type === 'low_stock' ? PackageX : TriangleAlert;
              const to = n.orderId ? `/orders/${n.orderId}` : n.productId ? `/products/${n.productId}` : null;
              const body = (
                <div className="flex gap-3 px-2 py-3">
                  <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${n.isRead ? 'text-muted' : 'text-primary'}`} />
                  <div className="min-w-0">
                    <p className={`text-sm ${n.isRead ? '' : 'font-semibold'}`}>{n.title}</p>
                    {n.detail && <p className="text-xs text-muted">{n.detail}</p>}
                    <p className="mt-0.5 text-xs text-muted">{ago(n.createdAt)}</p>
                  </div>
                </div>
              );
              return (
                <li key={n.id}>
                  {to ? (
                    <Link to={to} onClick={() => setOpen(false)} className="block rounded hover:bg-soft">
                      {body}
                    </Link>
                  ) : (
                    body
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Dialog>
    </>
  );
}
