"""A1/B3 · ¿El reporte que se genera desde la ficha de la jornada usa los árboles como estaban al abrir la ficha? Jornada
de 5 árboles como la del tramo 1; se abre su ficha, se envía (el servidor simulado pone la calle), se genera el
reporte; luego se vuelve a abrir la ficha y se genera otra vez.
Uso: SRP_BASE=http://127.0.0.1:8131/ python evidencia/a1/depurar_calle2.py"""
import os, time, json
from playwright.sync_api import sync_playwright
BASE = os.environ.get('SRP_BASE', 'http://127.0.0.1:8131/')
PRUEBA = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'pruebas', 'prueba.py'), encoding='utf-8').read()
ini = PRUEBA.index('J=pg.evaluate("""') + len('J=pg.evaluate("""'); CREAR = PRUEBA[ini:PRUEBA.index('""")', ini)]
def tabla(pg):
    pg.evaluate('SRP.jornadas.irAlReporte()'); pg.wait_for_timeout(700)   # el botón se ve cuando no hay puntos por revisar; la acción es la misma
    pg.evaluate("() => { const e = document.getElementById('cie-hora'); if (e && !e.value) e.value = '12:00'; }")
    pg.click('#btn-cierre-generar'); pg.wait_for_timeout(700)
    r = pg.evaluate("""() => [[...document.querySelector('#previa-hoja table').querySelectorAll('thead th')].map(x => x.textContent),
      [...document.querySelectorAll('#previa-hoja table tbody tr')].map(tr => [...tr.children].map(x => x.textContent))]""")
    pg.evaluate("() => document.querySelectorAll('dialog[open]').forEach(d => d.close())"); pg.wait_for_timeout(300)
    return r
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, geolocation={'latitude': 19.432, 'longitude': -99.133}, permissions=['geolocation'])
    pg = ctx.new_page(); errores = []; pg.on('pageerror', lambda e: errores.append(str(e)))
    pg.goto(BASE); pg.wait_for_selector('html[data-listo]')
    pg.select_option('#sel-usuario-prueba', 'u-cabo-1'); pg.click('#btn-entrar-prueba'); pg.wait_for_function("() => SRP.sesion && SRP.sesion.usuario"); pg.wait_for_timeout(1500)
    J = pg.evaluate(CREAR); ids = [J['ids'][i] for i in (0, 1, 2, 4)]
    pg.evaluate("async id => { SRP.app.mostrarVista('jornadas'); await SRP.jornadas.abrir(id); }", J['jid']); pg.wait_for_timeout(1500)
    print('1) ficha abierta; árboles de la ficha con calle:', pg.evaluate("SRP.jornadas.jornada.registros.filter(r => r.calle_estado).length"))
    pg.evaluate("SRP.envio.enviar({ silencioso: true })")
    print('2) enviados; en el almacén, con calle:', pg.evaluate("async ids => (await SRP.almacen.todos('plantaciones')).filter(r => ids.includes(r.id) && r.calle_estado).length", ids),
          '· en la ficha abierta:', pg.evaluate("SRP.jornadas.jornada.registros.filter(r => r.calle_estado).length"))
    cab, filas = tabla(pg); print('3) reporte desde la ficha abierta antes del envío: columnas', cab, '· primer renglón', filas[0])
    pg.evaluate("async id => { await SRP.jornadas.abrir(id); }", J['jid']); pg.wait_for_timeout(1500)
    cab2, filas2 = tabla(pg); print('4) reporte tras volver a abrir la ficha: columnas', cab2, '· renglones', filas2)
    print('errores de página:', errores)
    b.close()
