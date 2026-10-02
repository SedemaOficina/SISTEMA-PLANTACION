/* SERVICE WORKER — LA APLICACIÓN ABRE SIN SEÑAL (D71).
   Guarda en el dispositivo todo lo que index.html pide con marca ?v= (más los archivos sin marca
   que cuelgan de ellos) y lo sirve desde ahí. La versión no se escribe aquí: llega en la
   dirección con que la app registra este archivo (sw.js?v=0.6.6), que es la misma marca de
   index.html (Norma 10.2). Una versión nueva registra un worker nuevo, que llena su propia caché
   y borra la anterior al activarse.

   ESTRATEGIA. La página (navegación) se pide primero a la red y, si no responde en 3 s o falla,
   se sirve de la caché: así con señal se recibe la versión nueva y sin señal se abre la guardada.
   Si la red trae una versión distinta de la de este worker, se sirve la página guardada: la
   versión nueva sólo se usa cuando su propio worker terminó de guardar todos sus archivos. Así una
   descarga que se corta por mala señal nunca deja al teléfono con una versión a medias. La página
   guardada se encarga de pedir la instalación de la nueva (js/conexion.js, buscarVersionNueva).
   Al pedirla a la red se salta la memoria del navegador (cache: 'no-cache', D161): GitHub Pages
   la manda con «max-age=600» y, sin esto, el navegador daba la página vieja hasta 10 minutos
   después de publicar, aunque se recargara. Con 'no-cache' pregunta al servidor si cambió: si
   no, la respuesta es corta (304) y se usa la que tiene.
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
  // Las tipografías se piden desde el CSS sin marca, así que van en lista explícita (D87);
  // cambian con la versión del worker igual que todo lo demás
  const fuentes = ['cabin', 'roboto-regular', 'roboto-medium', 'roboto-bold'].map(f => './vendor/fuentes/' + f + '.woff2')
    // Las del PDF van en TTF, que es lo que el generador sabe incrustar
    .concat(['roboto-regular', 'roboto-bold', 'roboto-italic'].map(f => './vendor/fuentes/' + f + '.ttf'));
  // Los iconos de instalación los pide el manifiesto, sin marca: también se guardan
  const iconos = ['icono-192', 'icono-512', 'icono-512-maskable'].map(f => './assets/' + f + '.png');
  return [PAGINA + '?v=' + VERSION, './manifest.webmanifest'].concat(propios, fuentes, iconos);
}

// La versión de una página es la marca con que pide js/config.js
function versionDe(html) {
  const m = html.match(/js\/config\.js\?v=([^"&]+)/);
  return m ? decodeURIComponent(m[1]) : VERSION;
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
        const red = await fetch(e.request, { signal: ctrl.signal, cache: 'no-cache' });
        clearTimeout(t);
        const guardada = (await cache.match(PAGINA + '?v=' + VERSION)) || (await cache.match(PAGINA));
        // Un error del servidor (404, 500) no tapa la app guardada: se sirve la copia si la hay
        if (!red.ok) return guardada || red;
        // La red trae otra versión: se sigue con la guardada hasta que la nueva esté completa
        if (guardada && versionDe(await red.clone().text()) !== VERSION) return guardada;
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
