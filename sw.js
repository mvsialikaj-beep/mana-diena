self.addEventListener('push', event => {
  let message = {};
  try { message = event.data?.json() || {}; } catch {}
  const title = typeof message.title === 'string' ? message.title : 'Mana diena';
  const body = typeof message.body === 'string' ? message.body : 'Tev ir ieplānots uzdevums.';
  const url = typeof message.url === 'string' ? message.url : self.registration.scope;
  event.waitUntil(self.registration.showNotification(title, {
    body, icon: './mv-logo.png', badge: './mv-logo.png',
    tag: typeof message.tag === 'string' ? message.tag : undefined,
    data: { url }
  }));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windows => {
      const destination = event.notification.data?.url || self.registration.scope;
      const existing = windows.find(windowClient => windowClient.url.startsWith(self.registration.scope));
      return existing ? existing.focus() : clients.openWindow(destination);
    })
  );
});
