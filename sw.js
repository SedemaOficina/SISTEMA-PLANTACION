/* SERVICE WORKER — LA APLICACIÓN ABRE SIN SEÑAL (D71).
   Guarda en el dispositivo todo lo que index.html pide con marca ?v= (más los archivos sin marca
   que cuelgan de ellos) y lo sirve desde ahí. La versión no se escribe aquí: llega en la
   dirección con que la app registra este archivo (sw.js?v=0.6.6), que es la misma marca de
   index.html (Norma 10.2). Una versión nueva registra un worker nuevo, que llena su propia caché
   y borra la anterior al activarse.

   ESTRATEGIA. La página (navegación) se pide primero a la red y, si no responde en 3 s o falla,
   se sirve de la caché: así con señal se recibe la versión nueva y sin señal se abre la guardada.
   Los archivos propios se sirven primero de la caché: su dirección lleva la versión, así que una
   versión nueva es una dirección nueva y nunca se confunde con la vieja. Lo externo —mosaicos
   del mapa, tipografías— va a la red y, si no hay, falla como antes: el sistema ya sabe colocar
   el punto sin mapa. */
const VERSION = new URL(self.location.href).searchParams.get('v') || 'sin-marca';
const CACHE = 'srp-' + VERSION;
const PAGINA = './index.html';

// Lo que hay que guardar sale de index.html, no de una lista escrita aquí que se desactualizaría
async function archivosDeLaPagina() {
  const r = await fetch(PAGINA + '?v=' + VERSION, { cache: 'no-store' });
  const html = await r.text();
  const propios = [...html.matchAll(/(?:src|href)="((?!https?:)[^"]+\?v=[^"]+)"/g)].map(m => m[1]);
  return [PAGINA + '?v=' + VERSION, './manifest.webmanifest'].concat(propios);
}

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const archivos = await archivosDeLaPagina();
    await cache.addAll(archivos);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const nombres = await caches.keys();
    await Promise.all(nombres.filter(n => n.startsWith('srp-') && n !== CACHE).map(n => caches.delete(n)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;   // externo: a la red, sin intervenir

  if (e.request.mode === 'navigate') {
    e.respondWith((async () => {
      const cache = await caches.open(CACHE);
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 3000);
        const red = await fetch(e.request, { signal: ctrl.signal });
        clearTimeout(t);
        return red;
      } catch (err) {
        return (await cache.match(PAGINA + '?v=' + VERSION)) || (await cache.match(PAGINA)) || Response.error();
      }
    })());
    return;
  }

  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const guardado = await cache.match(e.request);
    if (guardado) return guardado;
    try {
      const red = await fetch(e.request);
      if (red.ok && url.searchParams.has('v')) cache.put(e.request, red.clone());
      return red;
    } catch (err) {
      return Response.error();
    }
  })());
});
