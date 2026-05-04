/* Service Worker — El Príncipe Mestizo v4
   Desregistra versiones anteriores y no cachea nada.
   Esto permite que todas las imágenes (Cloudinary, Medium proxy) carguen sin bloqueos CSP.
*/
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
// Sin interceptar fetch — el navegador maneja todo directamente
