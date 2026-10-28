"""B8 · ¿La fotografía se carga en WebKit? Con el index.html de la 1.4.2 (accept="image/*,android/allowCamera") y con el
accept de la 1.1 (image/*), por una ruta de Playwright. Datos de prueba, cabo. Dos vueltas por variante y motor.
Con SIN_RED=1, la variante «1.4.2 sin red»: el teléfono pierde la red justo antes de elegir la foto.
Uso: python foto_webkit.py <url>"""
import json, os, sys, tempfile
from PIL import Image
from playwright.sync_api import sync_playwright
BASE = sys.argv[1].rstrip('/') + '/'
foto = os.path.join(tempfile.gettempdir(), 'r2-foto-wk.jpg'); Image.new('RGB', (640, 480), (40, 120, 60)).save(foto, 'JPEG')
def variante_11(route):
    r = route.fetch(); t = r.text()
    route.fulfill(response=r, body=t.replace('accept="image/*,android/allowCamera"', 'accept="image/*"'))
with sync_playwright() as p:
    for motor in ('webkit', 'chromium'):
        b = getattr(p, motor).launch()
        for var in (('1.4.2', 'accept de la 1.1') if os.environ.get('SIN_RED') != '1' else ('1.4.2 sin red',)):
            for v in (1, 2):
                ctx = b.new_context(viewport={'width': 390, 'height': 844}, service_workers='block'); pg = ctx.new_page(); err = []
                pg.on('pageerror', lambda e: err.append(str(e)[:200])); pg.on('console', lambda m: m.type == 'error' and err.append(m.text[:200]))
                if var == 'accept de la 1.1': pg.route('**/index.html*', variante_11); pg.route(BASE, variante_11)
                pg.goto(BASE); pg.wait_for_selector('html[data-listo]', state='attached')
                pg.select_option('#sel-usuario-prueba', 'u-cabo-1'); pg.click('#btn-entrar-prueba'); pg.wait_for_function("() => SRP.sesion && SRP.sesion.usuario"); pg.wait_for_timeout(1200)
                pg.evaluate("() => document.querySelectorAll('dialog[open]').forEach(d => d.close())")
                pg.evaluate("SRP.app.mostrarVista('registrar')"); pg.wait_for_timeout(600)
                pg.fill('#ini-nombre', 'Foto r2'); pg.select_option('#ini-programa', 'p-refor'); pg.fill('#ini-meta', '5'); pg.click('#btn-ini-hoy')
                pg.evaluate("document.getElementById('ini-detalles-coord').open = true"); pg.fill('#ini-coord-lat', '19.4204'); pg.fill('#ini-coord-lng', '99.1819'); pg.click('#btn-ini-coord-aplicar'); pg.wait_for_timeout(600)
                pg.click('#btn-iniciar-jornada'); pg.wait_for_selector('#franja-jornada', state='visible'); pg.wait_for_timeout(800)
                pg.evaluate("() => document.querySelectorAll('dialog[open]').forEach(d => d.close())")
                if 'sin red' in var: ctx.set_offline(True); pg.wait_for_timeout(500)
                acc = pg.get_attribute('#foto-archivo', 'accept')
                pg.set_input_files('#foto-archivo', foto); pg.wait_for_timeout(3000)
                r = pg.evaluate("() => ({ ficha: !document.getElementById('ficha-foto').hidden, texto: document.getElementById('texto-foto').textContent, errores: [...document.querySelectorAll('#vista-registrar .errores:not([hidden]), #foto-error:not([hidden])')].map(e => e.textContent.slice(0, 160)), aviso: !document.getElementById('aviso').hidden ? document.getElementById('aviso').innerText.slice(0, 200) : null })")
                print(motor, var, v, 'accept=%s' % acc, json.dumps(r, ensure_ascii=False), 'errores consola:', err[:2], flush=True)
                pg.screenshot(path=os.path.join('b8', 'foto-%s-%s-%d.png' % (motor, var.replace(' ', '_'), v)))
                ctx.close()
        b.close()
