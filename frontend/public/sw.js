// Minimal service worker. Its only real job is to exist with a fetch handler,
// which is one of the browser's requirements for offering an "Install" prompt.
// We deliberately don't cache anything here — this app's whole point is
// talking to a server on the local network, which a cache can't help with,
// and stale cached responses would be actively confusing for a LAN app.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  // Pass every request straight through to the network — no caching layer.
  event.respondWith(fetch(event.request));
});
