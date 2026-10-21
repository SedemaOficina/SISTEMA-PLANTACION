"""Si el servidor no entrega la biblioteca del mapa (vendor/leaflet.js), ¿qué error ve la página y arranca igual?

Sirve para reconocer, en una corrida de las pruebas, una falla del equipo de pruebas: el único error es
«L is not defined», del complemento de gestos del mapa, porque «Failed to load» lo filtran las pruebas.

Uso:  python sin_leaflet.py [dirección]   (por omisión http://127.0.0.1:8099/, la de pruebas/servir.py)"""
import sys
from playwright.sync_api import sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8099/'
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(service_workers='block')
    pg = ctx.new_page(); errores = []
    pg.on('pageerror', lambda e: errores.append(str(e)))
    pg.on('console', lambda m: m.type == 'error' and errores.append('consola: ' + m.text))
    pg.route('**/vendor/leaflet.js*', lambda r: r.abort())
    pg.goto(BASE); pg.wait_for_timeout(3000)
    print('la aplicación arrancó:', pg.evaluate("document.documentElement.hasAttribute('data-listo')"))
    print('\n'.join(errores))
    b.close()
