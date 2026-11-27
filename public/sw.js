/* FERSUANADUANA — Service Worker
   Estrategia:
   - Navegaciones (páginas): network-first, con caché y fallback offline.
   - Estáticos (/_next/static, /icons, imágenes, fuentes): cache-first.
   - /api/*: siempre red (nunca se cachea: necesita IA + Supabase).
*/
const VERSION = "fsa-v3";
const STATIC_CACHE = `${VERSION}-static`;
const PAGE_CACHE = `${VERSION}-pages`;
const OFFLINE_URL = "/offline.html";

const PRECACHE = [
  "/",
  "/app",
  OFFLINE_URL,
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png",
  "/manifest.webmanifest",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      // Cachea cada recurso de forma tolerante: si uno falla, no rompe la instalación.
      await Promise.allSettled(PRECACHE.map((u) => cache.add(new Request(u, { cache: "reload" }))));
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))
      );
      if (self.registration.navigationPreload) {
        await self.registration.navigationPreload.enable();
      }
      await self.clients.claim();
    })()
  );
});

// Permite que la página pida activar la nueva versión al instante.
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    /\.(?:png|jpg|jpeg|gif|svg|webp|ico|woff2?|ttf|otf|css|js)$/i.test(url.pathname)
  );
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // deja pasar terceros (Supabase, etc.)
  if (url.pathname.startsWith("/api/")) return; // IA/Supabase: siempre red, nunca caché

  // Navegaciones (HTML)
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const preload = await event.preloadResponse;
          const net = preload || (await fetch(req));
          const cache = await caches.open(PAGE_CACHE);
          cache.put(req, net.clone());
          return net;
        } catch {
          const cache = await caches.open(PAGE_CACHE);
          const cached = await cache.match(req);
          if (cached) return cached;
          const shell = (await caches.match("/app")) || (await caches.match("/"));
          return (await caches.match(OFFLINE_URL)) || shell || Response.error();
        }
      })()
    );
    return;
  }

  // Estáticos: cache-first
  if (isStaticAsset(url)) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(req);
        if (cached) return cached;
        try {
          const net = await fetch(req);
          const cache = await caches.open(STATIC_CACHE);
          cache.put(req, net.clone());
          return net;
        } catch {
          return cached || Response.error();
        }
      })()
    );
  }
});
