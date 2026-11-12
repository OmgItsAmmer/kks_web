/* KKS admin service worker: desktop alerts only (no offline caching).
 *
 * The API pushes urgent events (new order, cancellation, low stock) through the browser's push
 * service. This worker shows them as system notifications even when the admin tab is minimised or
 * in the background, and clicking one brings the admin tab forward on the right page.
 * Server side: kksonline-backend-express/src/services/push.service.ts
 */

const API_BASE = new URL(self.location.href).searchParams.get('api') || '/api/v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let msg = {};
  try {
    msg = event.data ? event.data.json() : {};
  } catch {
    msg = { title: event.data ? event.data.text() : 'KKS admin' };
  }
  const title = msg.title || 'KKS admin';
  const options = {
    body: msg.body || '',
    tag: msg.tag || msg.kind || 'kks-admin',
    renotify: true,
    requireInteraction: Boolean(msg.sticky),
    icon: '/notification-icon.png',
    badge: '/notification-badge.png',
    timestamp: msg.sentAt || Date.now(),
    data: { url: msg.url || '/', kind: msg.kind },
    actions: msg.kind === 'new_order' ? [{ action: 'open', title: 'Open order' }] : [],
  };
  event.waitUntil(
    Promise.all([
      self.registration.showNotification(title, options),
      // Let any open admin tab refresh its bell and order list right away.
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((tabs) => tabs.forEach((t) => t.postMessage({ type: 'kks-push', kind: msg.kind }))),
    ]),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const path = (event.notification.data && event.notification.data.url) || '/';
  const target = new URL(path, self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (tabs) => {
      const tab = tabs.find((t) => new URL(t.url).origin === self.location.origin);
      if (tab) {
        await tab.focus();
        // In-app navigation (no reload); the app listens for this in usePushBridge.
        tab.postMessage({ type: 'kks-navigate', url: path });
        return;
      }
      await self.clients.openWindow(target);
    }),
  );
});

// The browser occasionally rotates a subscription. Re-register the new one so alerts keep coming.
// (The app also re-syncs its subscription on every load, so this is a best-effort extra.)
self.addEventListener('pushsubscriptionchange', (event) => {
  const old = event.oldSubscription;
  const key = old && old.options ? old.options.applicationServerKey : null;
  if (!key) return;
  event.waitUntil(
    self.registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key }).then((sub) =>
      fetch(`${API_BASE}/admin/push/subscribe`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub.toJSON()),
      }),
    ),
  );
});
