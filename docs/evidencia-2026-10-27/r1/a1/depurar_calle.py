"""A1 · La columna «Calle» del reporte (prueba.py, renglón 1072): una jornada de 5 árboles como la del tramo 1, el envío
simulado y el reporte. Dice si los árboles reciben su calle, cuánto tarda y qué columnas trae la tabla.
Uso: SRP_BASE=http://127.0.0.1:8131/ python evidencia/a1/depurar_calle.py"""
import os, time, json
from playwright.sync_api import sync_playwright
BASE = os.environ.get('SRP_BASE', 'http://127.0.0.1:8131/')
JS_J = open(os.path.join(os.path.dirname(__file__), '..', '..', 'pruebas', 'prueba.py'), encoding='utf-8').read()
ini = JS_J.index('J=pg.evaluate("""') + len('J=pg.evaluate("""'); fin = JS_J.index('""")', ini)
CREAR = JS_J[ini:fin]
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, geolocation={'latitude': 19.432, 'longitude': -99.133}, permissions=['geolocation'])
    pg = ctx.new_page(); errores = []; pg.on('pageerror', lambda e: errores.append(str(e)))
    pg.goto(BASE); pg.wait_for_selector('html[data-listo]')
    pg.select_option('#sel-usuario-prueba', 'u-cabo-1'); pg.click('#btn-entrar-prueba'); pg.wait_for_function("() => SRP.sesion && SRP.sesion.usuario"); pg.wait_for_timeout(1500)
    J = pg.evaluate(CREAR)
    ids = [J['ids'][i] for i in (0, 1, 2, 4)]
    print('cola antes de enviar:', pg.evaluate("async () => (await SRP.envio.cola()).length"))
    t = time.time(); r = pg.evaluate("SRP.envio.enviar({ silencioso: true })")
    print('envío:', r, '%.1f s' % (time.time() - t))
    estado = pg.evaluate("async ids => (await SRP.almacen.todos('plantaciones')).filter(r => ids.includes(r.id)).map(r => [r.lat, r.lng, r.calle_estado, r.calle, r.calle_distancia_m])", ids)
    print('calle de los cuatro:', json.dumps(estado, ensure_ascii=False))
    print('cola después:', pg.evaluate("async () => (await SRP.envio.cola()).length"))
    # Segundo envío, sin nada en la cola
    pg.evaluate("async ids => { const s = await SRP.almacen.todos('plantaciones'); for (const r of s.filter(x => ids.includes(x.id))) await SRP.almacen.ponerLocales('plantaciones', [Object.assign({}, r, SRP.calles.vacia())]); }", ids)
    r2 = pg.evaluate("SRP.envio.enviar({ silencioso: true })")
    estado2 = pg.evaluate("async ids => (await SRP.almacen.todos('plantaciones')).filter(r => ids.includes(r.id)).map(r => r.calle_estado)", ids)
    print('sin calle y con la cola vacía, otro envío:', r2, '→ calle_estado', estado2)
    print('errores de página:', errores)
    b.close()
