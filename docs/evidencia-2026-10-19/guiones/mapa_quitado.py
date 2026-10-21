"""Un mapa fijo (el de la ficha de un árbol o el de una pareja de duplicados) que se quita antes de ajustar su
tamaño, con su contenedor ya oculto, como cuando la ficha se cierra enseguida. No debe dar error en la consola.

Se repite dos veces, cada una en una pestaña nueva.

Uso:  python mapa_quitado.py [dirección]   (por omisión http://127.0.0.1:8099/, la de pruebas/servir.py)
Sale con 0 si ninguna de las dos vueltas dio error."""
import sys
from playwright.sync_api import sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8099/'
malas = 0
with sync_playwright() as p:
    b = p.chromium.launch()
    for vuelta in (1, 2):
        pg = b.new_page(); err = []
        pg.on('pageerror', lambda e: err.append(str(e)))
        pg.goto(BASE); pg.wait_for_selector('html[data-listo]')
        pg.evaluate("""() => { const d = document.createElement('div'); d.id = 'mapa-de-prueba'; d.style.height = '200px'; document.body.appendChild(d);
          const m = SRP.mapa.estatico('mapa-de-prueba', 19.4326, -99.1332); m.remove(); d.style.display = 'none'; }""")
        pg.wait_for_timeout(300)
        print('vuelta %d: errores %s' % (vuelta, err))
        malas += bool(err)
        pg.close()
    b.close()
print('sin error %d de 2 veces' % (2 - malas))
sys.exit(1 if malas else 0)
