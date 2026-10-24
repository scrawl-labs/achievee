/*
 * Achievee service worker: caches the app shell only (hashed JS/CSS, fonts, icons) and an offline page.
 * It NEVER caches an API answer, a page, or anything with personal data: those always go to the network,
 * so nothing from one account can be replayed after sign-out and nothing stale is shown as current.
 */
const CACHE = "achievee-shell-v1";
const OFFLINE = "/offline.html";
const STATIC = [/^\/_next\/static\//, /^\/fonts\//, /^\/icons\//];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.add(OFFLINE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;       // Google, fonts CDNs, ...: not ours
  if (url.pathname.startsWith("/api/")) return;           // personal data and sign-in: always the network

  if (req.mode === "navigate") {
    // pages are never cached; when the network is gone, show the offline page instead of the browser's error
    event.respondWith(fetch(req).catch(() => caches.match(OFFLINE)));
    return;
  }
  if (STATIC.some((re) => re.test(url.pathname))) {
    // build output is content-hashed, so a cached copy can never be out of date
    event.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
        return res;
      })),
    );
  }
});

// The evening "how did today feel?" reminder: a plain title and sentence, nothing personal in the payload.
self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) { /* show the defaults */ }
  event.waitUntil(self.registration.showNotification(data.title || "Achievee", {
    body: data.body || "", icon: "/icons/icon-192.png", badge: "/icons/icon-192.png", tag: "achievee-reminder", data: { url: data.url || "/" },
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
    for (const c of list) if ("focus" in c) { c.navigate(url).catch(() => {}); return c.focus(); }
    return self.clients.openWindow(url);
  }));
});
