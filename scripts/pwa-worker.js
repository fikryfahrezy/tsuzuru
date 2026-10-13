/* Build placeholders are replaced by prepare-pwa.ts. */
const CACHE_PREFIX = "tsuzuru-app-";
const CACHE_NAME = `${CACHE_PREFIX}__PWA_VERSION__`;
const ASSETS = ["__PWA_ASSETS__"].flat();
const APP_URL = "/app";

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(ASSETS);
      const response = await fetch(APP_URL, { cache: "reload" });
      if (!response.ok || response.redirected) {
        throw new Error("Could not cache the practice workspace.");
      }
      await cache.put(APP_URL, response);
    })(),
  );
});

// Let existing tabs close before an update takes over their workspace.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter(
            (name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME,
          )
          .map((name) => caches.delete(name)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  if (request.mode === "navigate" && /^\/app\/?$/.test(url.pathname)) {
    event.respondWith(
      (async () => {
        try {
          return await fetch(request);
        } catch {
          const cache = await caches.open(CACHE_NAME);
          const saved = await cache.match(APP_URL);
          return saved ?? Response.error();
        }
      })(),
    );
  } else if (ASSETS.includes(url.pathname)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        return (await cache.match(url.pathname)) ?? fetch(request);
      })(),
    );
  }
});
