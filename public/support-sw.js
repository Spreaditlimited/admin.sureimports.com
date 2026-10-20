/* No fetch handler or cached private pages. This worker only handles support alerts. */
self.addEventListener('push', event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch {}
  const match = typeof data.url === 'string' && /^\/dashboard\/support\?conversation=[a-f0-9]{32}$/.test(data.url);
  const url = match ? data.url : '/dashboard/support';
  event.waitUntil(self.registration.showNotification('Sure Imports support', {
    body: 'A customer is waiting for your reply. Open the inbox to view their message.',
    tag: match ? 'support-' + url.split('=')[1] : 'sureimports-support',
    icon: '/assets/images/logos/favicon.png',
    data: {url},
  }));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const value = event.notification.data && event.notification.data.url;
  const path = typeof value === 'string' && /^\/dashboard\/support(?:\?conversation=[a-f0-9]{32})?$/.test(value) ? value : '/dashboard/support';
  const url = new URL(path, self.location.origin).href;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({type:'window',includeUncontrolled:true});
    const existing = windows.find(client => client.url.startsWith(self.location.origin + '/dashboard/support'));
    if(existing) {await existing.navigate(url);return existing.focus();}
    return self.clients.openWindow(url);
  })());
});
