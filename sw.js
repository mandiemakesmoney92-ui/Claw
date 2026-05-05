// CLAW Service Worker — Mystic Hidden Gem
// Self-contained — no external CDN dependencies

const CACHE = "claw-pwa-v3";
const STATIC_ASSETS = ["/offline.html", "/manifest.json", "/icons/icon-192.png", "/icons/icon-512.png"];

// ─── Lifecycle ────────────────────────────────────────────────────────────────

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => {
      return cache.addAll(STATIC_ASSETS).catch(() => cache.add("/offline.html").catch(() => {}));
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", event => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

// ─── Fetch — cache-first for static, network-first for navigation ──────────

self.addEventListener("fetch", event => {
  const { request } = event;
  const url = new URL(request.url);

  // Never intercept API calls or cross-origin requests
  if (url.pathname.startsWith("/api/")) return;
  if (request.method !== "GET") return;
  if (url.origin !== self.location.origin) return;

  // Navigation: try network first, fall back to offline page
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(CACHE);
        return (await cache.match("/offline.html")) || new Response("Offline", { status: 503 });
      })
    );
    return;
  }

  // Static assets: cache-first with network fallback
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(response => {
        if (response && response.status === 200 && response.type !== "opaque") {
          caches.open(CACHE).then(cache => cache.put(request, response.clone()));
        }
        return response;
      }).catch(() => new Response("", { status: 503 }));
    })
  );
});

// ─── Push Notifications ───────────────────────────────────────────────────────

self.addEventListener("push", event => {
  if (!event.data) return;
  let data;
  try { data = event.data.json(); } catch { return; }

  const isCall = data.type === "incoming_call";

  const options = {
    body: data.body || "",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: isCall ? `call-${data.callId}` : (data.tag || "claw-notification"),
    data: { url: data.url || "/", callId: data.callId, type: data.type },
    requireInteraction: isCall,
    silent: false,
    vibrate: isCall ? [500, 200, 500, 200, 500] : [200],
    renotify: isCall,
  };

  if (isCall) {
    options.actions = [
      { action: "accept", title: "✅ Accept" },
      { action: "decline", title: "❌ Decline" },
    ];
  }

  event.waitUntil(
    self.registration.showNotification(data.title || "CLAW", options)
  );
});

// ─── Notification Click ───────────────────────────────────────────────────────

self.addEventListener("notificationclick", event => {
  event.notification.close();
  const { callId, type, url } = event.notification.data || {};
  const action = event.action;

  if (type === "incoming_call" && callId) {
    if (action === "accept") {
      event.waitUntil(
        fetch("/api/calls/accept", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ callId }),
        }).then(() =>
          clients.matchAll({ type: "window", includeUncontrolled: true }).then(wins => {
            for (const w of wins) {
              if ("focus" in w) {
                w.postMessage({ type: "CALL_ACCEPTED_FROM_NOTIFICATION", callId });
                return w.focus();
              }
            }
            return clients.openWindow(url || "/");
          })
        ).catch(() => clients.openWindow(url || "/"))
      );
      return;
    }

    if (action === "decline") {
      event.waitUntil(
        fetch("/api/calls/decline", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ callId }),
        }).catch(() => {})
      );
      return;
    }
  }

  // Default: open / focus app
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(wins => {
      for (const w of wins) {
        if ("focus" in w) return w.focus();
      }
      return clients.openWindow(url || "/");
    })
  );
});
