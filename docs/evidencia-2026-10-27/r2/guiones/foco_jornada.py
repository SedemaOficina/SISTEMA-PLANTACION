"""B4 · A dónde va el foco del teclado (datos de prueba, Coordinación):
  1. al iniciar una jornada con Intro, con «Sólo yo» y con «Varios cabos»;
  2. al cerrar con Escape la ventana «Cabos de apoyo» abierta desde la franja.
En teléfono (390×844) y en computadora (1440×900). Cada caso, en un contexto limpio.
Uso: python foco_jornada.py <url> <vueltas> [chromium|webkit] [demo]"""
import json, sys, time
from playwright.sync_api import sync_playwright
BASE, VUELTAS = sys.argv[1].rstrip('/') + '/', int(sys.argv[2])
MOTOR = sys.argv[3] if len(sys.argv) > 3 else 'chromium'
DEMO = len(sys.argv) > 4 and sys.argv[4] == 'demo'   # con los datos de demostración (unos 22,000 árboles)
FOCO = """() => { const e = document.activeElement; return e ? (e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + ' «' + (e.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 30) + '»') : null; }"""

def caso(b, an, al, quien):
    op = dict(viewport={'width': an, 'height': al}, timezone_id='America/Mexico_City', service_workers='block')
    if MOTOR == 'chromium': op.update(geolocation={'latitude': 19.4326, 'longitude': -99.1332, 'accuracy': 5}, permissions=['geolocation'])
    ctx = b.new_context(**op); pg = ctx.new_page()
    pg.goto(BASE); pg.wait_for_selector('html[data-listo]', state='attached', timeout=60000)
    pg.select_option('#sel-usuario-prueba', 'u-coord-1'); pg.click('#btn-entrar-prueba'); pg.wait_for_function("() => SRP.sesion && SRP.sesion.usuario")
    if DEMO:
        pg.evaluate("async () => { await SRP.demo.cargar(); }"); pg.reload(); pg.wait_for_selector('html[data-listo]', state='attached'); pg.wait_for_function("() => SRP.sesion && SRP.sesion.usuario")
    pg.wait_for_timeout(2500); pg.evaluate("() => document.querySelectorAll('dialog[open]').forEach(d => d.close())")
    pg.evaluate("SRP.app.mostrarVista('registrar')")
    pg.wait_for_function("() => !document.getElementById('panel-iniciar-jornada').hidden || !document.getElementById('franja-jornada').hidden", timeout=30000); pg.wait_for_timeout(300)
    pg.evaluate("() => document.querySelectorAll('dialog[open]').forEach(d => d.close())")
    if pg.is_hidden('#panel-iniciar-jornada'):
        pg.click('#btn-jornada-cambiar'); pg.wait_for_timeout(250); pg.click('#btn-cambiar-nueva'); pg.wait_for_timeout(400)
    pg.fill('#ini-nombre', 'Foco r2'); pg.select_option('#ini-programa', 'p-refor'); pg.fill('#ini-meta', '10'); pg.click('#btn-ini-hoy')
    if MOTOR == 'chromium':
        pg.click('#btn-ini-detectar'); pg.wait_for_timeout(1200)
    else:
        pg.evaluate("document.getElementById('ini-detalles-coord').open = true")
        pg.fill('#ini-coord-lat', '19.4326'); pg.fill('#ini-coord-lng', '99.1332'); pg.click('#btn-ini-coord-aplicar'); pg.wait_for_timeout(800)
    if quien == 'varios':
        pg.click('#ini-quien .chip[data-quien="varios"]'); pg.wait_for_timeout(200)
        pg.click('#ini-apoyos .chip[data-id="u-cabo-1"]')
    pg.focus('#btn-iniciar-jornada'); t0 = time.time(); pg.keyboard.press('Enter')
    pg.wait_for_selector('#franja-jornada', state='visible', timeout=45000); pg.wait_for_timeout(1500)
    r = {'tam': '%dx%d' % (an, al), 'quien': quien, 'foco_tras_iniciar': pg.evaluate(FOCO), 'seg': round(time.time() - t0, 1)}
    if quien == 'varios':
        pg.evaluate("() => document.querySelectorAll('dialog[open]').forEach(d => d.close())")
        pg.focus('#btn-franja-apoyos'); pg.keyboard.press('Enter'); pg.wait_for_selector('#dlg-apoyos[open]'); pg.wait_for_timeout(400)
        pg.keyboard.press('Escape'); pg.wait_for_timeout(500)
        r['foco_tras_escape'] = pg.evaluate(FOCO)
        pg.focus('#btn-franja-apoyos'); pg.keyboard.press('Enter'); pg.wait_for_selector('#dlg-apoyos[open]'); pg.wait_for_timeout(400)
        pg.focus('#btn-apoyos-cerrar'); pg.keyboard.press('Enter'); pg.wait_for_timeout(500)
        r['foco_tras_cerrar'] = pg.evaluate(FOCO)
        r['scroll_y'] = pg.evaluate("scrollY")
    ctx.close()
    return r

with sync_playwright() as p:
    b = getattr(p, MOTOR).launch()
    for v in range(VUELTAS):
        for (an, al) in [(390, 844), (1440, 900)]:
            for quien in ('solo', 'varios'):
                print(MOTOR, 'vuelta', v + 1, json.dumps(caso(b, an, al, quien), ensure_ascii=False), flush=True)
    b.close()
