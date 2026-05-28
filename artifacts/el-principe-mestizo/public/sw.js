/* Service Worker — El Príncipe Mestizo v5
   Estrategia: network-first para API, cache-first para assets estáticos
*/

const CACHE_STATIC = "epm-static-v1";
const CACHE_API = "epm-api-v1";
const CACHE_FONTS = "epm-fonts-v1";

const STATIC_ASSETS = [
  "/",
  "/favicon.png",
  "/favicon.svg",
  "/opengraph.jpg",
  "/manifest.json",
  "/robots.txt",
  "/icons/icon-192.svg",
  "/icons/icon-512.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_STATIC).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {
        // Silencioso: algunos assets pueden no existir en dev
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => !k.startsWith("epm-"))
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Cache-first para assets estáticos (JS, CSS, imágenes)
  if (
    url.pathname.startsWith("/assets/") ||
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".css") ||
    url.pathname.match(/\.(png|jpg|jpeg|gif|webp|svg|ico)$/)
  ) {
    event.respondWith(cacheFirst(event.request, CACHE_STATIC));
    return;
  }

  // Cache-first para fuentes de Google
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    event.respondWith(cacheFirst(event.request, CACHE_FONTS));
    return;
  }

  // Network-first para API de artículos
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirst(event.request, CACHE_API));
    return;
  }

  // Network-only para todo lo demás
  event.respondWith(fetch(event.request));
});

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return cached || new Response("Offline", { status: 503 });
  }
}

async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response(JSON.stringify({ error: "offline" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }
}
