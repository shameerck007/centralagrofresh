/*
  PilotPro — service worker

  This file must sit next to your HTML file on the server, at the same
  level (e.g. https://central.agrofreshs.com/sw.js). It is the only way a
  browser can receive a notification while your app is closed, because a
  service worker keeps running in the background after the page is gone.

  It deliberately does NOT cache the app. Caching is what caused the stale
  data problems earlier in this project, so this worker only handles push.
*/

const SW_VERSION = "pilotpro-sw-1";

// Take over immediately rather than waiting for every tab to close, so a
// freshly deployed worker starts handling push straight away.
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

/* A push arrives as raw bytes. We send JSON from the Worker, but fall back
   to plain text so a malformed payload still shows something useful
   rather than silently doing nothing. */
self.addEventListener("push", (event) => {
  let data = { title: "PilotPro", body: "You have a new notification.", url: "/" };

  if (event.data) {
    try {
      data = Object.assign(data, event.data.json());
    } catch (e) {
      data.body = event.data.text() || data.body;
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || "/icon-192.png",
    badge: data.badge || "/icon-192.png",
    tag: data.tag || "pilotpro",
    renotify: true,
    requireInteraction: false,
    data: { url: data.url || "/" }
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

/* Tapping the notification should focus the app if it's already open in a
   tab, and only open a new one if it isn't — otherwise reps end up with a
   pile of duplicate tabs. */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          if ("navigate" in client) {
            try { client.navigate(target); } catch (e) {}
          }
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(target);
      }
    })
  );
});
