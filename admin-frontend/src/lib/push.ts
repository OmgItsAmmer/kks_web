import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { api } from '@/lib/api-client';

/**
 * Desktop alerts (Web Push). The browser asks the admin once for permission, then the API can pop a
 * system notification for a new order even while this tab is minimised. The service worker lives in
 * public/sw.js; the sender in kksonline-backend-express/src/services/push.service.ts.
 *
 * Status:
 *  - unsupported:  this browser cannot do push (or the page is not on https / localhost)
 *  - unconfigured: the server has no VAPID keys, so alerts are off for everyone
 *  - denied:       the admin blocked notifications for this site in the browser
 *  - off / on:     this browser is not / is subscribed
 */
export type PushStatus = 'unsupported' | 'unconfigured' | 'denied' | 'off' | 'on';

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/+$/, '') ?? '/api/v1';
const SW_URL = `/sw.js?api=${encodeURIComponent(API_BASE)}`;

export const pushSupported = (): boolean =>
  typeof window !== 'undefined' &&
  window.isSecureContext &&
  'serviceWorker' in navigator &&
  'PushManager' in window &&
  'Notification' in window;

let registration: Promise<ServiceWorkerRegistration> | null = null;
const getRegistration = (): Promise<ServiceWorkerRegistration> => {
  registration ??= navigator.serviceWorker.register(SW_URL, { scope: '/' }).then(() => navigator.serviceWorker.ready);
  return registration;
};

let publicKey: Promise<string | null> | null = null;
const getPublicKey = (): Promise<string | null> => {
  publicKey ??= api.get<{ publicKey: string | null }>('/push/config').then((r) => r.publicKey).catch((e) => {
    publicKey = null;
    throw e;
  });
  return publicKey;
};

const keyBytes = (base64Url: string): Uint8Array => {
  const b64 = (base64Url + '='.repeat((4 - (base64Url.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
};

const sameKey = (a: ArrayBuffer | null | undefined, b: Uint8Array): boolean => {
  if (!a) return false;
  const x = new Uint8Array(a);
  return x.length === b.length && x.every((v, i) => v === b[i]);
};

const save = (sub: PushSubscription) => api.post('/push/subscribe', sub.toJSON());

export async function getPushStatus(): Promise<PushStatus> {
  if (!pushSupported()) return 'unsupported';
  const key = await getPublicKey();
  if (!key) return 'unconfigured';
  if (Notification.permission === 'denied') return 'denied';
  const reg = await getRegistration();
  const sub = await reg.pushManager.getSubscription();
  return sub && Notification.permission === 'granted' ? 'on' : 'off';
}

/** Asks for permission (must run from a click), subscribes this browser and tells the server. */
export async function enablePush(): Promise<PushStatus> {
  if (!pushSupported()) return 'unsupported';
  const key = await getPublicKey();
  if (!key) return 'unconfigured';
  const permission = await Notification.requestPermission();
  if (permission === 'denied') return 'denied';
  if (permission !== 'granted') return 'off';
  const reg = await getRegistration();
  const bytes = keyBytes(key);
  let sub = await reg.pushManager.getSubscription();
  if (sub && !sameKey(sub.options.applicationServerKey, bytes)) {
    await sub.unsubscribe();
    sub = null;
  }
  sub ??= await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: bytes });
  await save(sub);
  return 'on';
}

export async function disablePush(): Promise<PushStatus> {
  if (!pushSupported()) return 'unsupported';
  const reg = await getRegistration();
  const sub = await reg.pushManager.getSubscription();
  if (sub) {
    await api.post('/push/unsubscribe', { endpoint: sub.endpoint }).catch(() => undefined);
    await sub.unsubscribe();
  }
  return 'off';
}

/**
 * On every app load: make sure the server still has this browser's subscription, under the admin
 * who is signed in now, and with the server's current key. Quietly does nothing if alerts are off.
 */
async function resyncPush(): Promise<void> {
  if (!pushSupported() || Notification.permission !== 'granted') return;
  const key = await getPublicKey();
  if (!key) return;
  const reg = await getRegistration();
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return;
  const bytes = keyBytes(key);
  if (sameKey(sub.options.applicationServerKey, bytes)) {
    await save(sub);
    return;
  }
  await sub.unsubscribe();
  await save(await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: bytes }));
}

export const PUSH_STATUS_KEY = ['push', 'status'] as const;

export const usePushStatus = () =>
  useQuery({ queryKey: PUSH_STATUS_KEY, queryFn: getPushStatus, staleTime: Infinity, retry: false });

/**
 * Mount once inside the signed-in shell. Re-syncs the subscription, and listens to the service worker:
 * a push refreshes the bell and order lists, and a notification click opens the right page in-app.
 */
export function usePushBridge(): void {
  const qc = useQueryClient();
  const navigate = useNavigate();

  useEffect(() => {
    if (!pushSupported()) return;
    resyncPush().catch(() => undefined);

    const onMessage = (event: MessageEvent) => {
      const data = event.data as { type?: string; url?: string } | null;
      if (data?.type === 'kks-push') {
        void qc.invalidateQueries({ queryKey: ['notifications'] });
        void qc.invalidateQueries({ queryKey: ['dashboard'] });
        void qc.invalidateQueries({ queryKey: ['orders'] });
      } else if (data?.type === 'kks-navigate' && typeof data.url === 'string' && data.url.startsWith('/')) {
        navigate(data.url);
      }
    };
    navigator.serviceWorker.addEventListener('message', onMessage);
    return () => navigator.serviceWorker.removeEventListener('message', onMessage);
  }, [qc, navigate]);
}
