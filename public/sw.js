// Service worker mínimo para que la app sea instalable (PWA) y resista offline,
// SIN interferir con redirecciones (login / OAuth). No cachea respuestas en
// tiempo de ejecución: solo precachea "/" como respaldo cuando no hay conexión.

const CACHE = "smg-cal-v1";
const FALLBACK = "/";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.add(FALLBACK)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  // Solo navegaciones GET. Todo lo demás (APIs, assets, redirecciones) lo maneja
  // el navegador con normalidad.
  if (req.method !== "GET" || req.mode !== "navigate") return;

  event.respondWith(
    fetch(req).catch(() =>
      caches.match(FALLBACK).then((r) => r || Response.error())
    )
  );
});
