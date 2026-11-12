import { useMutation, useQueryClient } from '@tanstack/react-query';
import { BellRing, BellOff, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api-client';
import { toastError } from '@/lib/hooks';
import { disablePush, enablePush, PUSH_STATUS_KEY, type PushStatus, usePushStatus } from '@/lib/push';

const DISMISS_KEY = 'kks.desktopAlerts.dismissedUntil';
const DISMISS_DAYS = 7;

const readDismissed = (): boolean => {
  try {
    return Number(localStorage.getItem(DISMISS_KEY) ?? 0) > Date.now();
  } catch {
    return false;
  }
};

function useTogglePush() {
  const qc = useQueryClient();
  const set = (s: PushStatus) => qc.setQueryData(PUSH_STATUS_KEY, s);
  const enable = useMutation({
    mutationFn: enablePush,
    onSuccess: async (s) => {
      set(s);
      if (s === 'on') {
        toast.success('Desktop alerts are on', { description: 'Sending a test alert now.' });
        await api.post('/push/test').catch(() => undefined);
      } else if (s === 'denied') {
        toast.error('Notifications are blocked for this site', { description: 'Allow them from the lock icon in the address bar, then try again.' });
      }
    },
    onError: (e) => toastError(e),
  });
  const disable = useMutation({
    mutationFn: disablePush,
    onSuccess: (s) => {
      set(s);
      toast.success('Desktop alerts are off on this computer');
    },
    onError: (e) => toastError(e),
  });
  const test = useMutation({
    mutationFn: () => api.post<{ delivered: number }>('/push/test'),
    onSuccess: (r) =>
      r.delivered > 0
        ? toast.success('Test alert sent', { description: 'It should pop up in the corner of your screen.' })
        : toast.error('No alert was delivered', { description: 'Turn alerts off and on again on this computer.' }),
    onError: (e) => toastError(e),
  });
  return { enable, disable, test };
}

/** A one-line nudge at the top of the app until alerts are on (or dismissed for a week). */
export function DesktopAlertsBanner() {
  const { data: status } = usePushStatus();
  const [dismissed, setDismissed] = useState(readDismissed);
  const { enable } = useTogglePush();
  if (status !== 'off' || dismissed) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now() + DISMISS_DAYS * 24 * 3600 * 1000));
    } catch {
      /* private mode: just hide it for now */
    }
    setDismissed(true);
  };

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 rounded border border-primary/30 bg-primary/5 px-4 py-3 no-print">
      <BellRing className="h-5 w-5 shrink-0 text-primary" />
      <p className="min-w-0 flex-1 text-sm">
        <span className="font-semibold">Turn on desktop alerts</span>
        <span className="text-muted"> so new orders pop up on this computer, even when the admin panel is minimised.</span>
      </p>
      <Button size="sm" onClick={() => enable.mutate()} loading={enable.isPending}>
        Turn on
      </Button>
      <Button variant="ghost" size="icon" onClick={dismiss} aria-label="Not now">
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

/** The on/off switch shown inside the notifications dialog. */
export function DesktopAlertsControl() {
  const { data: status, isLoading } = usePushStatus();
  const { enable, disable, test } = useTogglePush();
  if (isLoading || !status || status === 'unsupported') return null;

  const text: Record<Exclude<PushStatus, 'unsupported'>, string> = {
    on: 'On for this computer. New orders, cancellations and low stock pop up even when this tab is minimised.',
    off: 'Off. Turn on to get a pop-up for every new order, even when this tab is minimised.',
    denied: 'Blocked by the browser. Click the lock icon in the address bar, set Notifications to Allow, then reload.',
    unconfigured: 'Not set up on the server yet (VAPID keys missing).',
  };

  return (
    <div className="mb-3 flex flex-wrap items-center gap-3 rounded border border-border bg-soft px-3 py-2.5">
      {status === 'on' ? <BellRing className="h-5 w-5 shrink-0 text-primary" /> : <BellOff className="h-5 w-5 shrink-0 text-muted" />}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">Desktop alerts</p>
        <p className="text-xs text-muted">{text[status]}</p>
      </div>
      {status === 'off' && (
        <Button size="sm" onClick={() => enable.mutate()} loading={enable.isPending}>
          Turn on
        </Button>
      )}
      {status === 'on' && (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => test.mutate()} loading={test.isPending}>
            Send test
          </Button>
          <Button variant="ghost" size="sm" onClick={() => disable.mutate()} loading={disable.isPending}>
            Turn off
          </Button>
        </div>
      )}
    </div>
  );
}
