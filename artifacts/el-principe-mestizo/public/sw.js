/* ─────────────────────────────────────────────────────────────
   El Príncipe Mestizo — Service Worker
   Estrategia:
   · Cache-first  → assets estáticos (JS, CSS, fuentes, imágenes de la app)
   · Network-first → llamadas a la API (/api/*)
   · Stale-while-revalidate → páginas HTML (SPA shell)
   ───────────────────────────────────────────────────────────── */

const CACHE_NAME  = "epm-v1";
const SHELL_CACHE = "epm-shell-v1";

// Recursos del shell que se pre-cachean en install
const SHELL_URLS = ["/", "/index.html", "/manifest.json"];

// ── Install: pre-cachear el shell ─────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) =>
      cache.addAll(SHELL_URLS).catch(() => {/* silencioso si offline */})
    ).then(() => self.skipWaiting())
  );
});

// ── Activate: limpiar caches antiguos ────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME && k !== SHELL_CACHE)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: estrategias por tipo de recurso ────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Solo manejamos GET y same-origin + Cloudinary
  if (request.method !== "GET") return;

  // 1. API calls → Network-first (sin cachear)
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request).catch(() =>
        new Response(JSON.stringify({ error: "Sin conexión" }), {
          headers: { "Content-Type": "application/json" },
          status: 503,
        })
      )
    );
    return;
  }

  // 2. Imágenes de Cloudinary → Cache-first con TTL implícito
  if (url.hostname.includes("cloudinary.com") || url.hostname.includes("res.cloudinary.com")) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      }).catch(() => new Response("", { status: 503 }))
    );
    return;
  }

  // 3. Fuentes de Google → Cache-first permanente
  if (url.hostname.includes("fonts.googleapis.com") || url.hostname.includes("fonts.gstatic.com")) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      })
    );
    return;
  }

  // 4. Assets estáticos (JS, CSS, SVG, imágenes de /public) → Cache-first
  if (
    url.pathname.match(/\.(js|css|svg|png|jpg|jpeg|webp|woff2?|ico)$/)
  ) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      })
    );
    return;
  }

  // 5. Navegación HTML (SPA) → Stale-while-revalidate, fallback a /index.html
  if (request.mode === "navigate" || request.headers.get("accept")?.includes("text/html")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(SHELL_CACHE).then((c) => c.put(request, clone));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          const shell = await caches.match("/index.html", { cacheName: SHELL_CACHE });
          return shell ?? new Response("Sin conexión", { status: 503 });
        })
    );
    return;
  }
});
